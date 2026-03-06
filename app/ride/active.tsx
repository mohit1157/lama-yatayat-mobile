/**
 * LaMa Yatayat - Active Ride Tracking Screen
 *
 * Full-screen map with driver marker, pickup/dropoff markers,
 * and a bottom card showing driver info and ride status.
 * Uses WebSocket for real-time driver location, with polling fallback.
 */

import { useEffect, useCallback, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, DEFAULT_REGION } from "@/constants/config";
import { useRideStore } from "@/stores/ride";
import { useAuthStore } from "@/stores/auth";
import { useLocationStore } from "@/stores/location";
import { wsManager } from "@/services/websocket";
import type { WSDriverLocationData, WSRideStatusData, RideStatus } from "@/lib/types";

// Conditional MapView import
let MapView: React.ComponentType<any> | null = null;
let MapMarker: React.ComponentType<any> | null = null;
try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  MapMarker = maps.Marker;
} catch {
  MapView = null;
  MapMarker = null;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ------------------------------------------------------------------ */
/*  Status step helpers                                                */
/* ------------------------------------------------------------------ */

interface StatusStep {
  key: RideStatus;
  label: string;
}

const STATUS_STEPS: StatusStep[] = [
  { key: "driver_en_route", label: "En Route" },
  { key: "pickup_arrived", label: "Arrived" },
  { key: "in_progress", label: "In Progress" },
];

function getStepIndex(status: RideStatus): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : -1;
}

function canCancel(status: RideStatus): boolean {
  return (
    status === "matched" ||
    status === "driver_en_route" ||
    status === "requested"
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

export default function ActiveRideScreen() {
  const router = useRouter();
  const {
    activeRide,
    driverLocation,
    fetchActiveRide,
    updateDriverLocation,
    setActiveRide,
    cancelRide,
    clearRide,
    isLoading,
  } = useRideStore();
  const { user } = useAuthStore();
  const { currentLocation } = useLocationStore();

  const [initialLoading, setInitialLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Delay map rendering to avoid crash during initial native module init
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Fetch active ride on mount
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        setInitialLoading(true);
        const ride = await fetchActiveRide();
        if (!cancelled) {
          setInitialLoading(false);
          if (!ride) {
            router.replace("/(tabs)/home");
          }
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, [fetchActiveRide, router])
  );

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!activeRide || !user) return;

    wsManager.connect({
      user_id: user.id,
      ride_id: activeRide.id,
      role: "rider",
    });

    const handleDriverLocation = (data: unknown) => {
      const loc = data as WSDriverLocationData;
      updateDriverLocation(loc);
    };

    const handleStatusUpdate = (data: unknown) => {
      const update = data as WSRideStatusData;
      if (update.ride) {
        setActiveRide(update.ride);
      }

      if (update.status === "completed") {
        wsManager.disconnect();
        router.replace({
          pathname: "/ride/complete",
          params: { rideId: update.ride_id },
        });
      } else if (update.status === "cancelled") {
        wsManager.disconnect();
        clearRide();
        Alert.alert("Ride Cancelled", "The ride has been cancelled.", [
          { text: "OK", onPress: () => router.replace("/(tabs)/home") },
        ]);
      }
    };

    wsManager.on("driver_location", handleDriverLocation);
    wsManager.on("ride_status_update", handleStatusUpdate);

    return () => {
      wsManager.off("driver_location", handleDriverLocation);
      wsManager.off("ride_status_update", handleStatusUpdate);
      wsManager.disconnect();
    };
  }, [activeRide?.id, user?.id, updateDriverLocation, setActiveRide, clearRide, router]);

  // Polling fallback for ride status
  useEffect(() => {
    if (!activeRide) return;

    const interval = setInterval(async () => {
      const ride = await fetchActiveRide();
      if (ride?.status === "completed") {
        router.replace({
          pathname: "/ride/complete",
          params: { rideId: ride.id },
        });
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [activeRide?.id, fetchActiveRide, router]);

  const handleCancel = () => {
    if (!activeRide) return;

    Alert.alert("Cancel Ride", "Are you sure you want to cancel this ride?", [
      { text: "Keep Ride", style: "cancel" },
      {
        text: "Cancel Ride",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelRide(activeRide.id);
          } catch {
            clearRide();
          }
          router.replace("/(tabs)/home");
        },
      },
    ]);
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (!activeRide) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No active ride</Text>
      </View>
    );
  }

  const pickupCoord = {
    latitude: activeRide.pickup_lat,
    longitude: activeRide.pickup_lng,
  };
  const dropoffCoord = {
    latitude: activeRide.dropoff_lat,
    longitude: activeRide.dropoff_lng,
  };
  const driverCoord = driverLocation
    ? { latitude: driverLocation.lat, longitude: driverLocation.lng }
    : null;

  const mapCenter = driverCoord ?? pickupCoord;
  const currentStepIndex = getStepIndex(activeRide.status);
  const driver = activeRide.driver;

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        {MapView && mapReady ? (
          <MapView
            style={styles.map}
            initialRegion={{
              ...mapCenter,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation
          >
            {MapMarker && (
              <>
                {/* Pickup marker */}
                <MapMarker coordinate={pickupCoord} title="Pickup">
                  <View style={styles.pickupMarker}>
                    <View style={styles.pickupDot} />
                  </View>
                </MapMarker>

                {/* Dropoff marker */}
                <MapMarker coordinate={dropoffCoord} title="Dropoff">
                  <View style={styles.dropoffMarker}>
                    <View style={styles.dropoffDot} />
                  </View>
                </MapMarker>

                {/* Driver marker */}
                {driverCoord && (
                  <MapMarker
                    coordinate={driverCoord}
                    title="Driver"
                    rotation={driverLocation?.heading ?? 0}
                  >
                    <View style={styles.driverMarker}>
                      <Text style={styles.driverMarkerText}>
                        {"\uD83D\uDE97"}
                      </Text>
                    </View>
                  </MapMarker>
                )}
              </>
            )}
          </MapView>
        ) : (
          <View style={[styles.map, styles.mapFallback]}>
            <Text style={styles.mapFallbackText}>Live Tracking</Text>
            {!mapReady ? (
              <ActivityIndicator
                size="small"
                color={Colors.primary}
                style={{ marginTop: 12 }}
              />
            ) : (
              <>
                <Text style={styles.mapFallbackSubtext}>
                  {activeRide.pickup_addr} {"\u2192"}{" "}
                  {activeRide.dropoff_addr}
                </Text>
                {driverCoord && (
                  <Text style={styles.mapFallbackSubtext}>
                    Driver: {driverCoord.latitude.toFixed(4)},{" "}
                    {driverCoord.longitude.toFixed(4)}
                  </Text>
                )}
              </>
            )}
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/(tabs)/home")}
        >
          <Text style={styles.backButtonText}>{"\u2190"}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom card */}
      <View style={styles.bottomCard}>
        <View style={styles.sheetHandle} />

        {/* Driver info */}
        {driver ? (
          <View style={styles.driverSection}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {driver.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{driver.name}</Text>
              <Text style={styles.vehicleInfo}>
                {driver.vehicle.color} {driver.vehicle.make}{" "}
                {driver.vehicle.model}
              </Text>
              <Text style={styles.plateNumber}>
                {driver.vehicle.plate_number}
              </Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>{"\u2605"}</Text>
              <Text style={styles.ratingText}>
                {driver.rating?.toFixed(1) ?? "--"}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.driverSection}>
            <ActivityIndicator
              color={Colors.primary}
              style={{ marginRight: 12 }}
            />
            <Text style={styles.waitingText}>
              Waiting for driver assignment...
            </Text>
          </View>
        )}

        {/* Status steps */}
        <View style={styles.statusSteps}>
          {STATUS_STEPS.map((step, index) => {
            const isActive = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;

            return (
              <View key={step.key} style={styles.stepContainer}>
                <View style={styles.stepRow}>
                  <View
                    style={[
                      styles.stepDot,
                      isActive && styles.stepDotActive,
                      isCurrent && styles.stepDotCurrent,
                    ]}
                  />
                  <Text
                    style={[
                      styles.stepLabel,
                      isActive && styles.stepLabelActive,
                    ]}
                  >
                    {step.label}
                  </Text>
                </View>
                {index < STATUS_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.stepLine,
                      isActive && styles.stepLineActive,
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>

        {/* Ride info */}
        <View style={styles.rideInfoRow}>
          <View style={styles.rideInfoItem}>
            <Text style={styles.rideInfoLabel}>Fare</Text>
            <Text style={styles.rideInfoValue}>
              ${activeRide.fare_amount?.toFixed(2) ?? "--"}
            </Text>
          </View>
          <View style={styles.rideInfoDivider} />
          <View style={styles.rideInfoItem}>
            <Text style={styles.rideInfoLabel}>Type</Text>
            <Text style={styles.rideInfoValue}>
              {activeRide.is_round_trip ? "Round-Trip" : "One-Way"}
            </Text>
          </View>
        </View>

        {/* Cancel button (only before pickup) */}
        {canCancel(activeRide.status) && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelText}>Cancel Ride</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.gray,
  },

  /* Map */
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  mapFallbackText: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.primary,
  },
  mapFallbackSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 6,
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 56 : 36,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 22,
    color: Colors.dark,
  },

  /* Markers */
  pickupMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(16, 185, 129, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  dropoffMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(37, 99, 235, 0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropoffDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  driverMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  driverMarkerText: {
    fontSize: 22,
  },

  /* Bottom card */
  bottomCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },

  /* Driver */
  driverSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  driverAvatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.white,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.dark,
  },
  vehicleInfo: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },
  plateNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.darkSecondary,
    marginTop: 1,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingStar: {
    fontSize: 14,
    color: Colors.warning,
    marginRight: 3,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.dark,
  },
  waitingText: {
    fontSize: 15,
    color: Colors.gray,
    flex: 1,
  },

  /* Status steps */
  statusSteps: {
    paddingVertical: 16,
    paddingLeft: 8,
  },
  stepContainer: {
    // each step
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.border,
    marginRight: 14,
  },
  stepDotActive: {
    backgroundColor: Colors.success,
  },
  stepDotCurrent: {
    backgroundColor: Colors.primary,
    borderWidth: 3,
    borderColor: "#BFDBFE",
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.grayLight,
  },
  stepLabelActive: {
    color: Colors.dark,
    fontWeight: "600",
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.border,
    marginLeft: 6,
    marginVertical: 2,
  },
  stepLineActive: {
    backgroundColor: Colors.success,
  },

  /* Ride info */
  rideInfoRow: {
    flexDirection: "row",
    backgroundColor: Colors.lightBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  rideInfoItem: {
    flex: 1,
    alignItems: "center",
  },
  rideInfoDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  rideInfoLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rideInfoValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.dark,
    marginTop: 4,
  },

  /* Cancel */
  cancelButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.danger,
  },
});

/**
 * LaMa Yatayat - Home Screen
 *
 * Full-screen map with a "Where are you going?" search bar and
 * a bottom sheet for ride details. Checks for an active ride on mount.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Animated,
  Keyboard,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, DEFAULT_REGION, PRICING } from "@/constants/config";
import { useLocationStore } from "@/stores/location";
import { useRideStore } from "@/stores/ride";
import { useAuthStore } from "@/stores/auth";

// Conditional MapView import -- falls back to a colored View
let MapView: React.ComponentType<any> | null = null;
let Marker: React.ComponentType<any> | null = null;
try {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
} catch {
  MapView = null;
  Marker = null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_HEIGHT = 340;

export default function HomeScreen() {
  const router = useRouter();
  const { currentLocation, startWatching } = useLocationStore();
  const { fetchActiveRide } = useRideStore();
  const { user } = useAuthStore();

  const [destination, setDestination] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [rideType, setRideType] = useState<"round_trip" | "one_way">(
    "round_trip"
  );
  const [checkingActiveRide, setCheckingActiveRide] = useState(true);

  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;

  // Start watching location
  useEffect(() => {
    startWatching();
  }, [startWatching]);

  // Check for active ride on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const checkActive = async () => {
        setCheckingActiveRide(true);
        try {
          const ride = await fetchActiveRide();
          if (ride && ride.id && !cancelled) {
            router.replace("/ride/active");
          }
        } catch {
          // No active ride
        } finally {
          if (!cancelled) setCheckingActiveRide(false);
        }
      };

      checkActive();

      return () => {
        cancelled = true;
      };
    }, [fetchActiveRide, router])
  );

  // Animate bottom sheet
  useEffect(() => {
    Animated.spring(sheetAnim, {
      toValue: showSheet ? 0 : BOTTOM_SHEET_HEIGHT,
      useNativeDriver: true,
      tension: 60,
      friction: 12,
    }).start();
  }, [showSheet, sheetAnim]);

  const handleSearchSubmit = () => {
    if (destination.trim()) {
      Keyboard.dismiss();
      setShowSheet(true);
    }
  };

  const handleRequestRide = () => {
    router.push({
      pathname: "/ride/request",
      params: {
        destination: destination.trim(),
        rideType,
        pickupLat: currentLocation?.latitude?.toString() ?? DEFAULT_REGION.latitude.toString(),
        pickupLng: currentLocation?.longitude?.toString() ?? DEFAULT_REGION.longitude.toString(),
      },
    });
  };

  const mapRegion = currentLocation
    ? {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  if (checkingActiveRide) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      {MapView ? (
        <MapView
          style={styles.map}
          region={mapRegion}
          showsUserLocation
          showsMyLocationButton={false}
          mapPadding={{ top: 100, bottom: 0, left: 0, right: 0 }}
        >
          {currentLocation && Marker && (
            <Marker
              coordinate={{
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
              }}
              title="You are here"
            >
              <View style={styles.currentLocationMarker}>
                <View style={styles.currentLocationDot} />
              </View>
            </Marker>
          )}
        </MapView>
      ) : (
        <View style={[styles.map, styles.mapFallback]}>
          <Text style={styles.mapFallbackText}>Map View</Text>
          <Text style={styles.mapFallbackSubtext}>
            {currentLocation
              ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
              : "Waiting for location..."}
          </Text>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <View style={styles.searchDot} />
          <TextInput
            style={styles.searchInput}
            placeholder="Where are you going?"
            placeholderTextColor={Colors.grayLight}
            value={destination}
            onChangeText={(text) => {
              setDestination(text);
              if (!text.trim()) setShowSheet(false);
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Greeting */}
      {!showSheet && (
        <View style={styles.greetingCard}>
          <Text style={styles.greetingText}>
            Hello, {user?.name?.split(" ")[0] ?? "Rider"}
          </Text>
          <Text style={styles.greetingSubtext}>
            Where would you like to go today?
          </Text>
        </View>
      )}

      {/* Bottom sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: sheetAnim }] },
        ]}
      >
        <View style={styles.sheetHandle} />

        <Text style={styles.sheetTitle}>Ride Details</Text>

        {/* Pickup */}
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: Colors.success }]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Pickup</Text>
            <Text style={styles.locationAddress}>Current Location</Text>
          </View>
        </View>

        {/* Dropoff */}
        <View style={styles.locationRow}>
          <View style={[styles.locationDot, { backgroundColor: Colors.primary }]} />
          <View style={styles.locationInfo}>
            <Text style={styles.locationLabel}>Dropoff</Text>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {destination || "Enter destination"}
            </Text>
          </View>
        </View>

        {/* Ride type toggle */}
        <View style={styles.rideTypeContainer}>
          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              rideType === "round_trip" && styles.rideTypeActive,
            ]}
            onPress={() => setRideType("round_trip")}
          >
            <Text
              style={[
                styles.rideTypePrice,
                rideType === "round_trip" && styles.rideTypePriceActive,
              ]}
            >
              {PRICING.currency}{PRICING.roundTrip}
            </Text>
            <Text
              style={[
                styles.rideTypeLabel,
                rideType === "round_trip" && styles.rideTypeLabelActive,
              ]}
            >
              Round-Trip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rideTypeButton,
              rideType === "one_way" && styles.rideTypeActive,
            ]}
            onPress={() => setRideType("one_way")}
          >
            <Text
              style={[
                styles.rideTypePrice,
                rideType === "one_way" && styles.rideTypePriceActive,
              ]}
            >
              {PRICING.currency}{PRICING.oneWay}
            </Text>
            <Text
              style={[
                styles.rideTypeLabel,
                rideType === "one_way" && styles.rideTypeLabelActive,
              ]}
            >
              One-Way
            </Text>
          </TouchableOpacity>
        </View>

        {/* Request button */}
        <TouchableOpacity
          style={styles.requestButton}
          onPress={handleRequestRide}
          activeOpacity={0.8}
        >
          <Text style={styles.requestButtonText}>Request Ride</Text>
        </TouchableOpacity>
      </Animated.View>
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
  map: {
    width: "100%",
    height: "100%",
  },
  mapFallback: {
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
  },
  mapFallbackText: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  mapFallbackSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 8,
  },

  /* Current location marker */
  currentLocationMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.white,
  },

  /* Search bar */
  searchContainer: {
    position: "absolute",
    top: Platform.OS === "ios" ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
  },

  /* Greeting card */
  greetingCard: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 120 : 100,
    left: 16,
    right: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark,
  },
  greetingSubtext: {
    fontSize: 15,
    color: Colors.gray,
    marginTop: 4,
  },

  /* Bottom sheet */
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_HEIGHT,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
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
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.dark,
    marginBottom: 16,
  },

  /* Location rows */
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  locationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  locationInfo: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.dark,
    marginTop: 2,
  },

  /* Ride type toggle */
  rideTypeContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  rideTypeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
  },
  rideTypeActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EFF6FF",
  },
  rideTypePrice: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.dark,
  },
  rideTypePriceActive: {
    color: Colors.primary,
  },
  rideTypeLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.gray,
    marginTop: 2,
  },
  rideTypeLabelActive: {
    color: Colors.primary,
  },

  /* Request button */
  requestButton: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  requestButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
});

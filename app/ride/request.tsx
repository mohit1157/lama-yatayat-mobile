/**
 * LaMa Yatayat - Ride Request Confirmation
 *
 * Shows pickup/dropoff on a map, fare toggle, promo code input,
 * and a "Request Ride" button that POSTs to the backend.
 */

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors, PRICING, DEFAULT_REGION } from "@/constants/config";
import { useRideStore } from "@/stores/ride";
import { useLocationStore } from "@/stores/location";
import type { RideRequestInput } from "@/lib/types";

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

export default function RideRequestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    destination: string;
    rideType: string;
    pickupLat: string;
    pickupLng: string;
    dropoffLat: string;
    dropoffLng: string;
  }>();

  const { requestRide, isLoading } = useRideStore();
  const { currentLocation } = useLocationStore();

  const [rideType, setRideType] = useState<"round_trip" | "one_way">(
    (params.rideType as "round_trip" | "one_way") ?? "round_trip"
  );
  const [promoCode, setPromoCode] = useState("");

  const pickupLat = parseFloat(params.pickupLat ?? "") || currentLocation?.latitude || DEFAULT_REGION.latitude;
  const pickupLng = parseFloat(params.pickupLng ?? "") || currentLocation?.longitude || DEFAULT_REGION.longitude;

  // Use actual dropoff coordinates from Google Places, or fallback to offset
  const dropoffLat = parseFloat(params.dropoffLat ?? "") || pickupLat + 0.015;
  const dropoffLng = parseFloat(params.dropoffLng ?? "") || pickupLng + 0.01;

  const fare = rideType === "round_trip" ? PRICING.roundTrip : PRICING.oneWay;

  const handleRequest = async () => {
    // Send flat fields matching backend RideRequestInput model
    const input = {
      pickup_lat: pickupLat,
      pickup_lng: pickupLng,
      pickup_addr: "Current Location",
      dropoff_lat: dropoffLat,
      dropoff_lng: dropoffLng,
      dropoff_addr: params.destination ?? "Destination",
      is_round_trip: rideType === "round_trip",
    };

    try {
      await requestRide(input);
      router.replace("/ride/matching");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to request ride";
      Alert.alert("Request Failed", message);
    }
  };

  const midLat = (pickupLat + dropoffLat) / 2;
  const midLng = (pickupLng + dropoffLng) / 2;

  return (
    <View style={styles.container}>
      {/* Map */}
      <View style={styles.mapContainer}>
        {MapView ? (
          <MapView
            style={styles.map}
            region={{
              latitude: midLat,
              longitude: midLng,
              latitudeDelta: 0.04,
              longitudeDelta: 0.04,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            {MapMarker && (
              <>
                <MapMarker
                  coordinate={{ latitude: pickupLat, longitude: pickupLng }}
                  title="Pickup"
                >
                  <View style={styles.pickupMarker}>
                    <View style={styles.pickupDot} />
                  </View>
                </MapMarker>
                <MapMarker
                  coordinate={{
                    latitude: dropoffLat,
                    longitude: dropoffLng,
                  }}
                  title="Dropoff"
                >
                  <View style={styles.dropoffMarker}>
                    <View style={styles.dropoffDot} />
                  </View>
                </MapMarker>
              </>
            )}
          </MapView>
        ) : (
          <View style={[styles.map, styles.mapFallback]}>
            <Text style={styles.mapFallbackText}>Route Preview</Text>
            <Text style={styles.mapFallbackSubtext}>
              Pickup {"\u2192"} {params.destination ?? "Destination"}
            </Text>
          </View>
        )}

        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>{"\u2190"}</Text>
        </TouchableOpacity>
      </View>

      {/* Details card */}
      <ScrollView
        style={styles.detailsCard}
        contentContainerStyle={styles.detailsContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.cardTitle}>Confirm Your Ride</Text>

        {/* Route summary */}
        <View style={styles.routeContainer}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress}>Current Location</Text>
            </View>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>Dropoff</Text>
              <Text style={styles.routeAddress} numberOfLines={1}>
                {params.destination ?? "Destination"}
              </Text>
            </View>
          </View>
        </View>

        {/* Ride type toggle */}
        <View style={styles.fareSection}>
          <Text style={styles.fareSectionTitle}>Select Ride Type</Text>

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
        </View>

        {/* Promo code */}
        <View style={styles.promoSection}>
          <Text style={styles.promoLabel}>Promo Code</Text>
          <TextInput
            style={styles.promoInput}
            placeholder="Enter promo code (optional)"
            placeholderTextColor={Colors.grayLight}
            value={promoCode}
            onChangeText={setPromoCode}
            autoCapitalize="characters"
          />
        </View>

        {/* Fare summary */}
        <View style={styles.fareSummary}>
          <View style={styles.fareRow}>
            <Text style={styles.fareItemLabel}>Estimated Fare</Text>
            <Text style={styles.fareItemValue}>
              {PRICING.currency}{fare.toFixed(2)}
            </Text>
          </View>
          {promoCode.trim() ? (
            <View style={styles.fareRow}>
              <Text style={styles.fareItemLabel}>Promo Code</Text>
              <Text style={[styles.fareItemValue, { color: Colors.success }]}>
                Applied
              </Text>
            </View>
          ) : null}
        </View>

        {/* Request button */}
        <TouchableOpacity
          style={[styles.requestButton, isLoading && styles.buttonDisabled]}
          onPress={handleRequest}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.requestButtonText}>
              Request Ride - {PRICING.currency}{fare.toFixed(2)}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.lightBg,
  },

  /* Map */
  mapContainer: {
    height: "40%",
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapFallback: {
    backgroundColor: "#E8F4FD",
    justifyContent: "center",
    alignItems: "center",
  },
  mapFallbackText: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  mapFallbackSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 6,
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

  /* Details card */
  detailsCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  detailsContent: {
    padding: 24,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.dark,
    marginBottom: 20,
  },

  /* Route */
  routeContainer: {
    backgroundColor: Colors.lightBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 14,
  },
  routeInfo: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.gray,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.dark,
    marginTop: 2,
  },
  routeDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.border,
    marginLeft: 5.5,
    marginVertical: 4,
  },

  /* Fare section */
  fareSection: {
    marginBottom: 20,
  },
  fareSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark,
    marginBottom: 12,
  },
  rideTypeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  rideTypeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
  },
  rideTypeActive: {
    borderColor: Colors.primary,
    backgroundColor: "#EFF6FF",
  },
  rideTypePrice: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.dark,
  },
  rideTypePriceActive: {
    color: Colors.primary,
  },
  rideTypeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.gray,
    marginTop: 2,
  },
  rideTypeLabelActive: {
    color: Colors.primary,
  },

  /* Promo code */
  promoSection: {
    marginBottom: 20,
  },
  promoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark,
    marginBottom: 8,
  },
  promoInput: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: Colors.dark,
    backgroundColor: Colors.lightBg,
  },

  /* Fare summary */
  fareSummary: {
    backgroundColor: Colors.lightBg,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  fareItemLabel: {
    fontSize: 15,
    color: Colors.gray,
  },
  fareItemValue: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.dark,
  },

  /* Request button */
  requestButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  requestButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
});

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
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { Colors, DEFAULT_REGION, PRICING } from "@/constants/config";
import { useLocationStore } from "@/stores/location";
import { useRideStore } from "@/stores/ride";
import { useAuthStore } from "@/stores/auth";

const GOOGLE_PLACES_API_KEY = "AIzaSyCn3KmJ8KWNTDH8D2NULcuE3-b9ZqELRLs";

// Conditional MapView import -- falls back to a colored View
let MapView: React.ComponentType<any> | null = null;
try {
  const maps = require("react-native-maps");
  MapView = maps.default;
} catch {
  MapView = null;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const BOTTOM_SHEET_HEIGHT = 340;

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface SelectedPlace {
  name: string;
  lat: number;
  lng: number;
}

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
  const [mapReady, setMapReady] = useState(false);
  const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [searching, setSearching] = useState(false);

  const sheetAnim = useRef(new Animated.Value(BOTTOM_SHEET_HEIGHT)).current;
  const mapRef = useRef<any>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Start watching location
  useEffect(() => {
    startWatching();
  }, [startWatching]);

  // Delay map rendering to avoid crash during initial native module init
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Animate map to user location when it becomes available
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      );
    }
  }, [currentLocation]);

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

  // Google Places Autocomplete search (debounced)
  const searchPlaces = useCallback(
    (query: string) => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

      if (query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      searchTimerRef.current = setTimeout(async () => {
        setSearching(true);
        try {
          const locationBias = currentLocation
            ? `&location=${currentLocation.latitude},${currentLocation.longitude}&radius=50000`
            : "&components=country:np";

          const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            query
          )}&key=${GOOGLE_PLACES_API_KEY}${locationBias}`;

          const res = await fetch(url);
          const data = await res.json();

          if (data.status === "OK" && data.predictions) {
            setSearchResults(data.predictions.slice(0, 5));
          } else {
            setSearchResults([]);
          }
        } catch {
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, 400);
    },
    [currentLocation]
  );

  // Get place details (coordinates) from place_id
  const selectPlace = async (prediction: PlacePrediction) => {
    setDestination(prediction.structured_formatting.main_text);
    setSearchResults([]);
    Keyboard.dismiss();

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=geometry,name&key=${GOOGLE_PLACES_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.result?.geometry?.location) {
        const { lat, lng } = data.result.geometry.location;
        setSelectedPlace({
          name: prediction.structured_formatting.main_text,
          lat,
          lng,
        });
        setShowSheet(true);
      } else {
        // Fallback: use offset from current location
        const fallbackLat = (currentLocation?.latitude ?? DEFAULT_REGION.latitude) + 0.015;
        const fallbackLng = (currentLocation?.longitude ?? DEFAULT_REGION.longitude) + 0.01;
        setSelectedPlace({
          name: prediction.structured_formatting.main_text,
          lat: fallbackLat,
          lng: fallbackLng,
        });
        setShowSheet(true);
      }
    } catch {
      // Fallback on error
      const fallbackLat = (currentLocation?.latitude ?? DEFAULT_REGION.latitude) + 0.015;
      const fallbackLng = (currentLocation?.longitude ?? DEFAULT_REGION.longitude) + 0.01;
      setSelectedPlace({
        name: prediction.structured_formatting.main_text,
        lat: fallbackLat,
        lng: fallbackLng,
      });
      setShowSheet(true);
    }
  };

  const handleSearchSubmit = () => {
    if (destination.trim()) {
      Keyboard.dismiss();
      // If no place selected yet, do a quick search and pick the first result
      if (!selectedPlace && searchResults.length > 0) {
        selectPlace(searchResults[0]);
      } else if (selectedPlace) {
        setShowSheet(true);
      }
    }
  };

  const handleRequestRide = () => {
    const pickupLat = currentLocation?.latitude ?? DEFAULT_REGION.latitude;
    const pickupLng = currentLocation?.longitude ?? DEFAULT_REGION.longitude;
    const dropoffLat = selectedPlace?.lat ?? pickupLat + 0.015;
    const dropoffLng = selectedPlace?.lng ?? pickupLng + 0.01;

    router.push({
      pathname: "/ride/request",
      params: {
        destination: selectedPlace?.name ?? destination.trim(),
        rideType,
        pickupLat: pickupLat.toString(),
        pickupLng: pickupLng.toString(),
        dropoffLat: dropoffLat.toString(),
        dropoffLng: dropoffLng.toString(),
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
      {MapView && mapReady ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={mapRegion}
          showsUserLocation
          showsMyLocationButton
        />
      ) : (
        <View style={[styles.map, styles.mapFallback]}>
          <Text style={styles.mapFallbackText}>Map View</Text>
          {!mapReady ? (
            <ActivityIndicator
              size="small"
              color={Colors.primary}
              style={{ marginTop: 12 }}
            />
          ) : (
            <Text style={styles.mapFallbackSubtext}>
              {currentLocation
                ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                : "Waiting for location..."}
            </Text>
          )}
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
              setSelectedPlace(null);
              if (!text.trim()) {
                setShowSheet(false);
                setSearchResults([]);
              } else {
                searchPlaces(text);
              }
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
          />
          {searching && (
            <ActivityIndicator size="small" color={Colors.primary} />
          )}
          {destination.length > 0 && !searching && (
            <TouchableOpacity
              onPress={() => {
                setDestination("");
                setSelectedPlace(null);
                setSearchResults([]);
                setShowSheet(false);
              }}
            >
              <Text style={{ fontSize: 18, color: Colors.grayLight, paddingLeft: 8 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((item) => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.searchResultItem}
                onPress={() => selectPlace(item)}
              >
                <View style={styles.searchResultIcon}>
                  <Text style={{ fontSize: 16 }}>📍</Text>
                </View>
                <View style={styles.searchResultText}>
                  <Text style={styles.searchResultMain} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.searchResultSecondary} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Greeting */}
      {!showSheet && searchResults.length === 0 && (
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
              {selectedPlace?.name ?? destination || "Enter destination"}
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
  searchResults: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultMain: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark,
  },
  searchResultSecondary: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
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

/**
 * LaMa Yatayat - Ride Matching Screen
 *
 * "Finding your driver..." with a pulsing animation.
 * Polls GET /api/v1/rides/active every 3 s.
 * Navigates to /ride/active when matched, or times out at 60 s.
 */

import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/config";
import { useRideStore } from "@/stores/ride";

const TIMEOUT_SECONDS = 60;
const POLL_INTERVAL = 3000;

export default function MatchingScreen() {
  const router = useRouter();
  const { activeRide, fetchActiveRide, cancelRide, setMatchingStatus, clearRide } =
    useRideStore();

  const [elapsed, setElapsed] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  // Pulsing animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.6,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim, opacityAnim]);

  // Poll for active ride
  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const ride = await fetchActiveRide();
        if (cancelled) return;

        if (
          ride &&
          ride.status !== "requested" &&
          ride.status !== "cancelled"
        ) {
          setMatchingStatus("matched");
          router.replace("/ride/active");
        }
      } catch {
        // Keep polling
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL);
    // Also poll immediately
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchActiveRide, router, setMatchingStatus]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= TIMEOUT_SECONDS) {
          setMatchingStatus("timeout");
          Alert.alert(
            "No Drivers Available",
            "We couldn't find a driver right now. Please try again later.",
            [
              {
                text: "OK",
                onPress: () => {
                  clearRide();
                  router.replace("/(tabs)/home");
                },
              },
            ]
          );
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [clearRide, router, setMatchingStatus]);

  const handleCancel = () => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride request?",
      [
        { text: "Keep Waiting", style: "cancel" },
        {
          text: "Cancel Ride",
          style: "destructive",
          onPress: async () => {
            try {
              if (activeRide) {
                await cancelRide(activeRide.id);
              } else {
                clearRide();
              }
            } catch {
              clearRide();
            }
            router.replace("/(tabs)/home");
          },
        },
      ]
    );
  };

  const remaining = TIMEOUT_SECONDS - elapsed;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <View style={styles.container}>
      {/* Pulsing circle */}
      <View style={styles.pulseContainer}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: opacityAnim,
            },
          ]}
        />
        <View style={styles.centerCircle}>
          <Text style={styles.carIcon}>{"\uD83D\uDE97"}</Text>
        </View>
      </View>

      {/* Text */}
      <Text style={styles.title}>Finding your driver...</Text>
      <Text style={styles.subtitle}>
        Please wait while we match you with a nearby driver
      </Text>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>
        <Text style={styles.timerLabel}>Estimated wait</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2].map((i) => (
          <Animated.View
            key={i}
            style={[
              styles.progressDot,
              {
                opacity: opacityAnim.interpolate({
                  inputRange: [0, 0.6],
                  outputRange: [i === elapsed % 3 ? 1 : 0.3, i === elapsed % 3 ? 1 : 0.3],
                }),
                backgroundColor:
                  i === elapsed % 3 ? Colors.primary : Colors.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Cancel button */}
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancel}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelText}>Cancel Request</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  /* Pulse */
  pulseContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
  },
  centerCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  carIcon: {
    fontSize: 36,
  },

  /* Text */
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.dark,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },

  /* Timer */
  timerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  timerText: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.dark,
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 13,
    color: Colors.gray,
    marginTop: 4,
  },

  /* Dots */
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 48,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

  /* Cancel */
  cancelButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.danger,
  },
});

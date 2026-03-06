/**
 * LaMa Yatayat - Trip Complete Screen
 *
 * Shows the fare breakdown, a 5-star rating component,
 * an optional comment, and submits the rating.
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
import { Colors, PRICING } from "@/constants/config";
import { useRideStore } from "@/stores/ride";
import StarRating from "@/components/StarRating";

export default function CompleteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ rideId: string }>();
  const { activeRide, rateRide, clearRide, isLoading } = useRideStore();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const ride = activeRide;
  const rideId = params.rideId ?? ride?.id ?? "";

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating.");
      return;
    }

    try {
      await rateRide(rideId, {
        rating,
        comment: comment.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit rating";
      Alert.alert("Error", message);
    }
  };

  const handleDone = () => {
    clearRide();
    router.replace("/(tabs)/home");
  };

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successCircle}>
          <Text style={styles.successCheck}>{"\u2713"}</Text>
        </View>
        <Text style={styles.successTitle}>Thank You!</Text>
        <Text style={styles.successSubtext}>
          Your rating has been submitted. We hope you had a great ride!
        </Text>
        <TouchableOpacity
          style={styles.doneButton}
          onPress={handleDone}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.completeBadge}>
          <Text style={styles.completeBadgeText}>{"\u2713"}</Text>
        </View>
        <Text style={styles.title}>Trip Complete</Text>
        <Text style={styles.subtitle}>
          You have arrived at your destination
        </Text>
      </View>

      {/* Fare breakdown */}
      <View style={styles.fareCard}>
        <Text style={styles.fareCardTitle}>Fare Summary</Text>

        {ride && (
          <>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>
                {ride.pickup_addr || "Pickup"}
              </Text>
            </View>
            <View style={styles.fareArrow}>
              <Text style={styles.fareArrowText}>{"\u2193"}</Text>
            </View>
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>
                {ride.dropoff_addr || "Dropoff"}
              </Text>
            </View>

            <View style={styles.fareDivider} />

            <View style={styles.fareDetailRow}>
              <Text style={styles.fareDetailLabel}>Ride Type</Text>
              <Text style={styles.fareDetailValue}>
                {ride.is_round_trip ? "Round-Trip" : "One-Way"}
              </Text>
            </View>

            <View style={styles.fareTotalDivider} />

            <View style={styles.fareTotalRow}>
              <Text style={styles.fareTotalLabel}>Total</Text>
              <Text style={styles.fareTotalValue}>
                {PRICING.currency}{ride.fare_amount?.toFixed(2) ?? "--"}
              </Text>
            </View>
          </>
        )}

        {!ride && (
          <View style={styles.fareTotalRow}>
            <Text style={styles.fareTotalLabel}>Total</Text>
            <Text style={styles.fareTotalValue}>--</Text>
          </View>
        )}
      </View>

      {/* Driver info */}
      {ride?.driver && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>
              {ride.driver.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{ride.driver.name}</Text>
            <Text style={styles.driverVehicle}>
              {ride.driver.vehicle.color} {ride.driver.vehicle.make}{" "}
              {ride.driver.vehicle.model}
            </Text>
          </View>
        </View>
      )}

      {/* Rating */}
      <View style={styles.ratingSection}>
        <Text style={styles.ratingSectionTitle}>Rate your ride</Text>
        <Text style={styles.ratingSectionSubtext}>
          How was your experience?
        </Text>

        <StarRating value={rating} onValueChange={setRating} size={44} />
      </View>

      {/* Comment */}
      <View style={styles.commentSection}>
        <Text style={styles.commentLabel}>Leave a comment (optional)</Text>
        <TextInput
          style={styles.commentInput}
          placeholder="Tell us about your experience..."
          placeholderTextColor={Colors.grayLight}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitButton, isLoading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.submitButtonText}>Submit Rating</Text>
        )}
      </TouchableOpacity>

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleDone}
        disabled={isLoading}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 70 : 50,
    paddingBottom: 40,
  },

  /* Header */
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  completeBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  completeBadgeText: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.dark,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.gray,
    marginTop: 4,
  },

  /* Fare card */
  fareCard: {
    backgroundColor: Colors.lightBg,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  fareCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.dark,
    marginBottom: 14,
  },
  fareRow: {
    paddingVertical: 4,
  },
  fareLabel: {
    fontSize: 14,
    color: Colors.darkSecondary,
  },
  fareArrow: {
    paddingVertical: 2,
    paddingLeft: 4,
  },
  fareArrowText: {
    fontSize: 16,
    color: Colors.grayLight,
  },
  fareDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14,
  },
  fareDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  fareDetailLabel: {
    fontSize: 14,
    color: Colors.gray,
  },
  fareDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.dark,
  },
  fareTotalDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  fareTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fareTotalLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.dark,
  },
  fareTotalValue: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
  },

  /* Driver card */
  driverCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.lightBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  driverAvatarText: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.white,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.dark,
  },
  driverVehicle: {
    fontSize: 14,
    color: Colors.gray,
    marginTop: 2,
  },

  /* Rating */
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.dark,
    marginBottom: 4,
  },
  ratingSectionSubtext: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 16,
  },

  /* Comment */
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark,
    marginBottom: 8,
  },
  commentInput: {
    height: 100,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.dark,
    backgroundColor: Colors.lightBg,
  },

  /* Buttons */
  submitButton: {
    height: 54,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
  skipButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: Colors.gray,
    fontWeight: "500",
  },

  /* Success state */
  successContainer: {
    flex: 1,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  successCheck: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.white,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.dark,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    color: Colors.gray,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  doneButton: {
    height: 54,
    paddingHorizontal: 48,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "700",
  },
});

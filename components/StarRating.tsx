/**
 * LaMa Yatayat - Star Rating Component
 *
 * Renders 5 tappable stars. Filled stars use the "filled" unicode
 * character, outline stars use the "outline" one. Props control
 * the current value and an onChange callback.
 */

import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Colors } from "@/constants/config";

interface StarRatingProps {
  /** Current value (0-5) */
  value: number;
  /** Called with the new value (1-5) when a star is tapped */
  onValueChange: (value: number) => void;
  /** Star size in pixels (default 36) */
  size?: number;
  /** Whether the rating is read-only */
  disabled?: boolean;
}

export default function StarRating({
  value,
  onValueChange,
  size = 36,
  disabled = false,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.container}>
      {stars.map((starValue) => {
        const filled = starValue <= value;

        return (
          <TouchableOpacity
            key={starValue}
            onPress={() => {
              if (!disabled) onValueChange(starValue);
            }}
            activeOpacity={disabled ? 1 : 0.6}
            style={styles.starButton}
            disabled={disabled}
          >
            <Text
              style={[
                styles.star,
                {
                  fontSize: size,
                  color: filled ? Colors.warning : Colors.border,
                },
              ]}
            >
              {filled ? "\u2605" : "\u2606"}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  star: {
    // font size and color set dynamically
  },
});

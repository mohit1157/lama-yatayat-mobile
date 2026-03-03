/**
 * LaMa Yatayat - App Configuration
 */

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "https://lama-yatayat-backend-production.up.railway.app";

export const WS_URL =
  process.env.EXPO_PUBLIC_WS_URL ??
  "wss://lama-yatayat-backend-production.up.railway.app";

/** Color palette used throughout the app */
export const Colors = {
  primary: "#2563EB",
  primaryLight: "#3B82F6",
  primaryDark: "#1D4ED8",
  success: "#10B981",
  successLight: "#34D399",
  warning: "#F59E0B",
  danger: "#EF4444",
  dangerLight: "#FCA5A5",
  dark: "#1F2937",
  darkSecondary: "#374151",
  gray: "#6B7280",
  grayLight: "#9CA3AF",
  border: "#E5E7EB",
  lightBg: "#F9FAFB",
  white: "#FFFFFF",
} as const;

/** Map default region (Kathmandu, Nepal) */
export const DEFAULT_REGION = {
  latitude: 27.7172,
  longitude: 85.324,
  latitudeDelta: 0.0922,
  longitudeDelta: 0.0421,
};

/** Ride pricing constants */
export const PRICING = {
  roundTrip: 20,
  oneWay: 10,
  currency: "$",
} as const;

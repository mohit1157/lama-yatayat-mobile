/**
 * LaMa Yatayat - Auth Layout
 *
 * Simple Stack navigator for the login / register flow.
 */

import { Stack } from "expo-router";
import { Colors } from "@/constants/config";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}

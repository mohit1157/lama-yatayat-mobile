/**
 * LaMa Yatayat - Ride Flow Layout
 *
 * Stack navigator for the ride request -> matching -> active -> complete flow.
 */

import { Stack } from "expo-router";
import { Colors } from "@/constants/config";

export default function RideLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.white },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="request" />
      <Stack.Screen name="matching" />
      <Stack.Screen
        name="active"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen
        name="complete"
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
}

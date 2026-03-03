/**
 * LaMa Yatayat - Root Layout
 *
 * Hydrates auth state on app start and redirects to the login
 * screen when the user is not authenticated.
 */

import { useEffect } from "react";
import { ActivityIndicator, View, StyleSheet } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useAuthStore } from "@/stores/auth";
import { Colors } from "@/constants/config";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before we check auth.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isHydrated, hydrate } = useAuthStore();

  // Hydrate auth state from SecureStore on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Hide splash screen once hydrated
  useEffect(() => {
    if (isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isHydrated]);

  // Redirect based on auth state once hydrated
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // Not signed in -> send to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Already signed in -> send to home
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isHydrated, segments, router]);

  // Show loading spinner while hydrating
  if (!isHydrated) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
  },
});

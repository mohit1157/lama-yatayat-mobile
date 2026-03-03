/**
 * LaMa Yatayat - Push Notification Service
 *
 * Registers for Expo push notifications and sends the device
 * token to the backend so it can deliver ride updates.
 */

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-constants";
import { post } from "@/services/api";
import type { PushTokenPayload } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Configure notification handling                                    */
/* ------------------------------------------------------------------ */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/* ------------------------------------------------------------------ */
/*  Register for push notifications                                    */
/* ------------------------------------------------------------------ */

export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.default.isDevice) {
    console.warn("Push notifications require a physical device.");
    return null;
  }

  // Request permission
  const { status: existingStatus } =
    await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.warn("Push notification permission not granted.");
    return null;
  }

  // Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#2563EB",
    });
  }

  // Get Expo push token
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Device.default.expoConfig?.extra?.eas?.projectId,
    });
    return tokenData.data;
  } catch (error) {
    console.warn("Failed to get push token:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Send token to backend                                              */
/* ------------------------------------------------------------------ */

export async function sendPushTokenToServer(token: string): Promise<void> {
  const platform: PushTokenPayload["platform"] =
    Platform.OS === "ios" ? "ios" : "android";

  try {
    await post("/api/v1/notifications/token", { token, platform });
  } catch (error) {
    console.warn("Failed to register push token with server:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience – register & send in one call                          */
/* ------------------------------------------------------------------ */

export async function setupPushNotifications(): Promise<void> {
  const token = await registerForPushNotifications();
  if (token) {
    await sendPushTokenToServer(token);
  }
}

/**
 * LaMa Yatayat - Location Store (Zustand)
 *
 * Manages the rider's foreground location using expo-location.
 * Starts / stops a position watcher and keeps the latest coords
 * in state so any screen can read them synchronously.
 */

import { create } from "zustand";
import * as Location from "expo-location";
import type { LatLng } from "@/lib/types";

interface LocationState {
  currentLocation: LatLng | null;
  isWatching: boolean;
  permissionGranted: boolean | null;
  error: string | null;

  /** Request permission and start foreground location updates */
  startWatching: () => Promise<void>;

  /** Stop the location watcher */
  stopWatching: () => void;
}

let watchSubscription: Location.LocationSubscription | null = null;

export const useLocationStore = create<LocationState>((set, getState) => ({
  currentLocation: null,
  isWatching: false,
  permissionGranted: null,
  error: null,

  /* ---------------------------------------------------------------- */
  /*  Start watching                                                   */
  /* ---------------------------------------------------------------- */

  startWatching: async () => {
    // Avoid double-subscribing
    if (getState().isWatching) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        set({
          permissionGranted: false,
          error: "Location permission denied",
        });
        return;
      }

      set({ permissionGranted: true });

      // Get an initial position right away
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        set({
          currentLocation: {
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude,
          },
        });
      } catch {
        // Will be populated by the watcher shortly
      }

      // Start continuous updates
      watchSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // every 5 s
          distanceInterval: 10, // or every 10 m
        },
        (position) => {
          set({
            currentLocation: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          });
        }
      );

      set({ isWatching: true, error: null });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start location";
      set({ error: message });
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Stop watching                                                    */
  /* ---------------------------------------------------------------- */

  stopWatching: () => {
    if (watchSubscription) {
      watchSubscription.remove();
      watchSubscription = null;
    }
    set({ isWatching: false });
  },
}));

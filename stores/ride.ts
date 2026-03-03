/**
 * LaMa Yatayat - Ride Store (Zustand)
 *
 * Manages the active ride lifecycle: requesting, tracking driver
 * location, status updates, and clearing state after completion.
 */

import { create } from "zustand";
import { post, get, del } from "@/services/api";
import type {
  Ride,
  RideRequestInput,
  DriverLocation,
  RideRatingInput,
} from "@/lib/types";

export type MatchingStatus = "idle" | "searching" | "matched" | "timeout" | "error";

interface RideState {
  activeRide: Ride | null;
  driverLocation: DriverLocation | null;
  matchingStatus: MatchingStatus;
  rideHistory: Ride[];
  isLoading: boolean;
  error: string | null;

  /** POST /api/v1/rides/request – create a new ride request */
  requestRide: (input: RideRequestInput) => Promise<Ride>;

  /** DELETE /api/v1/rides/{id}/cancel */
  cancelRide: (rideId: string) => Promise<void>;

  /** Update active ride from API or WebSocket */
  setActiveRide: (ride: Ride | null) => void;

  /** Update driver's real-time location */
  updateDriverLocation: (loc: DriverLocation) => void;

  /** Set matching status */
  setMatchingStatus: (status: MatchingStatus) => void;

  /** Fetch the active ride from the server */
  fetchActiveRide: () => Promise<Ride | null>;

  /** Fetch ride history */
  fetchRideHistory: () => Promise<void>;

  /** Submit a ride rating */
  rateRide: (rideId: string, input: RideRatingInput) => Promise<void>;

  /** Clear all ride state (after completion / cancel) */
  clearRide: () => void;
}

export const useRideStore = create<RideState>((set, _getState) => ({
  activeRide: null,
  driverLocation: null,
  matchingStatus: "idle",
  rideHistory: [],
  isLoading: false,
  error: null,

  /* ---------------------------------------------------------------- */
  /*  Request a ride                                                   */
  /* ---------------------------------------------------------------- */

  requestRide: async (input: RideRequestInput) => {
    set({ isLoading: true, error: null, matchingStatus: "searching" });

    try {
      const ride = await post<Ride>("/api/v1/rides/request", input);
      set({ activeRide: ride, isLoading: false });
      return ride;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to request ride";
      set({ isLoading: false, error: message, matchingStatus: "error" });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Cancel a ride                                                    */
  /* ---------------------------------------------------------------- */

  cancelRide: async (rideId: string) => {
    set({ isLoading: true, error: null });

    try {
      await del(`/api/v1/rides/${rideId}/cancel`);
      set({
        activeRide: null,
        driverLocation: null,
        matchingStatus: "idle",
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to cancel ride";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Setters                                                          */
  /* ---------------------------------------------------------------- */

  setActiveRide: (ride: Ride | null) => set({ activeRide: ride }),

  updateDriverLocation: (loc: DriverLocation) =>
    set({ driverLocation: loc }),

  setMatchingStatus: (status: MatchingStatus) =>
    set({ matchingStatus: status }),

  /* ---------------------------------------------------------------- */
  /*  Fetch active ride                                                */
  /* ---------------------------------------------------------------- */

  fetchActiveRide: async () => {
    try {
      const ride = await get<Ride>("/api/v1/rides/active");
      set({ activeRide: ride });
      return ride;
    } catch {
      // No active ride – that is fine
      set({ activeRide: null });
      return null;
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Fetch ride history                                               */
  /* ---------------------------------------------------------------- */

  fetchRideHistory: async () => {
    set({ isLoading: true });
    try {
      const rides = await get<Ride[]>("/api/v1/rides/history");
      set({ rideHistory: rides, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Rate a ride                                                      */
  /* ---------------------------------------------------------------- */

  rateRide: async (rideId: string, input: RideRatingInput) => {
    set({ isLoading: true });
    try {
      await post(`/api/v1/rides/${rideId}/rate`, input);
      set({ isLoading: false });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to submit rating";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Clear                                                            */
  /* ---------------------------------------------------------------- */

  clearRide: () =>
    set({
      activeRide: null,
      driverLocation: null,
      matchingStatus: "idle",
      error: null,
    }),
}));

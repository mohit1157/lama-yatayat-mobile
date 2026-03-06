/**
 * LaMa Yatayat - Auth Store (Zustand)
 *
 * Manages authentication state: user object, JWT, and hydration
 * from SecureStore on app launch.
 */

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { post, setStoredToken, clearStoredToken, getStoredToken, get } from "@/services/api";
import type { AuthResponse, LoginInput, RegisterInput, User } from "@/lib/types";

const TOKEN_KEY = "lama_access_token";
const USER_KEY = "lama_user";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  error: string | null;

  /** Attempt login with email + password */
  login: (email: string, password: string) => Promise<void>;

  /** Register a new rider account */
  register: (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => Promise<void>;

  /** Clear all auth state and stored tokens */
  logout: () => Promise<void>;

  /** Restore auth state from SecureStore on app start */
  hydrate: () => Promise<void>;

  /** Set error manually (e.g. from API interceptor) */
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  error: null,

  /* ---------------------------------------------------------------- */
  /*  Login                                                            */
  /* ---------------------------------------------------------------- */

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });

    try {
      const body: LoginInput = { email, password };
      const data = await post<AuthResponse>("/api/v1/auth/login", body, {
        token: null, // no auth needed
      });

      const token = data?.access_token;
      const user = data?.user;
      if (!token || typeof token !== "string") {
        throw new Error("Invalid login response: missing access token");
      }

      await setStoredToken(token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user ?? {}));

      set({
        user: user ?? null,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Register                                                         */
  /* ---------------------------------------------------------------- */

  register: async (
    name: string,
    email: string,
    phone: string,
    password: string
  ) => {
    set({ isLoading: true, error: null });

    try {
      const body: RegisterInput = {
        name,
        email,
        phone,
        password,
        role: "rider",
      };
      const data = await post<AuthResponse>("/api/v1/auth/register", body, {
        token: null,
      });

      const token = data?.access_token;
      const user = data?.user;
      if (!token || typeof token !== "string") {
        throw new Error("Invalid register response: missing access token");
      }

      await setStoredToken(token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user ?? {}));

      set({
        user: user ?? null,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Logout                                                           */
  /* ---------------------------------------------------------------- */

  logout: async () => {
    await clearStoredToken();
    await SecureStore.deleteItemAsync(USER_KEY);
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  /* ---------------------------------------------------------------- */
  /*  Hydrate (restore persisted session)                               */
  /* ---------------------------------------------------------------- */

  hydrate: async () => {
    try {
      const token = await getStoredToken();
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (token && userJson) {
        const user: User = JSON.parse(userJson);

        // Optionally validate the token by fetching fresh user data
        try {
          const freshUser = await get<User>("/api/v1/auth/me", { token });
          set({
            user: freshUser,
            accessToken: token,
            isAuthenticated: true,
            isHydrated: true,
          });
          return;
        } catch {
          // Token may be expired – use cached user optimistically
          // or clear if 401
        }

        set({
          user,
          accessToken: token,
          isAuthenticated: true,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  setError: (error: string | null) => set({ error }),
}));

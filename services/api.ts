/**
 * LaMa Yatayat - API Client
 *
 * Centralised HTTP client that stores / retrieves the JWT from
 * expo-secure-store and handles 401 responses by clearing tokens.
 */

import * as SecureStore from "expo-secure-store";
import { API_URL } from "@/constants/config";

const TOKEN_KEY = "lama_access_token";

/* ------------------------------------------------------------------ */
/*  Token helpers                                                      */
/* ------------------------------------------------------------------ */

export async function getStoredToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearStoredToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/*  Generic request helper                                             */
/* ------------------------------------------------------------------ */

interface RequestOptions {
  /** Override the default Authorization header */
  token?: string | null;
  /** Extra headers */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const token = options.token !== undefined ? options.token : (await getStoredToken());

  // Build URL with optional query params
  let url = `${API_URL}${path}`;
  if (options.params) {
    const qs = Object.entries(options.params)
      .filter(([, v]) => v !== undefined)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`
      )
      .join("&");
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(options.headers ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 – clear saved token so the auth store can react
  if (res.status === 401) {
    await clearStoredToken();
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  if (!res.ok) {
    let detail = "Something went wrong";
    try {
      const err = await res.json();
      detail = err.error ?? err.detail ?? err.message ?? detail;
    } catch {
      /* ignore parse errors */
    }
    throw new ApiError(detail, res.status);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const json = await res.json();

  // Unwrap backend envelope: { success: true, data: T }
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }

  return json as T;
}

/* ------------------------------------------------------------------ */
/*  Public API surface                                                 */
/* ------------------------------------------------------------------ */

export function get<T>(path: string, options?: RequestOptions) {
  return request<T>("GET", path, undefined, options);
}

export function post<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>("POST", path, body, options);
}

export function put<T>(path: string, body?: unknown, options?: RequestOptions) {
  return request<T>("PUT", path, body, options);
}

export function patch<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions
) {
  return request<T>("PATCH", path, body, options);
}

export function del<T>(path: string, options?: RequestOptions) {
  return request<T>("DELETE", path, undefined, options);
}

/* ------------------------------------------------------------------ */
/*  Custom error class                                                 */
/* ------------------------------------------------------------------ */

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

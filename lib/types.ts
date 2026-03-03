/**
 * LaMa Yatayat - TypeScript Type Definitions
 * Mirrors the backend API models.
 */

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "rider" | "driver" | "admin";
  avatar_url?: string;
  rating?: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "rider";
}

/* ------------------------------------------------------------------ */
/*  Location                                                           */
/* ------------------------------------------------------------------ */

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
}

/* ------------------------------------------------------------------ */
/*  Rides                                                              */
/* ------------------------------------------------------------------ */

export type RideStatus =
  | "requested"
  | "matched"
  | "driver_en_route"
  | "driver_arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface RideRequestInput {
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff_location: {
    lat: number;
    lng: number;
    address: string;
  };
  ride_type: "one_way" | "round_trip";
  promo_code?: string;
}

export interface FareEstimate {
  base_fare: number;
  distance_fare: number;
  total: number;
  currency: string;
  ride_type: "one_way" | "round_trip";
}

export interface Vehicle {
  make: string;
  model: string;
  color: string;
  plate_number: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  avatar_url?: string;
  rating: number;
  vehicle: Vehicle;
}

export interface Ride {
  id: string;
  rider_id: string;
  driver_id?: string;
  driver?: Driver;
  status: RideStatus;
  pickup_location: {
    lat: number;
    lng: number;
    address: string;
  };
  dropoff_location: {
    lat: number;
    lng: number;
    address: string;
  };
  ride_type: "one_way" | "round_trip";
  fare: number;
  distance?: number;
  duration?: number;
  promo_code?: string;
  rating?: number;
  comment?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface RideRatingInput {
  rating: number;
  comment?: string;
}

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

export interface PushTokenPayload {
  token: string;
  platform: "ios" | "android";
}

/* ------------------------------------------------------------------ */
/*  WebSocket messages                                                 */
/* ------------------------------------------------------------------ */

export type WSMessageType =
  | "ride_matched"
  | "driver_location"
  | "ride_status_update"
  | "ride_cancelled"
  | "error";

export interface WSMessage {
  type: WSMessageType;
  data: unknown;
}

export interface WSDriverLocationData {
  lat: number;
  lng: number;
  heading?: number;
}

export interface WSRideStatusData {
  ride_id: string;
  status: RideStatus;
  ride?: Ride;
}

/* ------------------------------------------------------------------ */
/*  API generic response wrappers                                      */
/* ------------------------------------------------------------------ */

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

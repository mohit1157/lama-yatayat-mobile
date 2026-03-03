/**
 * LaMa Yatayat - WebSocket Manager
 *
 * Manages a single WebSocket connection with auto-reconnect and
 * typed event handlers keyed by message type.
 */

import { WS_URL } from "@/constants/config";
import type { WSMessage, WSMessageType } from "@/lib/types";

type MessageHandler = (data: unknown) => void;

const MAX_RECONNECT_DELAY = 30_000; // 30 s
const BASE_RECONNECT_DELAY = 1_000; // 1 s

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Map<WSMessageType, MessageHandler[]> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = false;
  private connectionParams: Record<string, string> = {};

  /* ---------------------------------------------------------------- */
  /*  Connect                                                          */
  /* ---------------------------------------------------------------- */

  connect(params: { user_id: string; ride_id?: string; role?: string }) {
    this.connectionParams = {};
    if (params.user_id) this.connectionParams.user_id = params.user_id;
    if (params.ride_id) this.connectionParams.ride_id = params.ride_id;
    if (params.role) this.connectionParams.role = params.role;

    this.shouldReconnect = true;
    this.openConnection();
  }

  private openConnection() {
    // Build URL with query params
    const qs = Object.entries(this.connectionParams)
      .map(
        ([k, v]) =>
          `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
      )
      .join("&");

    const url = `${WS_URL}/ws${qs ? `?${qs}` : ""}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          const listeners = this.handlers.get(message.type);
          if (listeners) {
            listeners.forEach((fn) => fn(message.data));
          }
        } catch {
          // Ignore malformed messages
        }
      };

      this.ws.onclose = () => {
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror – reconnect handled there
      };
    } catch {
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Reconnect logic (exponential back-off)                           */
  /* ---------------------------------------------------------------- */

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY
    );
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openConnection();
    }, delay);
  }

  /* ---------------------------------------------------------------- */
  /*  Event handlers                                                   */
  /* ---------------------------------------------------------------- */

  on(type: WSMessageType, handler: MessageHandler) {
    const existing = this.handlers.get(type) ?? [];
    existing.push(handler);
    this.handlers.set(type, existing);
  }

  off(type: WSMessageType, handler: MessageHandler) {
    const existing = this.handlers.get(type);
    if (!existing) return;
    this.handlers.set(
      type,
      existing.filter((fn) => fn !== handler)
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Send                                                             */
  /* ---------------------------------------------------------------- */

  send(data: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Disconnect                                                       */
  /* ---------------------------------------------------------------- */

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.handlers.clear();
    this.reconnectAttempts = 0;
  }
}

/** Shared singleton – import where needed */
export const wsManager = new WebSocketManager();

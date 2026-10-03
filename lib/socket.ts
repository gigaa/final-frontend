import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns (or creates) the singleton socket.io client connected to /chat namespace.
 * The JWT token is read lazily from localStorage at connection time.
 *
 * NEXT_API_URL must be set so the browser can reach the backend directly
 * (Next.js rewrites don't proxy WebSocket upgrades).
 */
export function getSocket(): Socket {
  if (!socket) {
    const serverUrl = process.env.NEXT_API_URL || "http://localhost:3000";

    socket = io(`${serverUrl}/chat`, {
      autoConnect: false,
      auth: (cb) => {
        const token =
          typeof window !== "undefined"
            ? (localStorage.getItem("access_token") ?? "")
            : "";
        cb({ token });
      },
      transports: ["websocket"],
    });
  }
  return socket;
}

/**
 * Connect (or reconnect) the singleton socket.
 * Safe to call multiple times — socket.io ignores duplicate connect() calls.
 */
export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

/** Disconnect and destroy the singleton so the next call creates a fresh one. */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

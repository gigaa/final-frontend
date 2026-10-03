import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.io client for the /chat namespace.
 * Created once, lives for the full browser session.
 */
export function getSocket(): Socket {
  if (!socket) {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

    socket = io(`${backendUrl}/chat`, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

/** Connect with a JWT token. Safe to call multiple times. */
export function connectSocket(token: string): Socket {
  const s = getSocket();
  // Always update auth before connecting so a fresh token is used
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

/** No-op — socket lives for the full session. */
export function disconnectSocket(): void {}

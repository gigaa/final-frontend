import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns the singleton Socket.io client for the /chat namespace.
 * The socket is created once and lives for the entire browser session.
 * NEXT_PUBLIC_BACKEND_URL must be set so the value is available client-side.
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
      reconnectionDelay: 1500,
    });
  }
  return socket;
}

/**
 * Connect (or re-use) the singleton socket with the given JWT token.
 * Safe to call from multiple components — the socket is shared.
 */
export function connectSocket(token: string): Socket {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

/**
 * Called by page-level components when they unmount.
 * We intentionally do NOT disconnect here — GlobalChatListener
 * keeps the socket alive for the full session.
 * The socket is only truly closed when the browser tab closes.
 */
export function disconnectSocket(): void {
  // no-op: socket lives for the full browser session
}

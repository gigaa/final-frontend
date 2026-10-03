import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;
let refCount = 0;

/**
 * Returns the singleton Socket.io client for the /chat namespace.
 * Uses NEXT_PUBLIC_BACKEND_URL so the value is available in the browser.
 */
export function getSocket(): Socket {
  if (!socket) {
    // NEXT_PUBLIC_ prefix makes it available client-side
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000";

    socket = io(`${backendUrl}/chat`, {
      autoConnect: false,
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/**
 * Connect (or re-use) the socket with the given JWT token.
 * Increments a ref-count so multiple components can share the connection
 * without one tearing it down while another still needs it.
 */
export function connectSocket(token: string): Socket {
  const s = getSocket();
  refCount++;

  // Update auth token before (re-)connecting
  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }

  return s;
}

/**
 * Decrement the ref-count. Only actually disconnects when the last
 * consumer calls this (i.e. both GlobalChatListener and ChatPage unmount).
 */
export function disconnectSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket?.connected) {
    socket.disconnect();
  }
}

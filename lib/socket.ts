import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/** Returns a singleton Socket.io client connected to the /chat namespace. */
export function getSocket(): Socket {
  if (!socket) {
    const backendUrl = process.env.NEXT_API_URL ?? "http://localhost:3000";

    socket = io(`${backendUrl}/chat`, {
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return socket;
}

export function connectSocket(token: string) {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

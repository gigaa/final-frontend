import { Apinator } from "@apinator/client";

let client: Apinator | null = null;

/**
 * Returns (or creates) the singleton Apinator client.
 * authHeaders is re-read on every channel auth request via a getter trick —
 * Apinator SDK accepts a plain object so we use Object.defineProperty to make
 * the Authorization value lazy (reads localStorage at auth time, not at init).
 */
export function getApinator(): Apinator {
  if (!client) {
    // Build a headers object whose Authorization value is evaluated lazily
    const lazyHeaders: Record<string, string> = {};
    Object.defineProperty(lazyHeaders, "Authorization", {
      get() {
        const token =
          typeof window !== "undefined"
            ? (localStorage.getItem("access_token") ?? "")
            : "";
        return `Bearer ${token}`;
      },
      enumerable: true,
    });

    client = new Apinator({
      appKey: process.env.NEXT_PUBLIC_APINATOR_KEY!,
      cluster:
        (process.env.NEXT_PUBLIC_APINATOR_CLUSTER as "eu" | "us") ?? "eu",
      authEndpoint: "/api/auth/channel",
      authHeaders: lazyHeaders,
    });
  }
  return client;
}

/** Connect the singleton client. Safe to call multiple times. */
export function connectApinator(): Apinator {
  const c = getApinator();
  c.connect();
  return c;
}

/** DM channel — must match server-side dmChannel() in realtime.service.ts */
export function dmChannelName(userIdA: string, userIdB: string): string {
  const [a, b] = [userIdA, userIdB].sort();
  return `private-dm-${a}--${b}`;
}

/** Per-user notification channel */
export function userChannelName(userId: string): string {
  return `private-user-${userId}`;
}

// ── Legacy no-ops ─────────────────────────────────────────────────────────────
export function getSocket() {
  return null as any;
}
export function connectSocket(_token: string) {
  return connectApinator() as any;
}
export function disconnectSocket() {}

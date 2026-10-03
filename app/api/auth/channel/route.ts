import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/** Extract userId from the JWT Authorization header */
async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.replace("Bearer ", "").trim();
    if (!token) return null;
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

/** HMAC-SHA256 for Apinator channel auth signature */
async function hmacSha256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { socket_id, channel_name } = await req.json();
  if (!socket_id || !channel_name) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  // Enforce access rules
  if (channel_name.startsWith("private-user-")) {
    const owner = channel_name.replace("private-user-", "");
    if (owner !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channel_name.startsWith("private-dm-")) {
    const parts = channel_name.replace("private-dm-", "").split("--");
    if (!parts.includes(userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Build Apinator auth signature: HMAC-SHA256(secret, "{socket_id}:{channel_name}")
  const appKey = process.env.NEXT_PUBLIC_APINATOR_KEY!;
  const secret = process.env.APINATOR_SECRET!;
  const stringToSign = `${socket_id}:${channel_name}`;
  const signature = await hmacSha256(secret, stringToSign);

  return NextResponse.json({
    auth: `${appKey}:${signature}`,
  });
}

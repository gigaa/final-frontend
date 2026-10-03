export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export interface RegisterResponse {
  message: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
  access_token: string;
}

export interface ImageRecord {
  _id: string;
  userId: string;
  originalName: string;
  filename: string;
  path: string;
  mimetype: string;
  size: number;
  width: number;
  height: number;
  format: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  url?: string; // S3 presigned URL (attached by backend)
}

export interface PaginatedImages {
  data: ImageRecord[];
  total: number;
  page: number;
  pages: number;
}

export type ImageFormat = "jpeg" | "png" | "webp" | "avif" | "gif";
export type ImageFilter = "grayscale" | "sepia" | "blur" | "sharpen" | "negate";

export interface TransformPayload {
  width?: number;
  height?: number;
  crop?: boolean;
  cropLeft?: number;
  cropTop?: number;
  rotate?: number;
  flip?: boolean;
  mirror?: boolean;
  quality?: number;
  format?: ImageFormat;
  filter?: ImageFilter;
  watermark?: string;
}

// ── Friends ───────────────────────────────────────────────

export type FriendshipStatus = "pending" | "accepted" | "rejected";

export interface FriendUser {
  _id: string;
  name?: string;
  email: string;
}

export interface Friendship {
  _id: string;
  requester: FriendUser | string;
  recipient: FriendUser | string;
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FriendListItem {
  friendshipId: string;
  friend: FriendUser;
}

export interface UserSearchResult {
  _id: string;
  name?: string;
  email: string;
  friendshipStatus: FriendshipStatus | null;
  friendshipId: string | null;
  iAmRequester: boolean;
}

// ── Chat ──────────────────────────────────────────────────

export type MessageType = "text" | "image";

export interface ChatMessage {
  _id: string;
  sender: string;
  recipient: string;
  type: MessageType;
  content: string;
  imageUrl?: string;
  imageOriginalName?: string;
  imageKey?: string;
  read: boolean;
  edited?: boolean;
  createdAt: string;
}

export interface PaginatedMessages {
  messages: ChatMessage[];
  total: number;
  page: number;
  pages: number;
}

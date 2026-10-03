import axios from "axios";
import {
  AuthResponse,
  RegisterResponse,
  VerifyEmailResponse,
  PaginatedImages,
  ImageRecord,
  TransformPayload,
} from "@/types";

// Always use relative /api — Next.js rewrites proxy to the backend.
// This works both locally and on Vercel (rewrite is server-side).
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<RegisterResponse>("/auth/register", data).then((r) => r.data),

  verifyEmail: (token: string) =>
    api
      .get<VerifyEmailResponse>("/auth/verify-email", { params: { token } })
      .then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  resendVerification: (email: string) =>
    api
      .post<{ message: string }>("/auth/resend-verification", { email })
      .then((r) => r.data),
};

// ── Images ────────────────────────────────────────────────
export const imagesApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api
      .post<{
        message: string;
        image: ImageRecord & { url: string };
      }>("/images/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  list: (page = 1, limit = 12) =>
    api
      .get<PaginatedImages>("/images", { params: { page, limit } })
      .then((r) => r.data),

  get: (id: string) =>
    api.get<ImageRecord & { url: string }>(`/images/${id}`).then((r) => r.data),

  transform: (id: string, payload: TransformPayload) =>
    api
      .post<{
        message: string;
        image: ImageRecord & { url: string };
      }>(`/images/${id}/transform`, payload)
      .then((r) => r.data),

  delete: (id: string) => api.delete(`/images/${id}`),

  /**
   * Download through the backend (JWT-auth, avoids S3 CORS).
   * Uses relative /api path so Next.js rewrite handles routing.
   */
  downloadBlob: async (
    id: string,
    originalName: string,
  ): Promise<{ blob: Blob; filename: string }> => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

    const res = await fetch(`/api/images/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);

    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";\r\n]+)/i);
    const filename = match
      ? decodeURIComponent(match[1].trim())
      : originalName || `image-${id}`;

    const blob = await res.blob();
    return { blob, filename };
  },
};

export default api;

// ── Friends ───────────────────────────────────────────────
export const friendsApi = {
  search: (q: string) =>
    api
      .get<
        import("@/types").UserSearchResult[]
      >("/friends/search", { params: { q } })
      .then((r) => r.data),

  list: () =>
    api.get<import("@/types").FriendListItem[]>("/friends").then((r) => r.data),

  pendingReceived: () =>
    api
      .get<import("@/types").Friendship[]>("/friends/requests/received")
      .then((r) => r.data),

  pendingSent: () =>
    api
      .get<import("@/types").Friendship[]>("/friends/requests/sent")
      .then((r) => r.data),

  sendRequest: (recipientId: string) =>
    api.post("/friends/request", { recipientId }).then((r) => r.data),

  respond: (friendshipId: string, status: "accepted" | "rejected") =>
    api
      .patch(`/friends/request/${friendshipId}`, { status })
      .then((r) => r.data),

  remove: (friendshipId: string) => api.delete(`/friends/${friendshipId}`),
};

// ── Chat ──────────────────────────────────────────────────
export const chatApi = {
  getHistory: (friendId: string, page = 1, limit = 30) =>
    api
      .get<import("@/types").PaginatedMessages>(`/chat/${friendId}/messages`, {
        params: { page, limit },
      })
      .then((r) => r.data),

  uploadImage: (friendId: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api
      .post<
        import("@/types").ChatMessage & { imageUrl: string }
      >(`/chat/${friendId}/images`, form, { headers: { "Content-Type": "multipart/form-data" } })
      .then((r) => r.data);
  },

  markRead: (friendId: string) => api.post(`/chat/${friendId}/read`),

  getUnreadCounts: () =>
    api.get<Record<string, number>>("/chat/unread").then((r) => r.data),
};

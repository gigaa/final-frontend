import axios from "axios";
import {
  AuthResponse,
  PaginatedImages,
  ImageRecord,
  TransformPayload,
} from "@/types";

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
    api.post<AuthResponse>("/auth/register", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data).then((r) => r.data),
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
      }>("/images/upload", form, { headers: { "Content-Type": "multipart/form-data" } })
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
   * Download a single image through the backend (JWT-auth, no CORS).
   * originalName is passed explicitly — Next.js proxy may strip
   * Content-Disposition headers from binary responses.
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

    // Try header first; fall back to the explicitly passed name
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

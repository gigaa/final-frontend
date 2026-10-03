import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a showNotification() function that fires a browser Notification.
 *
 * Permission is requested on the first call (browsers require this to happen
 * inside a user gesture or shortly after — calling it eagerly on mount gets
 * silently ignored in most browsers).
 */
export function useChatNotification() {
  const permissionRef = useRef<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    permissionRef.current = Notification.permission;
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "granted") {
      permissionRef.current = "granted";
      return;
    }
    if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      permissionRef.current = result;
    }
  }, []);

  const showNotification = useCallback(
    (
      senderName: string,
      body: string,
      senderId: string,
      onClickUrl: string,
    ) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;

      // Try to request permission if we don't have it yet
      if (Notification.permission !== "granted") {
        requestPermission();
        return;
      }

      // Don't show notification when the tab is visible and focused
      if (document.visibilityState === "visible") return;

      const n = new Notification(`💬 ${senderName}`, {
        body,
        icon: "/favicon.ico",
        tag: `chat-${senderId}`,
      } as NotificationOptions);

      n.onclick = () => {
        window.focus();
        window.location.href = onClickUrl;
        n.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => n.close(), 5000);
    },
    [requestPermission],
  );

  return { showNotification, requestPermission };
}

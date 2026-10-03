import { useRef, useCallback } from 'react';

/**
 * Returns a `play()` function that plays the notification sound.
 * Uses an HTML Audio element — works even before any user interaction
 * in most browsers (unlike AudioContext which requires a gesture first).
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Lazily create the Audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio('/notification.wav');
      audioRef.current.volume = 0.6;
    }

    // Rewind and play — ignore errors (tab not focused, autoplay policy, etc.)
    const audio = audioRef.current;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return play;
}

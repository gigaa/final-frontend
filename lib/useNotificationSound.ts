import { useRef, useCallback, useEffect } from "react";

/**
 * Returns a play() function that plays /notification.wav.
 *
 * Browser autoplay policy: audio is blocked until the first user gesture.
 * We listen for the first click/keydown on the document and "unlock" the
 * Audio element by calling play()+pause() once — after that it works freely.
 */
export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // Create the Audio element once (client-side only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio("/notification.wav");
    audio.volume = 0.5;
    audio.preload = "auto";
    audioRef.current = audio;

    // Unlock on first user gesture
    const unlock = () => {
      if (unlockedRef.current) return;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          unlockedRef.current = true;
        })
        .catch(() => {});
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };

    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);

    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  return play;
}

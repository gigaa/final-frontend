'use client';

import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function VantaBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef     = useRef<AnyObj | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Load Three.js then Vanta from CDN
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js');
      } catch (e) {
        console.warn('Vanta CDN load failed', e);
        return;
      }

      if (cancelled || !containerRef.current) return;

      const w = window as AnyObj;
      const VantaNet = w.VANTA?.NET;
      if (!VantaNet) return;

      vantaRef.current = VantaNet({
        el:              containerRef.current,
        mouseControls:   true,
        touchControls:   true,
        gyroControls:    false,
        minHeight:       200,
        minWidth:        200,
        scale:           1.0,
        scaleMobile:     1.0,
        color:           0x3b82f6,   // electric blue lines
        backgroundColor: 0x0f0720,   // deep purple-black
        points:          10.0,
        maxDistance:     22.0,
        spacing:         18.0,
      });
    };

    init();

    return () => {
      cancelled = true;
      if (vantaRef.current?.destroy) {
        vantaRef.current.destroy();
        vantaRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}

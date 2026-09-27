'use client';

import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

export default function VantaBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef     = useRef<AnyObj | null>(null);

  useEffect(() => {
    // Scripts loaded via next/script beforeInteractive — poll until ready
    let attempts = 0;
    const MAX    = 40; // 4 seconds max

    const tryInit = () => {
      const w = window as AnyObj;

      if (!w.THREE || !w.VANTA?.NET) {
        if (++attempts < MAX) {
          setTimeout(tryInit, 100);
        }
        return;
      }

      if (!containerRef.current || vantaRef.current) return;

      vantaRef.current = w.VANTA.NET({
        el:              containerRef.current,
        THREE:           w.THREE,
        mouseControls:   true,
        touchControls:   true,
        gyroControls:    false,
        minHeight:       200,
        minWidth:        200,
        scale:           1.0,
        scaleMobile:     1.0,
        color:           0x3b82f6,
        backgroundColor: 0x0f0720,
        points:          10.0,
        maxDistance:     22.0,
        spacing:         18.0,
      });
    };

    tryInit();

    return () => {
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

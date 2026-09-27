'use client';

import { useEffect, useRef } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObject = Record<string, any>;

export default function VantaBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const vantaRef     = useRef<AnyObject | null>(null);

  useEffect(() => {
    let destroyed = false;

    const init = async () => {
      const THREE = await import('three');
      // vanta has no TS declarations — import with require via dynamic import trick
      const vantaModule = await import(
        /* webpackChunkName: "vanta-net" */
        'vanta/dist/vanta.net.min.js' as string
      ).catch(() => null);

      if (destroyed || !containerRef.current || !vantaModule) return;

      const VantaNet =
        (vantaModule as AnyObject).default ??
        (vantaModule as AnyObject).NET ??
        vantaModule;

      vantaRef.current = VantaNet({
        el:             containerRef.current,
        THREE,
        mouseControls:  true,
        touchControls:  true,
        gyroControls:   false,
        minHeight:      200,
        minWidth:       200,
        scale:          1.0,
        scaleMobile:    1.0,
        color:          0x3b82f6,   // electric blue lines
        backgroundColor: 0x0f0720, // deep purple-black
        points:         10.0,
        maxDistance:    22.0,
        spacing:        18.0,
      });
    };

    init();

    return () => {
      destroyed = true;
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

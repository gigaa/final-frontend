'use client';

import dynamic from 'next/dynamic';

const Lightfall = dynamic(() => import('./Lightfall'), { ssr: false });

export default function LightfallWrapper() {
  return (
    <Lightfall
      colors={['#A6C8FF', '#5227FF', '#FF9FFC']}
      backgroundColor="#0a0a2e"
      speed={0.5}
      streakCount={3}
      glow={1.2}
      density={0.6}
      mouseInteraction
    />
  );
}

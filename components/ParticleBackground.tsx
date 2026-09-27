'use client';

import dynamic from 'next/dynamic';

// AnimatedBackground uses canvas — SSR must be disabled
const AnimatedBackground = dynamic(
  () =>
    import('animated-backgrounds').then((mod) => mod.AnimatedBackground),
  { ssr: false },
);

export default function ParticleBackground() {
  return (
    <AnimatedBackground
      animationName="particleNetwork"
      interactive
      interactionConfig={{
        effect: 'attract',
        strength: 0.6,
        radius: 150,
        continuous: true,
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
      }}
    />
  );
}

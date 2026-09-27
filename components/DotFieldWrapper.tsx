'use client';

import dynamic from 'next/dynamic';

const DotField = dynamic(() => import('./DotField'), { ssr: false });

export default function DotFieldWrapper() {
  return (
    <DotField
      gradientFrom="rgba(127, 35, 254, 0.35)"
      gradientTo="rgba(168, 77, 252, 0.25)"
      dotRadius={4}
      dotSpacing={14}
      cursorRadius={500}
      cursorForce={0.10}
      bulgeOnly={true}
      bulgeStrength={67}
      glowRadius={160}
      sparkle={false}
      waveAmplitude={0}
      // dotRadius={4}
      // dotSpacing={14}
      // bulgeOnly
      // bulgeStrength={67}
      // glowRadius={160}
      glowColor="rgba(255, 255, 255, 0.1)"
    />
  );
}

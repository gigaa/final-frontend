'use client';

import dynamic from 'next/dynamic';

const DotField = dynamic(() => import('./DotField'), { ssr: false });

export default function DotFieldWrapper() {
  return (
    <DotField
      gradientFrom="rgba(168, 85, 247, 0.35)"
      gradientTo="rgba(147, 51, 234, 0.20)"
      dotRadius={2}
      dotSpacing={14}
      bulgeOnly
      bulgeStrength={67}
      glowRadius={160}
      glowColor="#0a1628"
    />
  );
}

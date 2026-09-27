'use client';

import dynamic from 'next/dynamic';

const DotField = dynamic(() => import('./DotField'), { ssr: false });

export default function DotFieldWrapper() {
  return (
    <DotField
      gradientFrom="rgba(6, 182, 212, 0.35)"
      gradientTo="rgba(8, 145, 178, 0.20)"
      dotRadius={2}
      dotSpacing={14}
      bulgeOnly
      bulgeStrength={67}
      glowRadius={160}
      glowColor="#0a1628"
    />
  );
}

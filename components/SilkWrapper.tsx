'use client';

import dynamic from 'next/dynamic';

const Silk = dynamic(() => import('./Silk'), { ssr: false });

export default function SilkWrapper() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Silk color="#06B6D4" speed={5} scale={1} noiseIntensity={1.5} />
    </div>
  );
}

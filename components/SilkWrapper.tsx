'use client';

import dynamic from 'next/dynamic';

const Silk = dynamic(() => import('./Silk'), { ssr: false });

export default function SilkWrapper() {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
      <Silk color="#8b73e9" speed={5} scale={1} noiseIntensity={1.5} rotation={5} />
    </div>
  );
}

import Script from 'next/script';
import VantaNet from '@/components/VantaBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-[#0f0720]">
      {/* 1. Load Three.js first, then Vanta NET */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js"
        strategy="beforeInteractive"
      />

      {/* 2. Animated canvas background */}
      <VantaNet />

      {/* 3. Subtle overlay for readability */}
      <div className="fixed inset-0 -z-10 bg-black/20" aria-hidden="true" />

      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}

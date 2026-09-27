import ParticleBackground from '@/components/ParticleBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-[#0a0a1a]">
      {/* Animated particle network background */}
      <ParticleBackground />

      {/* Content above the canvas */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </main>
  );
}

import VantaBackground from '@/components/VantaBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-[#0f0720]">
      {/* Animated Vanta NET background */}
      <VantaBackground />

      {/* Subtle overlay so card remains readable */}
      <div className="fixed inset-0 -z-10 bg-black/20" aria-hidden="true" />

      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}

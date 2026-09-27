import DotFieldWrapper from '@/components/DotFieldWrapper';
import LightfallWrapper from '@/components/LightfallWrapper';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-[#0a0a2e]">
      {/* Layer 1: DotField */}
      <DotFieldWrapper />
      {/* Layer 2: Lightfall on top */}
      <LightfallWrapper />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}

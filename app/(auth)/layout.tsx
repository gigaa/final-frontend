import SilkWrapper from '@/components/SilkWrapper';
import DotFieldWrapper from '@/components/DotFieldWrapper';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 bg-[#0a0a2e]">
      {/* Layer 1 (bottom): Silk animated waves */}
      <SilkWrapper />
      {/* Layer 2 (top): DotField dots over silk */}
      <DotFieldWrapper />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}

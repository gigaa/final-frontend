'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { authApi } from '@/lib/api';
import { Mail, Wand2, CheckCircle2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import axios from 'axios';

function PendingVerificationContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer after a successful resend
  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    try {
      await authApi.resendVerification(email);
      setSent(true);
      setCooldown(60);
      toast.success('Verification link sent!');
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Failed to resend. Try again.'
        : 'Failed to resend. Try again.';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const canResend = !sending && cooldown === 0;

  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-10 shadow-2xl">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 mb-5">
        <Mail size={32} className="text-violet-400" />
      </div>

      <h1 className="text-2xl font-bold text-white mb-3">
        Verify your email
      </h1>

      <p className="text-gray-300 text-sm leading-relaxed">
        Your account isn't verified yet. We sent a link to{' '}
        {email ? (
          <span className="text-violet-400 font-medium">{email}</span>
        ) : (
          'your email address'
        )}
        .
      </p>

      <p className="text-gray-500 text-xs mt-3">
        Click the link in that email to activate your account. Check your spam
        folder if you don't see it.
      </p>

      {/* Resend button */}
      <div className="mt-8">
        {sent && cooldown > 0 ? (
          <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
            <CheckCircle2 size={16} />
            <span>Sent! You can resend in {cooldown}s</span>
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={!canResend}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {sending ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Sending…
              </>
            ) : cooldown > 0 ? (
              `Resend in ${cooldown}s`
            ) : (
              'Resend verification link'
            )}
          </button>
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-800">
        <p className="text-gray-400 text-sm">
          Wrong account?{' '}
          <Link
            href="/login"
            className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
          >
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function PendingVerificationPage() {
  return (
    <div className="max-w-md mx-auto fade-in text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-2xl shadow-violet-600/40 mb-6">
        <Wand2 size={26} className="text-white" />
      </div>

      <Suspense
        fallback={
          <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-10 shadow-2xl">
            <Loader2 size={40} className="mx-auto text-violet-400 animate-spin" />
          </div>
        }
      >
        <PendingVerificationContent />
      </Suspense>
    </div>
  );
}

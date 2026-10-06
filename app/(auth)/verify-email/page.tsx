'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CheckCircle2, XCircle, Loader2, Wand2 } from 'lucide-react';
import Link from 'next/link';
import axios from 'axios';

type Status = 'loading' | 'success' | 'error';

// Separated so useSearchParams() is inside a Suspense boundary (Next.js requirement)
function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const hasRun = useRef(false);
  // Stable ref so the effect doesn't re-run when verifyEmail identity changes
  const verifyEmailRef = useRef(verifyEmail);
  verifyEmailRef.current = verifyEmail;

  useEffect(() => {
    // Prevent double-fire in React Strict Mode / remounts
    if (hasRun.current) return;
    hasRun.current = true;

    const token = searchParams.get('token');

    if (!token) {
      setErrorMessage('Verification link is missing a token.');
      setStatus('error');
      return;
    }

    verifyEmailRef.current(token).catch((err: unknown) => {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Verification failed. Please try again.'
        : 'Verification failed. Please try again.';
      setErrorMessage(message);
      setStatus('error');
    });
    // verifyEmail redirects on success — if we're still here, something failed
  // Only re-run if the token in the URL itself changes (e.g. user navigates to a new link)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-10 shadow-2xl">
      {status === 'loading' && (
        <>
          <Loader2
            size={48}
            className="mx-auto text-violet-400 animate-spin mb-4"
          />
          <h1 className="text-xl font-semibold text-white">
            Verifying your email…
          </h1>
          <p className="text-gray-400 text-sm mt-2">Just a moment.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
          <h1 className="text-xl font-semibold text-white">Email verified!</h1>
          <p className="text-gray-400 text-sm mt-2">
            Redirecting you to the gallery…
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <XCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h1 className="text-xl font-semibold text-white">
            Verification failed
          </h1>
          <p className="text-gray-400 text-sm mt-2">{errorMessage}</p>
          <div className="flex flex-col gap-2 mt-6">
            {errorMessage.toLowerCase().includes('already') ? (
              <Link
                href="/login"
                className="inline-block px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Go to Login
              </Link>
            ) : null}
            <Link
              href="/register"
              className="inline-block px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Back to Register
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="max-w-md mx-auto fade-in text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-2xl shadow-violet-600/40 mb-6">
        <Wand2 size={26} className="text-white" />
      </div>

      {/* Suspense required by Next.js when using useSearchParams() */}
      <Suspense
        fallback={
          <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-10 shadow-2xl">
            <Loader2
              size={48}
              className="mx-auto text-violet-400 animate-spin mb-4"
            />
            <p className="text-gray-400 text-sm">Loading…</p>
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}

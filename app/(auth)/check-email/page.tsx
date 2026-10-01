'use client';

import { Mail, Wand2 } from 'lucide-react';
import Link from 'next/link';

export default function CheckEmailPage() {
  return (
    <div className="max-w-md mx-auto fade-in text-center">
      {/* Logo */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-2xl shadow-violet-600/40 mb-6">
        <Wand2 size={26} className="text-white" />
      </div>

      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-10 shadow-2xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-600/20 border border-violet-500/30 mb-5">
          <Mail size={32} className="text-violet-400" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Check your email</h1>

        <p className="text-gray-300 text-sm leading-relaxed">
          We've sent you a verification link. Click it to activate your account
          and get started.
        </p>

        <p className="text-gray-500 text-xs mt-4">
          The link expires in 24 hours. Check your spam folder if you don't see
          it.
        </p>

        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            Already verified?{' '}
            <Link
              href="/login"
              className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

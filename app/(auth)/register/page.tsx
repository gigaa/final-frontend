'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Wand2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register(email, password, name);
      // AuthContext.register() redirects to /check-email on success
    } catch (err: unknown) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Registration failed'
        : 'Registration failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 shadow-2xl shadow-violet-600/40 mb-4">
          <Wand2 size={26} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create account</h1>
        <p className="text-gray-300 text-sm mt-1">Join PixelForge today</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-2xl p-8 shadow-2xl space-y-5"
      >
        <Input
          label="Name"
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(null); }}
          required
          autoComplete="new-password"
        />
        <Button
          type="submit"
          loading={loading}
          size="lg"
          className="w-full"
        >
          Create Account
        </Button>
      </form>

      {/* Error — fixed height slot so layout never shifts */}
      <div className="h-10 flex items-center justify-center mt-3">
        {error && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/25 border border-red-400/70 text-sm text-red-200 font-medium shadow-lg shadow-red-900/30">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-gray-300 mt-3">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

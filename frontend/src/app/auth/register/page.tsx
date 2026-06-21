'use client';

import { Suspense, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { LinkLogo } from '@/components/brand/LinkLogo';
import { AuthShell } from '@/components/auth/AuthShell';
import { normalizePhone } from '@/lib/presence';

const DUMMY_CODE = '0000';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerWithPhone } = useAuthStore();
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const nextPath = searchParams.get('next');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = normalizePhone(phone);
    if (digits.length < 7) {
      setError('Enter a valid mobile number');
      return;
    }

    if (displayName.trim().length < 2) {
      setError('Enter your name (at least 2 characters)');
      return;
    }

    setLoading(true);
    try {
      await registerWithPhone(digits, displayName.trim(), DUMMY_CODE);
      router.replace(nextPath && nextPath.startsWith('/') ? nextPath : '/chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-sm"
    >
      <div className="mb-8 flex flex-col items-center text-center">
        <LinkLogo size="lg" />
        <p className="auth-eyebrow mt-8">Create account</p>
        <h1 className="mt-3 text-[28px] font-light text-white">Profile info</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
          Add your name to finish setting up LinkChat.
        </p>
      </div>

      <form onSubmit={handleRegister} className="auth-card space-y-4 rounded-2xl p-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Mobile number</label>
          <input
            type="tel"
            placeholder="+971 50 123 4567"
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            inputMode="tel"
            autoComplete="tel"
            required
            className="auth-input"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">Display name</label>
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            required
            className="auth-input"
          />
        </div>

        <p className="text-center text-xs text-slate-400">
          Demo OTP <strong className="text-cyan-300">{DUMMY_CODE}</strong> is applied automatically
        </p>

        {error && <p className="auth-error">{error}</p>}

        <button type="submit" disabled={loading} className="auth-btn-primary">
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            'Next'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-violet-300 underline-offset-2 transition-colors hover:text-cyan-300 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell>
      <Suspense
        fallback={
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}

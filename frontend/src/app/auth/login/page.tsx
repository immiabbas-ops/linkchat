'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { LinkLogo } from '@/components/brand/LinkLogo';
import { AuthShell } from '@/components/auth/AuthShell';
import { normalizePhone } from '@/lib/presence';

const DUMMY_CODE = '0000';

export default function LoginPage() {
  const router = useRouter();
  const { checkPhone, loginWithPhone } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const digits = normalizePhone(phone);
    if (digits.length < 7) {
      setError('Enter a valid mobile number');
      return;
    }

    setLoading(true);
    try {
      const { registered } = await checkPhone(digits);

      if (!registered) {
        router.push(`/auth/register?phone=${encodeURIComponent(digits)}`);
        return;
      }

      await loginWithPhone(digits, DUMMY_CODE);
      router.replace('/chats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <LinkLogo size="lg" />
          <p className="auth-eyebrow mt-8">Sign in</p>
          <h1 className="mt-3 text-[28px] font-light text-white">Welcome back</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-300">
            Enter your mobile number. Demo OTP{' '}
            <strong className="font-semibold text-cyan-300">{DUMMY_CODE}</strong> is applied
            automatically.
          </p>
        </div>

        <form onSubmit={handleLogin} className="auth-card space-y-4 rounded-2xl p-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Mobile number</label>
            <input
              type="tel"
              placeholder="+971 50 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              autoComplete="tel"
              required
              className="auth-input"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" disabled={loading} className="auth-btn-primary">
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Agree and continue'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          New to LinkChat?{' '}
          <Link
            href="/auth/register"
            className="font-medium text-violet-300 underline-offset-2 transition-colors hover:text-cyan-300 hover:underline"
          >
            Create account
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}

'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { LinkLogo } from '@/components/brand/LinkLogo';
import { AuthShell } from '@/components/auth/AuthShell';

export default function WelcomePage() {
  return (
    <AuthShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex w-full max-w-md flex-col items-center text-center"
      >
        <p className="auth-eyebrow mb-6">Welcome</p>

        <LinkLogo size="lg" />

        <h1 className="mt-8 text-4xl font-light leading-tight sm:text-[2.75rem]">
          <span className="text-white">Real talks.</span>
          <br />
          <span className="auth-text-gradient font-normal">Smart services.</span>
        </h1>

        <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-slate-300">
          Chat, connect Telegram, and open Link Hub — taxi, trips, food, jobs, and more in one
          cosmic inbox.
        </p>

        <div className="auth-card mt-10 w-full rounded-2xl p-5">
          <div className="flex items-start gap-3 text-left">
            <div className="auth-onboard-icon shrink-0">
              <Sparkles className="h-7 w-7 text-violet-300" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-white">All in one app</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                Messaging, live connectors, and everyday services — designed with a calm nebula
                interface.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/auth/onboarding"
          className="auth-btn-primary mt-8 inline-flex gap-2 px-8"
        >
          Get started
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-6 text-sm text-slate-400">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-violet-300 underline-offset-2 transition-colors hover:text-cyan-300 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}

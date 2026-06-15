'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageCircle,
  Globe,
  Link2,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

const ONBOARDING_KEY = 'linkchat-onboarded';

const slides = [
  {
    icon: MessageCircle,
    title: 'Chat in real time',
    body: 'Private and group chats with voice notes, typing indicators, read receipts, and reactions — synced instantly.',
    accent: 'from-violet-500/40 to-purple-600/30',
  },
  {
    icon: Globe,
    title: 'One hub for life',
    body: 'Book a taxi, plan trips, find food nearby, browse jobs, news, and real estate — without leaving LinkChat.',
    accent: 'from-cyan-500/30 to-violet-600/30',
  },
  {
    icon: Link2,
    title: 'Link everywhere',
    body: 'Connect Telegram bots and more. External messages flow into your LinkChat inbox alongside your people.',
    accent: 'from-fuchsia-500/30 to-cyan-500/25',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const slide = slides[step];
  const Icon = slide.icon;
  const isLast = step === slides.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      /* ignore */
    }
    router.push('/auth/login');
  };

  const next = () => {
    if (isLast) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <AuthShell>
      <div className="flex w-full max-w-md flex-col">
        <div className="mb-8 flex items-center justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="auth-btn-ghost h-10 w-10 p-0"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : (
            <span className="w-10" />
          )}

          <button
            type="button"
            onClick={finish}
            className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
          >
            Skip
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <div className={`auth-onboard-icon mb-8 bg-gradient-to-br ${slide.accent}`}>
              <Icon className="h-9 w-9 text-white" strokeWidth={1.5} />
            </div>

            <p className="auth-eyebrow mb-3">
              Step {step + 1} of {slides.length}
            </p>

            <h1 className="text-[28px] font-light leading-snug text-white">{slide.title}</h1>

            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-slate-300">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-12 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`auth-dot ${i === step ? 'auth-dot-active' : ''}`}
              aria-hidden
            />
          ))}
        </div>

        <button type="button" onClick={next} className="auth-btn-primary mt-10 gap-2">
          {isLast ? 'Continue to sign in' : 'Next'}
          <ArrowRight className="h-4 w-4" />
        </button>

        {isLast && (
          <p className="mt-6 text-center text-sm text-slate-400">
            By continuing you agree to our{' '}
            <Link href="/" className="text-violet-300 hover:underline">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/" className="text-violet-300 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </div>
    </AuthShell>
  );
}

export { ONBOARDING_KEY };

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  MapPin,
  Briefcase,
  UtensilsCrossed,
  Users,
  Smartphone,
  ArrowRight,
  Newspaper,
  Home,
  Shield,
  Plane,
  Zap,
  Globe,
  Car,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { LinkLogo } from '@/components/brand/LinkLogo';
import { LandingAppDemo, LandingFeatureDemo } from '@/components/landing/LandingAppDemo';
import { GalaxyBackground } from '@/components/landing/GalaxyBackground';

const fadeUp = {
  initial: { opacity: 0, y: 32, filter: 'blur(6px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
};

const heroEase = [0.22, 1, 0.36, 1] as const;

const stats = [
  { value: 'Real-time', label: 'Secure messaging' },
  { value: '6+', label: 'Integrated services' },
  { value: 'Private', label: 'Groups & family' },
];

const pillars = [
  {
    title: 'Purpose-built messaging',
    body: 'Voice notes, read receipts, reactions, and presence — designed for clear, reliable conversation.',
    icon: MessageCircle,
  },
  {
    title: 'Services when you need them',
    body: 'Taxi, travel, food, jobs, news, and property — accessible without leaving your chat flow.',
    icon: Globe,
  },
  {
    title: 'Built for people you trust',
    body: 'Private chats, group spaces, and family tools with privacy controls at the core.',
    icon: Users,
  },
];

const howItWorks = [
  {
    step: '01',
    title: 'Sign in with your mobile',
    body: 'Quick OTP verification. Your profile and settings sync across every device.',
    demo: 'chat' as const,
  },
  {
    step: '02',
    title: 'Message with confidence',
    body: 'One-to-one and group chats with voice, media, and real-time delivery — professional and personal.',
    demo: 'chat' as const,
  },
  {
    step: '03',
    title: 'Organize in groups',
    body: 'Create dedicated spaces for teams, friends, and family with clear roles and controls.',
    demo: 'groups' as const,
  },
  {
    step: '04',
    title: 'Access everyday services',
    body: 'Book rides, plan trips, find food, and browse listings — integrated alongside your conversations.',
    demo: 'services' as const,
  },
];

const serviceItems = [
  { icon: Car, label: 'Taxi', desc: 'Book rides nearby', color: 'from-amber-400/90 to-orange-500/90' },
  { icon: Plane, label: 'Trip', desc: 'Flights & hotels', color: 'from-sky-400/90 to-cyan-500/90' },
  { icon: UtensilsCrossed, label: 'Food', desc: 'Restaurants near you', color: 'from-orange-400/90 to-rose-500/90' },
  { icon: Briefcase, label: 'Jobs', desc: 'Curated listings', color: 'from-blue-400/90 to-indigo-500/90' },
  { icon: Home, label: 'Real Estate', desc: 'Properties nearby', color: 'from-emerald-400/90 to-teal-500/90' },
  { icon: Newspaper, label: 'News', desc: 'Headlines & feeds', color: 'from-purple-400/90 to-fuchsia-500/90' },
];

const trustPoints = [
  'Encrypted message transport',
  'OTP mobile sign-in',
  'Device management',
  'No ads in chat',
];

export function LandingPage() {
  return (
    <div className="landing-root landing-page">
      <GalaxyBackground />

      <div className="relative z-10">
        <header className="landing-nav sticky top-0 z-50">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
            <Link href="/" className="landing-logo-text flex items-center gap-2">
              <LinkLogo size="sm" showText />
            </Link>
            <nav className="hidden items-center gap-8 text-sm font-medium text-slate-400 md:flex">
              <a href="#how" className="transition-colors hover:text-white">
                How it works
              </a>
              <a href="#services" className="transition-colors hover:text-white">
                Services
              </a>
              <a href="#features" className="transition-colors hover:text-white">
                Features
              </a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/auth/login"
                className="hidden rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                href="/auth/welcome"
                className="landing-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <section className="landing-hero-cinematic px-4 sm:px-6">
          <div className="landing-hero-glow" />

          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 py-20 lg:grid-cols-2 lg:gap-16 lg:py-0">
            <div className="text-center lg:text-left">
              <motion.p
                initial={{ opacity: 0, letterSpacing: '0.5em' }}
                animate={{ opacity: 1, letterSpacing: '0.22em' }}
                transition={{ duration: 1.2, ease: heroEase }}
                className="landing-eyebrow mb-6"
              >
                Modern communication platform
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8, ease: heroEase }}
                className="mb-8 flex justify-center lg:justify-start"
              >
                <span className="landing-badge">
                  <span className="landing-badge-dot" />
                  Secure messaging · Integrated services
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 48, filter: 'blur(12px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.35, duration: 1.1, ease: heroEase }}
                className="landing-cinematic-title text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-[3.25rem]"
              >
                Messaging that feels{' '}
                <span className="landing-text-accent">effortless.</span>
                <br />
                <span className="font-light text-slate-200/90">Services that stay close.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.9, ease: heroEase }}
                className="landing-cinematic-sub mx-auto mt-7 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg lg:mx-0"
              >
                LinkChat brings real-time conversation, group collaboration, and everyday tools into
                one refined experience — private by design, polished in every detail.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.72, duration: 0.8, ease: heroEase }}
                className="mt-10 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
              >
                <Link
                  href="/auth/welcome"
                  className="landing-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-base font-semibold"
                >
                  Get started free
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#how"
                  className="landing-btn-ghost inline-flex items-center justify-center rounded-full px-8 py-3.5 text-base font-medium"
                >
                  See how it works
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 1 }}
                className="landing-stats-bar mt-14 grid grid-cols-3 divide-x divide-white/10 rounded-2xl"
              >
                {stats.map(({ value, label }) => (
                  <div key={label} className="px-4 py-5 text-center lg:px-6 lg:text-left">
                    <p className="landing-stat-value text-lg font-bold sm:text-xl">{value}</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:text-xs">
                      {label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.5, duration: 1.2, ease: heroEase }}
              className="landing-float flex justify-center lg:justify-end"
            >
              <div className="landing-image-frame p-1">
                <LandingAppDemo />
              </div>
            </motion.div>
          </div>

          <a href="#how" className="landing-scroll-cue hidden sm:flex">
            <span>Scroll</span>
            <span className="landing-scroll-cue-line" />
          </a>
        </section>

        <section id="how" className="landing-section-muted px-4 py-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div {...fadeUp} className="text-center">
              <p className="landing-eyebrow">How it works</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                From sign-in to everyday use
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-slate-400">
                A clear path from your first message to the tools you rely on — shown in the same
                interface you will use in the app.
              </p>
            </motion.div>

            <div className="mt-20 space-y-24">
              {howItWorks.map(({ step, title, body, demo }, i) => (
                <motion.div
                  key={step}
                  {...fadeUp}
                  transition={{ delay: i * 0.06, duration: 0.8, ease: heroEase }}
                  className={`flex flex-col items-center gap-12 lg:flex-row lg:gap-16 ${
                    i % 2 === 1 ? 'lg:flex-row-reverse' : ''
                  }`}
                >
                  <div className="flex-1 text-center lg:text-left">
                    <div className="mb-4 flex items-center justify-center gap-3 lg:justify-start">
                      <span className="text-xs font-bold tracking-widest text-violet-400">{step}</span>
                      <span className="landing-step-line hidden sm:block" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white sm:text-3xl">{title}</h3>
                    <p className="mt-4 max-w-lg leading-relaxed text-slate-400">{body}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="landing-image-frame p-1">
                      <LandingFeatureDemo variant={demo} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="px-4 py-28 sm:px-6">
          <motion.div {...fadeUp} className="mx-auto max-w-6xl text-center">
            <p className="landing-eyebrow">Integrated services</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Everyday tools, one tap away
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">
              Travel, dining, work, and local discovery — available alongside your conversations,
              without switching apps.
            </p>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ delay: 0.08, duration: 0.8 }}
            className="mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {serviceItems.map(({ icon: Icon, label, desc, color }) => (
              <div key={label} className="landing-card group rounded-2xl p-6 text-left">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${color} shadow-lg shadow-black/30 transition-transform duration-300 group-hover:scale-110`}
                >
                  <Icon className="h-6 w-6 text-white" strokeWidth={1.75} />
                </div>
                <p className="font-semibold text-white">{label}</p>
                <p className="mt-1 text-sm landing-subtle">{desc}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <section id="features" className="landing-section-muted px-4 py-28 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <motion.p {...fadeUp} className="landing-eyebrow text-center">
              Why LinkChat
            </motion.p>
            <motion.h2
              {...fadeUp}
              transition={{ delay: 0.04, duration: 0.8 }}
              className="mt-4 text-center text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            >
              Built for connection.{' '}
              <span className="text-slate-400">Designed with care.</span>
            </motion.h2>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {pillars.map(({ title, body, icon: Icon }, i) => (
                <motion.article
                  key={title}
                  {...fadeUp}
                  transition={{ delay: i * 0.06, duration: 0.8 }}
                  className="landing-card rounded-2xl p-8"
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20">
                    <Icon className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{body}</p>
                </motion.article>
              ))}
            </div>

            <motion.div
              {...fadeUp}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="landing-card mx-auto mt-8 max-w-3xl rounded-2xl p-6 sm:p-8"
            >
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-white">Privacy & security by design</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {trustPoints.map((point) => (
                      <li key={point} className="flex items-center gap-2 text-sm text-slate-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="border-y border-white/10 px-4 py-14 sm:px-6">
          <motion.div
            {...fadeUp}
            className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm text-slate-400"
          >
            <span className="inline-flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-cyan-400" />
              Web & PWA ready
            </span>
            <span className="inline-flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              Real-time messaging
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-400" />
              Location-aware services
            </span>
            <span className="inline-flex items-center gap-2">
              <Lock className="h-4 w-4 text-violet-400" />
              Private by default
            </span>
          </motion.div>
        </section>

        <section className="px-4 py-28 sm:px-6">
          <motion.div
            {...fadeUp}
            className="landing-cta-panel relative mx-auto max-w-4xl rounded-3xl px-6 py-16 text-center sm:px-12"
          >
            <p className="landing-eyebrow relative">Get started</p>
            <h2 className="relative mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">
              Ready when you are
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-slate-400">
              Sign in with your mobile number, connect with the people that matter, and keep
              everyday tools within reach — free to start.
            </p>
            <Link
              href="/auth/welcome"
              className="landing-btn-primary relative mt-10 inline-flex items-center gap-2 rounded-full px-10 py-4 text-base font-semibold"
            >
              Create your account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </motion.div>
        </section>

        <footer className="landing-footer px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2">
                <LinkLogo size="sm" showText />
                <p className="landing-footer-desc mt-4 max-w-xs text-sm leading-relaxed">
                  A modern platform for messaging, groups, and integrated services — refined,
                  private, and built for everyday life.
                </p>
              </div>
              <div>
                <p className="landing-footer-heading text-xs font-semibold uppercase tracking-wider">
                  Product
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>
                    <a href="#how" className="landing-footer-link">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#services" className="landing-footer-link">
                      Services
                    </a>
                  </li>
                  <li>
                    <a href="#features" className="landing-footer-link">
                      Features
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <p className="landing-footer-heading text-xs font-semibold uppercase tracking-wider">
                  Account
                </p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li>
                    <Link href="/auth/welcome" className="landing-footer-link">
                      Get started
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/login" className="landing-footer-link">
                      Sign in
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
              <p className="landing-footer-copy text-xs">
                © {new Date().getFullYear()} LinkChat. All rights reserved.
              </p>
              <p className="landing-footer-copy text-xs">
                Communication and services, thoughtfully unified.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

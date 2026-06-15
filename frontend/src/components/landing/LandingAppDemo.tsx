'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  Car,
  Plane,
  Send,
  UtensilsCrossed,
  Users,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type DemoId = 'chat' | 'services' | 'groups';

const demos: { id: DemoId; label: string }[] = [
  { id: 'chat', label: 'Messaging' },
  { id: 'services', label: 'Services' },
  { id: 'groups', label: 'Groups' },
];

function PhoneShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto w-[280px] sm:w-[300px]">
      <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-violet-600/30 via-slate-800/20 to-cyan-500/25 blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#0B1026] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-center gap-1.5 border-b border-white/10 bg-black/30 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="mx-auto text-[10px] font-medium tracking-wide text-white/50">LinkChat</span>
        </div>
        {children}
        <div className="flex justify-around border-t border-white/10 bg-black/40 px-2 py-2.5">
          {['Chats', 'Discover', 'Settings'].map((tab, i) => (
            <span
              key={tab}
              className={cn(
                'text-[9px] font-medium',
                i === 0 ? 'text-cyan-400' : 'text-white/40',
              )}
            >
              {tab}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatDemo() {
  const messages = [
    { from: 'them', text: 'Can you review the proposal before 3pm?', delay: 0 },
    { from: 'me', text: 'On it — sending notes shortly.', delay: 0.8 },
    { from: 'them', text: 'Thanks. Voice note attached.', delay: 1.6 },
    { from: 'me', text: 'Received. Looks good to go.', delay: 2.4 },
  ];

  return (
    <div className="flex h-[420px] flex-col bg-gradient-to-b from-[#12162E] to-[#0B1026]">
      <div className="bg-gradient-to-r from-slate-800 to-violet-900 px-4 py-3">
        <p className="text-sm font-semibold text-white">Alex Morgan</p>
        <p className="text-[10px] text-violet-200/80">online</p>
      </div>
      <div className="flex-1 space-y-2 overflow-hidden p-3">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: m.delay, duration: 0.35 }}
            className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[78%] rounded-2xl px-3 py-2 text-[11px] leading-snug',
                m.from === 'me'
                  ? 'rounded-tr-sm bg-violet-600/90 text-white'
                  : 'rounded-tl-sm bg-white/10 text-white/90',
              )}
            >
              {m.text}
            </div>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ delay: 3.2, duration: 2, repeat: Infinity, repeatDelay: 2 }}
          className="flex justify-start"
        >
          <div className="rounded-2xl rounded-tl-sm bg-white/10 px-3 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((d) => (
                <motion.span
                  key={d}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                  className="h-1.5 w-1.5 rounded-full bg-cyan-400"
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>
      <div className="flex items-center gap-2 border-t border-white/10 bg-black/30 px-3 py-2">
        <div className="flex-1 rounded-full bg-white/10 px-3 py-2 text-[10px] text-white/40">
          Write a message…
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-violet-600">
          <Send className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    </div>
  );
}

function ServicesDemo() {
  const tiles = [
    { icon: Car, label: 'Taxi', color: 'from-amber-400 to-orange-500', delay: 0.2 },
    { icon: Plane, label: 'Trip', color: 'from-sky-400 to-cyan-500', delay: 0.5 },
    { icon: UtensilsCrossed, label: 'Food', color: 'from-orange-400 to-red-500', delay: 0.8 },
    { icon: Briefcase, label: 'Jobs', color: 'from-blue-400 to-indigo-500', delay: 1.1 },
  ];

  return (
    <div className="h-[420px] bg-gradient-to-b from-[#12162E] to-[#0B1026] p-4">
      <p className="mb-1 text-sm font-semibold text-white">Discover</p>
      <p className="mb-4 text-[10px] text-white/50">Everyday tools in one place</p>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(({ icon: Icon, label, color, delay }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, type: 'spring', stiffness: 200 }}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div
              className={cn(
                'mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br',
                color,
              )}
            >
              <Icon className="h-4 w-4 text-white" />
            </div>
            <p className="text-[11px] font-medium text-white">{label}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4 }}
        className="mt-3 rounded-xl border border-violet-500/25 bg-violet-500/10 px-3 py-2"
      >
        <p className="text-[10px] text-violet-200">Trip to Dubai · Confirmed for Friday</p>
      </motion.div>
    </div>
  );
}

function GroupsDemo() {
  const members = [
    { name: 'Family', count: '5 members', delay: 0.2 },
    { name: 'Product team', count: '12 members', delay: 0.5 },
    { name: 'Weekend plans', count: '8 members', delay: 0.8 },
  ];

  return (
    <div className="h-[420px] bg-gradient-to-b from-[#12162E] to-[#0B1026] p-4">
      <p className="mb-1 text-sm font-semibold text-white">Groups</p>
      <p className="mb-4 text-[10px] text-white/50">Private spaces for teams & family</p>
      {members.map(({ name, count, delay }) => (
        <motion.div
          key={name}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay }}
          className="mb-2 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-white">{name}</p>
            <p className="text-[9px] text-white/50">{count}</p>
          </div>
          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[9px] text-cyan-300">Active</span>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
      >
        <Shield className="h-4 w-4 shrink-0 text-violet-300" />
        <p className="text-[10px] leading-snug text-white/70">End-to-end transport · Read receipts · Admin controls</p>
      </motion.div>
    </div>
  );
}

function DemoScene({ id }: { id: DemoId }) {
  switch (id) {
    case 'services':
      return <ServicesDemo />;
    case 'groups':
      return <GroupsDemo />;
    default:
      return <ChatDemo />;
  }
}

export function LandingAppDemo({ className }: { className?: string }) {
  const [active, setActive] = useState<DemoId>('chat');

  useEffect(() => {
    const order: DemoId[] = ['chat', 'services', 'groups'];
    let i = 0;
    const timer = setInterval(() => {
      i = (i + 1) % order.length;
      setActive(order[i]);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={className}>
      <PhoneShell>
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.35 }}
          >
            <DemoScene id={active} />
          </motion.div>
        </AnimatePresence>
      </PhoneShell>
      <div className="mt-5 flex justify-center gap-2">
        {demos.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActive(id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[11px] font-medium transition-all',
              active === id
                ? 'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg shadow-violet-900/30'
                : 'bg-white/10 text-white/60 hover:bg-white/15',
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function LandingFeatureDemo({ variant }: { variant: DemoId }) {
  return (
    <PhoneShell>
      <DemoScene id={variant} />
    </PhoneShell>
  );
}

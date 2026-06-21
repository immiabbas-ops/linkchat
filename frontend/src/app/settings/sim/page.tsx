'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Radio, Shield, Smartphone, Wifi } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuthStore } from '@/store/auth-store';
import { useSimStore } from '@/store/sim-store';
import { formatPhoneDisplay, normalizePhone } from '@/lib/presence';

const CARRIERS = ['Etisalat', 'du', 'Virgin Mobile', 'Other'];

export default function SimActivationPage() {
  const { user } = useAuthStore();
  const { loading, activated, activation, fetchStatus, requestActivation, verifyActivation, updateSettings, deactivate } =
    useSimStore();
  const [phone, setPhone] = useState('');
  const [carrier, setCarrier] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'intro' | 'verify' | 'active'>('intro');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (user?.profile?.phone) setPhone(user.profile.phone);
  }, [user?.profile?.phone]);

  useEffect(() => {
    if (activated && activation) setStep('active');
  }, [activated, activation]);

  const startActivation = async () => {
    setError('');
    const digits = normalizePhone(phone);
    if (digits.length < 7) {
      setError('Enter a valid SIM mobile number');
      return;
    }
    setBusy(true);
    try {
      await requestActivation(phone, carrier || undefined);
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start activation');
    } finally {
      setBusy(false);
    }
  };

  const confirmCode = async () => {
    setError('');
    setBusy(true);
    try {
      await verifyActivation(phone, code.trim());
      setStep('active');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)]">
        <header className="safe-top flex items-center gap-3 border-b border-[var(--border-glass)] px-2 py-3">
          <Link href="/settings" className="rounded-full p-2 hover:bg-black/[0.05]">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">SIM Activation</h1>
            <p className="text-xs text-[var(--text-secondary)]">One phone — LinkChat & carrier SMS</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && !activation ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : step === 'active' && activation ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-6 ring-1 ring-emerald-500/20">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20">
                  <Radio className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="text-lg font-semibold text-[var(--text-primary)]">SIM active</p>
                <p className="mt-1 text-2xl font-bold text-[var(--accent-dark)]">
                  {formatPhoneDisplay(activation.phone)}
                </p>
                {activation.carrier && (
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{activation.carrier}</p>
                )}
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Receive and send carrier text messages inside LinkChat — no second phone needed.
                </p>
              </div>

              <div className="rounded-2xl bg-[var(--bg-panel)] ring-1 ring-[var(--border-glass)]">
                {[
                  {
                    key: 'receiveEnabled' as const,
                    label: 'Receive SMS',
                    desc: 'Incoming texts appear in your chats',
                    icon: MessageSquare,
                  },
                  {
                    key: 'sendEnabled' as const,
                    label: 'Send SMS',
                    desc: 'Send carrier texts from LinkChat',
                    icon: Smartphone,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const on = activation[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => void updateSettings({ [item.key]: !on })}
                      className="flex w-full items-center gap-4 border-b border-[var(--border-glass)] px-4 py-4 text-left last:border-0"
                    >
                      <Icon className="h-5 w-5 text-[var(--accent-dark)]" />
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{item.label}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
                      </div>
                      <div className={`h-7 w-12 rounded-full p-0.5 ${on ? 'bg-[var(--accent)]' : 'bg-[var(--search-bg)]'}`}>
                        <div className={`h-6 w-6 rounded-full bg-white shadow transition ${on ? 'translate-x-5' : ''}`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl bg-[var(--search-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                <p className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                  <Wifi className="h-4 w-4" />
                  How it works
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>SMS threads appear in Chats with an <strong>SMS</strong> badge</li>
                  <li>On this device, LinkChat relays texts through your SIM (device bridge)</li>
                  <li>With Twilio configured, texts route through the cloud number</li>
                </ul>
              </div>

              <button
                type="button"
                onClick={() => void deactivate()}
                className="w-full rounded-full border border-[var(--danger)]/30 py-3 text-sm font-medium text-[var(--danger)]"
              >
                Deactivate SIM
              </button>
            </div>
          ) : step === 'verify' ? (
            <div className="mx-auto max-w-md space-y-4">
              <div className="rounded-2xl bg-[var(--bg-panel)] p-6 ring-1 ring-[var(--border-glass)]">
                <h2 className="text-lg font-semibold">Verify your SIM</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Enter the code sent to {formatPhoneDisplay(phone)}. Demo code: <strong>0000</strong>
                </p>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Verification code"
                  inputMode="numeric"
                  className="mt-4 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
                {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmCode()}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] font-medium text-white disabled:opacity-60"
                >
                  Activate SIM
                </button>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-md space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-[var(--accent)]/15 to-cyan-500/10 p-6">
                <Shield className="mb-3 h-8 w-8 text-[var(--accent-dark)]" />
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">Use one phone for everything</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                  Activate your SIM in LinkChat to read and reply to regular carrier SMS in the same app as your
                  LinkChat messages — like having WhatsApp and Messages in one place.
                </p>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[var(--text-primary)]">SIM mobile number</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  type="tel"
                  placeholder="+971 50 123 4567"
                  className="mt-2 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[var(--text-primary)]">Carrier (optional)</span>
                <select
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                >
                  <option value="">Select carrier</option>
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

              <button
                type="button"
                disabled={busy}
                onClick={() => void startActivation()}
                className="flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent-dark)] font-medium text-white disabled:opacity-60"
              >
                Continue — verify SIM
              </button>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

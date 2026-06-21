'use client';

import { useState } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSimStore } from '@/store/sim-store';
import { useChatStore } from '@/store/chat-store';
import { normalizePhone } from '@/lib/presence';

export function NewSmsButton() {
  const router = useRouter();
  const { sendSms } = useSimStore();
  const { fetchChats } = useChatStore();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setError('');
    if (normalizePhone(to).length < 7) {
      setError('Enter a valid number');
      return;
    }
    if (!body.trim()) {
      setError('Enter a message');
      return;
    }
    setSending(true);
    try {
      const { chatId } = await sendSms(to, body.trim());
      await fetchChats();
      setOpen(false);
      setTo('');
      setBody('');
      router.push(`/chats/${chatId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send SMS');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm"
      >
        <MessageSquarePlus className="h-4 w-4" />
        New SMS
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-[var(--list-bg)] p-5 shadow-xl">
            <h3 className="text-lg font-semibold">New carrier SMS</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Sends via your activated SIM</p>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Recipient number"
              inputMode="tel"
              className="mt-4 w-full rounded-xl bg-[var(--search-bg)] px-4 py-3 focus:outline-none"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Text message"
              rows={3}
              className="mt-3 w-full resize-none rounded-xl bg-[var(--search-bg)] px-4 py-3 focus:outline-none"
            />
            {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full py-2.5 text-sm text-[var(--text-secondary)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => void submit()}
                className="flex-1 rounded-full bg-[var(--accent)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

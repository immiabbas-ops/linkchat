'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Mail,
  MessageCircle,
  Network,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  connectorDisplayId,
  FREE_CONNECTORS,
  openConnector,
  type FreeConnectorId,
} from '@/lib/connectors';
import { useConnectorStore } from '@/store/connector-store';
import type { ChatConnector, ConnectorType } from '@/types';

const connectorIcons: Record<FreeConnectorId, typeof MessageCircle> = {
  linkchat: MessageCircle,
  telegram: Send,
  email: Mail,
  discord: MessageCircle,
  matrix: Network,
};

function ConnectModal({
  providerId,
  onClose,
}: {
  providerId: FreeConnectorId;
  onClose: () => void;
}) {
  const provider = FREE_CONNECTORS.find((p) => p.id === providerId)!;
  const isTelegram = providerId === 'telegram';
  const { addConnector } = useConnectorStore();
  const [label, setLabel] = useState(isTelegram ? 'My Telegram bot' : '');
  const [identifier, setIdentifier] = useState('');
  const [botToken, setBotToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!provider.apiType) return;

    if (isTelegram) {
      if (!botToken.trim()) {
        setError('Paste your bot token from @BotFather');
        return;
      }
    } else if (!label.trim() || !identifier.trim()) {
      setError('Fill in both fields');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await addConnector({
        type: provider.apiType as ConnectorType,
        label: label.trim() || 'Telegram bot',
        identifier: isTelegram ? undefined : identifier.trim(),
        config: isTelegram ? { botToken: botToken.trim() } : undefined,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-[var(--list-bg)] p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Connect {provider.name}</h3>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">{provider.hint}</p>
        {isTelegram && (
          <ol className="mb-4 list-decimal space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
            <li>Open Telegram → search @BotFather</li>
            <li>Send /newbot and follow the steps</li>
            <li>Copy the HTTP API token and paste it below</li>
            <li>Share t.me/your_bot with contacts so they can message you</li>
          </ol>
        )}
        <div className="space-y-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isTelegram ? 'Bot label (optional)' : 'Display name (e.g. Work email)'}
            className="w-full rounded-xl bg-[var(--search-bg)] px-4 py-3 text-sm focus:outline-none"
          />
          {isTelegram ? (
            <input
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:ABCdefGHI..."
              className="w-full rounded-xl bg-[var(--search-bg)] px-4 py-3 font-mono text-sm focus:outline-none"
            />
          ) : (
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={provider.placeholder}
              className="w-full rounded-xl bg-[var(--search-bg)] px-4 py-3 text-sm focus:outline-none"
            />
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full rounded-xl bg-[var(--accent-dark)] py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Connecting…' : isTelegram ? 'Connect live bot' : 'Save connection'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TelegramConnectorRow({
  connector,
  onRemove,
}: {
  connector: ChatConnector;
  onRemove: () => void;
}) {
  const botUsername = connector.config?.botUsername || connector.identifier;

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1 rounded-lg px-2 py-1.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{connector.label}</p>
          <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-700">
            Live
          </span>
        </div>
        <p className="truncate text-xs text-[var(--text-secondary)]">@{botUsername}</p>
        <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
          Share{' '}
          <a
            href={`https://t.me/${botUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--accent-dark)]"
          >
            t.me/{botUsername}
          </a>{' '}
          — messages appear in LinkChat → Chats
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500"
        aria-label="Remove"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LinkChatsPanel() {
  const { connectors, fetchConnectors, removeConnector, isLoading } = useConnectorStore();
  const [connecting, setConnecting] = useState<FreeConnectorId | null>(null);

  useEffect(() => {
    fetchConnectors();
  }, [fetchConnectors]);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-4 scrollbar-hide">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Always available
      </p>
      <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">LinkChat</h3>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                <Check className="h-3 w-3" />
                Connected
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">Native real-time messaging</p>
          </div>
          <Link
            href="/chats"
            className="flex items-center gap-1 rounded-lg bg-[var(--accent-dark)] px-3 py-2 text-xs font-medium text-white"
          >
            Open
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--text-secondary)]">
        Free to connect
      </p>
      <div className="mb-6 grid gap-3">
        {FREE_CONNECTORS.filter((p) => p.id !== 'linkchat').map((provider) => {
          const Icon = connectorIcons[provider.id];
          const linked = connectors.filter((c) => c.type === provider.apiType);
          const isTelegram = provider.id === 'telegram';

          return (
            <div key={provider.id} className="rounded-2xl border border-[var(--border-glass)] bg-[var(--search-bg)] p-4">
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
                    provider.color,
                  )}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{provider.name}</h3>
                  <p className="text-xs text-[var(--text-secondary)]">{provider.description}</p>
                  <button
                    type="button"
                    onClick={() => setConnecting(provider.id)}
                    className="mt-2 text-xs font-medium text-[var(--accent-dark)]"
                  >
                    + Add connection
                  </button>
                </div>
              </div>

              {linked.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-black/5 pt-3">
                  {linked.map((c) =>
                    isTelegram ? (
                      <TelegramConnectorRow
                        key={c.id}
                        connector={c}
                        onRemove={() => removeConnector(c.id)}
                      />
                    ) : (
                      <div key={c.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openConnector(c)}
                          className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-left hover:bg-black/[0.04]"
                        >
                          <p className="truncate text-sm font-medium">{c.label}</p>
                          <p className="truncate text-xs text-[var(--text-secondary)]">
                            {connectorDisplayId(c)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeConnector(c.id)}
                          className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-red-500/10 hover:text-red-500"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="rounded-xl border border-[var(--border-glass)] bg-[var(--search-bg)] px-4 py-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        Connect supported messaging apps to receive external messages in your LinkChat inbox.
      </p>

      {isLoading && (
        <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">Loading connections…</p>
      )}

      {connecting && (
        <ConnectModal providerId={connecting} onClose={() => setConnecting(null)} />
      )}
    </div>
  );
}

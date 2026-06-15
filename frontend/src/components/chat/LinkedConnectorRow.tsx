'use client';

import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { connectorDisplayId, getConnectorProvider, openConnector } from '@/lib/connectors';
import type { ChatConnector } from '@/types';

export function LinkedConnectorRow({ connector }: { connector: ChatConnector }) {
  const provider = getConnectorProvider(connector.type);
  const badge = provider?.name ?? connector.type;

  return (
    <motion.button
      type="button"
      whileTap={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
      onClick={() => openConnector(connector)}
      className="flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white',
          provider?.color ?? 'from-gray-400 to-gray-500',
        )}
      >
        {badge.slice(0, 1)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[17px] text-[var(--text-primary)]">{connector.label}</h3>
          <span className="shrink-0 rounded bg-black/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
            {badge}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[14px] text-[var(--text-secondary)]">
          {connectorDisplayId(connector)}
        </p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
    </motion.button>
  );
}

'use client';

import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HubServiceMeta {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  iconClass: string;
}

interface HubServiceHeaderProps {
  service: HubServiceMeta;
  onBack: () => void;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function HubServiceHeader({ service, onBack, subtitle, actions }: HubServiceHeaderProps) {
  const Icon = service.icon;

  return (
    <header className="safe-top wa-header shrink-0 shadow-sm">
      <div className="flex items-center gap-1 px-1 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Back to Hub"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-3 px-1">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-sm',
              service.iconClass,
            )}
          >
            <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-[16px] font-normal">{service.label}</h2>
            <p className="truncate text-[13px] opacity-80">{subtitle || service.desc}</p>
          </div>
        </div>
        {actions}
      </div>
    </header>
  );
}

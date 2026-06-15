'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  Home,
  Briefcase,
  UtensilsCrossed,
  Newspaper,
  ChevronRight,
  Link2,
  Plane,
  Search,
  X,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { FoodPanel } from '@/components/hub/FoodPanel';
import { JobsPanel } from '@/components/hub/JobsPanel';
import { LinkChatsPanel } from '@/components/hub/LinkChatsPanel';
import { NewsPanel } from '@/components/hub/NewsPanel';
import { RealEstatePanel } from '@/components/hub/RealEstatePanel';
import { TaxiPanel } from '@/components/hub/TaxiPanel';
import { TripPanel } from '@/components/hub/TripPanel';
import { HubServiceHeader, type HubServiceMeta } from '@/components/hub/HubServiceHeader';
import { cn } from '@/lib/utils';

const services: HubServiceMeta[] = [
  {
    id: 'taxi',
    label: 'Taxi',
    icon: Car,
    iconClass: 'bg-gradient-to-br from-amber-500 to-orange-600',
    desc: 'Request a ride to your destination',
  },
  {
    id: 'trip',
    label: 'Trip',
    icon: Plane,
    iconClass: 'bg-gradient-to-br from-sky-500 to-cyan-600',
    desc: 'Flights, hotels, and travel planning',
  },
  {
    id: 'food',
    label: 'Food',
    icon: UtensilsCrossed,
    iconClass: 'bg-gradient-to-br from-orange-500 to-rose-600',
    desc: 'Restaurants and cafés near you',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: Briefcase,
    iconClass: 'bg-gradient-to-br from-blue-500 to-indigo-600',
    desc: 'Remote and on-site opportunities',
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    icon: Home,
    iconClass: 'bg-gradient-to-br from-emerald-500 to-teal-600',
    desc: 'Properties and agents nearby',
  },
  {
    id: 'news',
    label: 'News',
    icon: Newspaper,
    iconClass: 'bg-gradient-to-br from-violet-500 to-fuchsia-600',
    desc: 'Headlines and live feeds',
  },
  {
    id: 'linkchats',
    label: 'Connections',
    icon: Link2,
    iconClass: 'bg-gradient-to-br from-[var(--accent)] to-[var(--accent-cyan)]',
    desc: 'Link external apps to your inbox',
  },
];

const sections: { title: string; ids: string[] }[] = [
  { title: 'Mobility', ids: ['taxi', 'trip'] },
  { title: 'Local', ids: ['food', 'jobs', 'realestate', 'news'] },
  { title: 'Integrations', ids: ['linkchats'] },
];

function ServicePanel({ serviceId }: { serviceId: string }) {
  switch (serviceId) {
    case 'linkchats':
      return <LinkChatsPanel />;
    case 'food':
      return <FoodPanel />;
    case 'jobs':
      return <JobsPanel />;
    case 'news':
      return <NewsPanel />;
    case 'realestate':
      return <RealEstatePanel />;
    case 'taxi':
      return <TaxiPanel />;
    case 'trip':
      return <TripPanel />;
    default:
      return null;
  }
}

function ServiceRow({
  service,
  onSelect,
}: {
  service: HubServiceMeta;
  onSelect: () => void;
}) {
  const Icon = service.icon;

  return (
    <motion.button
      type="button"
      whileTap={{ backgroundColor: 'rgba(0,0,0,0.04)' }}
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-black/[0.03]"
    >
      <div
        className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm',
          service.iconClass,
        )}
      >
        <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[16px] font-medium text-[var(--text-primary)]">{service.label}</h3>
        <p className="mt-0.5 truncate text-[13px] text-[var(--text-secondary)]">{service.desc}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[var(--text-secondary)] opacity-60" />
    </motion.button>
  );
}

function HubPageContent() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get('service');
  const [activeService, setActiveService] = useState<string | null>(
    initialService && services.some((s) => s.id === initialService) ? initialService : null,
  );
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (initialService && services.some((s) => s.id === initialService)) {
      setActiveService(initialService);
    }
  }, [initialService]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;

    return sections
      .map((section) => ({
        ...section,
        ids: section.ids.filter((id) => {
          const s = services.find((svc) => svc.id === id);
          return (
            s &&
            (s.label.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q))
          );
        }),
      }))
      .filter((section) => section.ids.length > 0);
  }, [query]);

  const active = services.find((s) => s.id === activeService);

  return (
    <AuthGuard>
      <div className="flex h-full flex-col bg-[var(--list-bg)]">
        {active && activeService ? (
          <>
            <HubServiceHeader service={active} onBack={() => setActiveService(null)} />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <ServicePanel serviceId={activeService} />
            </div>
          </>
        ) : (
          <>
            <header className="safe-top bg-[var(--list-bg)]">
              <div className="px-4 pb-2 pt-3">
                <h1 className="text-[22px] font-semibold text-[var(--accent-dark)]">Hub</h1>
                <p className="mt-0.5 text-[14px] text-[var(--text-secondary)]">
                  Services and tools, built into LinkChat
                </p>
              </div>
              <div className="px-4 pb-3">
                <div className="flex items-center gap-3 rounded-full bg-[var(--search-bg)] px-4 py-2.5">
                  <Search className="h-5 w-5 shrink-0 text-[var(--text-secondary)]" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search services"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="shrink-0 text-[var(--text-secondary)]"
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">
              {filteredSections.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]">
                  No services match your search
                </p>
              ) : (
                filteredSections.map((section) => (
                  <section key={section.title} className="mb-2">
                    <p className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                      {section.title}
                    </p>
                    <div className="mx-2 overflow-hidden rounded-2xl bg-[var(--list-bg)]">
                      {section.ids.map((id, i) => {
                        const service = services.find((s) => s.id === id);
                        if (!service) return null;
                        return (
                          <div
                            key={id}
                            className={cn(i > 0 && 'border-t border-black/[0.06]')}
                          >
                            <ServiceRow
                              service={service}
                              onSelect={() => setActiveService(id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}

export default function HubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center bg-[var(--list-bg)] text-sm text-[var(--text-secondary)]">
          Loading hub…
        </div>
      }
    >
      <HubPageContent />
    </Suspense>
  );
}

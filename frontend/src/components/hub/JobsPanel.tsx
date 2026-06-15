'use client';

import { useEffect, useState } from 'react';
import { Briefcase, MapPin, Search, ExternalLink, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string | null;
  description: string;
  category: string;
  jobType: string;
  postedAt: string;
  applyUrl: string;
  logoUrl: string | null;
  source: string;
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'Software Development', label: 'Software' },
  { id: 'Design', label: 'Design' },
  { id: 'Marketing', label: 'Marketing' },
  { id: 'Customer Support', label: 'Support' },
];

export function JobsPanel() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('q', debouncedSearch);
    if (category !== 'all') params.set('category', category);

    api
      .get<Job[]>(`/services/jobs/live?${params}`)
      .then(setJobs)
      .catch(() => setJobs([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch, category]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--border-glass)] bg-[var(--list-bg)]/95 px-4 py-3 backdrop-blur-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, companies, locations…"
            className="w-full rounded-xl border border-[var(--border-glass)] bg-[var(--input-bg)] py-2.5 pl-10 pr-4 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                category === c.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-[var(--bg-glass)] text-[var(--text-secondary)]',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Briefcase className="h-12 w-12 text-[var(--text-secondary)] opacity-40" />
            <p className="mt-3 text-[var(--text-secondary)]">No jobs match your search.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)] p-4 transition-colors hover:border-blue-500/30"
              >
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-blue-500/15">
                    {job.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.logoUrl} alt="" className="h-full w-full object-contain p-1" />
                    ) : (
                      <Building2 className="h-6 w-6 text-blue-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug">{job.title}</h3>
                    <p className="text-sm text-[var(--accent-light)]">{job.company}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300">
                    {job.jobType}
                  </span>
                  <span className="rounded-md bg-[var(--bg-glass)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {job.category}
                  </span>
                  <span className="rounded-md bg-[var(--bg-glass)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                    {job.source}
                  </span>
                </div>

                <p className="mt-2 flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </p>

                {job.salary && (
                  <p className="mt-1 text-sm font-medium text-emerald-400">{job.salary}</p>
                )}

                {job.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-secondary)]">{job.description}</p>
                )}

                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    {new Date(job.postedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <a
                    href={job.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white"
                  >
                    Apply Now
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

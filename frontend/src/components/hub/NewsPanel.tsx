'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl: string | null;
  authorId: string;
  publishedAt: string;
  link: string;
  source: string;
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'World', label: 'World' },
  { id: 'Tech', label: 'Tech' },
  { id: 'Business', label: 'Business' },
];

export function NewsPanel() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');

  useEffect(() => {
    setLoading(true);
    const q = category !== 'all' ? `?category=${category}` : '';
    api
      .get<NewsArticle[]>(`/services/news/live${q}`)
      .then(setArticles)
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 border-b border-[var(--border-glass)] bg-[var(--list-bg)]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium',
                category === c.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--search-bg)] text-[var(--text-secondary)]',
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
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Newspaper className="h-12 w-12 text-[var(--text-secondary)] opacity-40" />
            <p className="mt-3 text-[var(--text-secondary)]">No articles available.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {articles.map((article, i) => (
              <article
                key={article.id}
                className={cn(
                  'overflow-hidden rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-glass)]',
                  i === 0 && 'ring-1 ring-purple-500/20',
                )}
              >
                {article.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={article.imageUrl}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wide text-purple-300">
                    <span>{article.category}</span>
                    <span className="text-[var(--text-secondary)]">·</span>
                    <span className="text-[var(--text-secondary)]">{article.source}</span>
                  </div>
                  <h3 className={cn('mt-2 font-semibold leading-snug', i === 0 && 'text-lg')}>
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--text-secondary)]">
                      {article.summary}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {new Date(article.publishedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <a
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-300 hover:text-purple-200"
                    >
                      Read full story
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

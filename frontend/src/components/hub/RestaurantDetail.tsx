'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  Clock,
  Phone,
  Navigation,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { PlaceDetails } from '@/types/food';
import {
  formatDeliveryTime,
  formatPrice,
} from '@/lib/food-data';
import { PlaceCoverBanner } from '@/components/hub/PlaceCoverBanner';
import { formatDistance, mapsDirectionsUrl, mapsSearchUrl, telUrl } from '@/lib/places';
import { cn } from '@/lib/utils';

type Tab = 'menu' | 'reviews' | 'info';

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const iconSize = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            iconSize,
            i < Math.floor(rating)
              ? 'fill-amber-400 text-amber-400'
              : i < rating
                ? 'fill-amber-400/50 text-amber-400'
                : 'fill-none text-gray-400',
          )}
        />
      ))}
    </div>
  );
}

export function RestaurantDetail({
  place,
  onBack,
}: {
  place: PlaceDetails;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('menu');
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);

  const menuCategories = useMemo(() => {
    const cats = Array.from(new Set(place.menu.map((m) => m.category)));
    return cats;
  }, [place.menu]);

  const filteredMenu = activeMenuCategory
    ? place.menu.filter((m) => m.category === activeMenuCategory)
    : place.menu;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'menu', label: 'Menu' },
    { id: 'reviews', label: `Reviews (${place.reviews.length})` },
    { id: 'info', label: 'Info' },
  ];

  return (
    <div className="flex h-full flex-col bg-[var(--list-bg)]">
      {/* Hero */}
      <div className="relative shrink-0">
        <PlaceCoverBanner place={place} className="h-48 sm:h-56" showCategory={false}>
          <button
            type="button"
            onClick={onBack}
            className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--list-bg)] to-transparent px-4 pb-4 pt-12">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-bold leading-tight text-[var(--text-primary)] sm:text-2xl">
                  {place.name}
                </h1>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {place.cuisine.join(' · ')} · {formatDistance(place.distanceMeters)}
                </p>
              </div>
              <span
                className={cn(
                  'shrink-0 rounded-full px-3 py-1 text-xs font-bold',
                  place.isOpen
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/20 text-red-400',
                )}
              >
                {place.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </PlaceCoverBanner>
      </div>

      {/* Stats bar */}
      <div className="shrink-0 border-b border-[var(--border-glass)] px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-bold text-[var(--text-primary)]">{place.rating}</span>
            <span className="text-xs text-[var(--text-secondary)]">({place.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <MapPin className="h-3.5 w-3.5 text-orange-500" />
            <span className="font-medium text-[var(--text-primary)]">
              {formatDistance(place.distanceMeters)}
            </span>
            <span>away</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Clock className="h-3.5 w-3.5 text-orange-500" />
            <span>{formatDeliveryTime(place.deliveryMinutes)}</span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex gap-2">
          {place.phone && (
            <a
              href={telUrl(place.phone)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
          )}
          <a
            href={mapsDirectionsUrl(place.lat, place.lng)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-panel)]"
          >
            <Navigation className="h-4 w-4" />
            Directions
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 shrink-0 border-b border-[var(--border-glass)] bg-[var(--list-bg)]">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 py-3 text-sm font-semibold transition-colors',
                activeTab === tab.id
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'menu' && (
          <div className="pb-6">
            {menuCategories.length > 1 && (
              <div className="sticky top-0 z-[5] flex gap-2 overflow-x-auto border-b border-[var(--border-glass)] bg-[var(--list-bg)] px-4 py-2.5 scrollbar-hide">
                <button
                  onClick={() => setActiveMenuCategory(null)}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                    !activeMenuCategory
                      ? 'bg-orange-500 text-white'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
                  )}
                >
                  All
                </button>
                {menuCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveMenuCategory(cat)}
                    className={cn(
                      'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition',
                      activeMenuCategory === cat
                        ? 'bg-orange-500 text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]',
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="px-4 pt-3">
              <p className="mb-3 text-xs text-[var(--text-secondary)]">
                Min. order {formatPrice(place.minOrder)} · Prices are estimates
              </p>

              <div className="space-y-3">
                {filteredMenu.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--text-primary)]">{item.name}</h3>
                        {item.popular && (
                          <span className="rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-orange-500">
                            Popular
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-snug text-[var(--text-secondary)]">
                        {item.description}
                      </p>
                      <p className="mt-2 text-sm font-bold text-orange-500">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 text-2xl">
                      {getCategoryEmoji(place.category)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-3 p-4">
            <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4 text-center">
              <p className="text-3xl font-bold text-[var(--text-primary)]">{place.rating}</p>
              <StarRating rating={place.rating} size="md" />
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Based on {place.reviewCount} reviews
              </p>
            </div>

            {place.reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500/20 text-sm font-bold text-orange-500">
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {review.author}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{review.date}</p>
                    </div>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                  {review.text}
                </p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'info' && (
          <div className="space-y-3 p-4">
            {place.address && (
              <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Address</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{place.address}</p>
                    <p className="mt-2 text-sm font-medium text-orange-500">
                      {formatDistance(place.distanceMeters)} from your location
                    </p>
                  </div>
                </div>
              </div>
            )}

            {place.openingHours && (
              <div className="rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 shrink-0 text-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Opening Hours</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{place.openingHours}</p>
                  </div>
                </div>
              </div>
            )}

            {place.phone && (
              <a
                href={telUrl(place.phone)}
                className="flex items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4 transition hover:bg-[var(--bg-panel)]"
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Phone</p>
                    <p className="text-sm text-[var(--text-secondary)]">{place.phone}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
              </a>
            )}

            <a
              href={mapsSearchUrl(place.lat, place.lng, place.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4 transition hover:bg-[var(--bg-panel)]"
            >
              <div className="flex items-center gap-3">
                <ExternalLink className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">View on Maps</p>
                  <p className="text-sm text-[var(--text-secondary)]">Open in Google Maps</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
            </a>

            {place.website && (
              <a
                href={place.website.startsWith('http') ? place.website : `https://${place.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-2xl border border-[var(--border-glass)] bg-[var(--bg-secondary)] p-4 transition hover:bg-[var(--bg-panel)]"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Website</p>
                    <p className="text-sm text-[var(--text-secondary)]">{place.website}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--text-secondary)]" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

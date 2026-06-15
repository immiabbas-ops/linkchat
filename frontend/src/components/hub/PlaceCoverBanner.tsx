'use client';

import { Coffee, MapPin, Pizza, UtensilsCrossed } from 'lucide-react';
import {
  getCategoryGradient,
  getCategoryLabel,
  getPlaceBannerUrl,
  resolveFoodCategory,
} from '@/lib/food-data';
import type { NearbyPlace } from '@/types/food';
import { cn } from '@/lib/utils';

function CategoryIcon({ category, className }: { category: string; className?: string }) {
  if (category === 'cafe') return <Coffee className={className} />;
  if (category === 'fast_food') return <Pizza className={className} />;
  return <UtensilsCrossed className={className} />;
}

interface PlaceCoverBannerProps {
  place: NearbyPlace;
  className?: string;
  distanceLabel?: string;
  showCategory?: boolean;
  children?: React.ReactNode;
}

export function PlaceCoverBanner({
  place,
  className,
  distanceLabel,
  showCategory = true,
  children,
}: PlaceCoverBannerProps) {
  const bannerUrl = getPlaceBannerUrl(place);
  const category = resolveFoodCategory(place);

  return (
    <div className={cn('relative overflow-hidden bg-[var(--bg-secondary)]', className)}>
      <img
        src={bannerUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br',
          getCategoryGradient(category),
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />

      {showCategory && (
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
            <CategoryIcon category={category} className="h-3.5 w-3.5" />
            {getCategoryLabel(category)}
          </span>
        </div>
      )}

      {distanceLabel && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-lg bg-black/45 px-2 py-1 text-xs font-semibold text-white backdrop-blur-md">
          <MapPin className="h-3 w-3" />
          {distanceLabel}
        </div>
      )}

      {children}
    </div>
  );
}

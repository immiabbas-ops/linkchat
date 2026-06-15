import { cn } from '@/lib/utils';

interface LinkLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { box: 'h-9 w-9', icon: 18, text: 'text-base' },
  md: { box: 'h-14 w-14', icon: 28, text: 'text-2xl' },
  lg: { box: 'h-20 w-20', icon: 40, text: 'text-3xl' },
};

export function LinkLogo({ size = 'md', showText = false, className }: LinkLogoProps) {
  const s = sizes[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg shadow-violet-500/30',
          s.box,
        )}
      >
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M8.5 11.5C7.12 11.5 6 10.38 6 9s1.12-2.5 2.5-2.5S11 7.62 11 9s-1.12 2.5-2.5 2.5Z"
            stroke="white"
            strokeWidth="1.8"
          />
          <path
            d="M15.5 16.5C14.12 16.5 13 15.38 13 14s1.12-2.5 2.5-2.5S18 12.62 18 14s-1.12 2.5-2.5 2.5Z"
            stroke="white"
            strokeWidth="1.8"
          />
          <path
            d="M10.2 10.4L14.8 13.6"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M13.8 7.6L9.2 10.8"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            opacity="0.85"
          />
        </svg>
      </div>
      {showText && (
        <span className={cn('font-semibold tracking-tight text-[var(--text-primary)]', s.text)}>
          Link<span className="text-[var(--accent)]">Chat</span>
        </span>
      )}
    </div>
  );
}

import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={cn('rounded-full object-cover', sizes[size])}
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-semibold text-white bg-[var(--accent)]',
            sizes[size],
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[var(--bg-primary)]',
            online ? 'bg-[var(--success)]' : 'bg-[var(--text-secondary)]',
          )}
        />
      )}
    </div>
  );
}

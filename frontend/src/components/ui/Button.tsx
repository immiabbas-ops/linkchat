import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
          {
            'bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)]': variant === 'primary',
            'bg-[var(--input-bg)] text-[var(--text-primary)] hover:opacity-90': variant === 'secondary',
            'text-[var(--text-secondary)] hover:text-[var(--text-primary)]': variant === 'ghost',
            'bg-[var(--danger)] text-white': variant === 'danger',
            'h-8 px-3 text-sm': size === 'sm',
            'h-11 px-5 text-sm': size === 'md',
            'h-13 px-6 text-base': size === 'lg',
          },
          className,
        )}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          children
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border border-[var(--border-glass)] bg-[var(--input-bg)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] transition-all focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]',
            error && 'border-[var(--danger)]',
            className,
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

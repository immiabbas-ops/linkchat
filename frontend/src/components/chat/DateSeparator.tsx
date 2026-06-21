'use client';

interface DateSeparatorProps {
  label: string;
}

export function DateSeparator({ label }: DateSeparatorProps) {
  return (
    <div className="my-3 flex justify-center px-4" role="separator" aria-label={label}>
      <span className="rounded-md bg-[var(--date-pill-bg,#e1f2fb)] px-3 py-1 text-[12px] font-medium text-[var(--date-pill-text,#54656f)] shadow-sm">
        {label}
      </span>
    </div>
  );
}

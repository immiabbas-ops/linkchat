'use client';

interface ProcessingOverlayProps {
  visible: boolean;
  label: string;
  progress?: number;
}

export function ProcessingOverlay({ visible, label, progress }: ProcessingOverlayProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/65 backdrop-blur-sm">
      <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-emerald-400 border-t-transparent" />
      <p className="mt-4 text-sm font-medium text-white">{label}</p>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

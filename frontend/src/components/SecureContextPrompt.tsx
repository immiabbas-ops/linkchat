'use client';

import { getRecommendedSecureUrl, isSecureBrowserContext } from '@/lib/permissions';

export function SecureContextPrompt({ feature = 'location' }: { feature?: 'location' | 'camera' | 'microphone' }) {
  if (isSecureBrowserContext()) return null;

  const secureUrl = getRecommendedSecureUrl();
  const labels = { location: 'Location', camera: 'Camera', microphone: 'Microphone' };

  return (
    <a
      href={secureUrl}
      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white"
    >
      Open {labels[feature]} on HTTPS
    </a>
  );
}

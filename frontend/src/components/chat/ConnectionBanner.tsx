'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { socketService } from '@/lib/socket';

export function ConnectionBanner() {
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    return socketService.onConnectionChange((state) => {
      setConnected(state === 'connected');
      setReconnecting(state === 'reconnecting');
    });
  }, []);

  if (connected) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-600 px-3 py-1.5 text-center text-[13px] font-medium text-white"
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
      {reconnecting ? 'Reconnecting…' : 'Waiting for network'}
    </div>
  );
}

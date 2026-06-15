'use client';

import Link from 'next/link';
import { ArrowLeft, Monitor, Smartphone } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    api.get<any[]>('/auth/devices').then(setDevices).catch(() => {});
  }, []);

  return (
    <AuthGuard>
      <div className="flex h-full flex-col md:pl-20">
        <header className="flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-4 safe-top">
          <Link href="/settings"><ArrowLeft className="h-5 w-5" /></Link>
          <h1 className="text-xl font-bold">Devices</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y--2">
          {devices.map((d) => (
            <div key={d.id} className="flex items-center gap-3 rounded-xl glass p-4">
              {d.deviceType === 'web' ? <Monitor className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
              <div>
                <p className="font-medium">{d.deviceName}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Last active: {new Date(d.lastActiveAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Shield } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function FamilySettingsPage() {
  const [family, setFamily] = useState<any>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childForm, setChildForm] = useState({ displayName: '', email: '', age: '' });

  useEffect(() => {
    api.get('/family').then(setFamily).catch(() => setFamily(null));
  }, []);

  const createFamily = async () => {
    const result = await api.post('/family', { name: 'My Family' });
    setFamily(result);
  };

  const addChild = async () => {
    await api.post('/family/child', {
      displayName: childForm.displayName,
      email: childForm.email,
      age: childForm.age ? parseInt(childForm.age) : undefined,
    });
    setShowAddChild(false);
    const updated = await api.get('/family');
    setFamily(updated);
  };

  return (
    <AuthGuard>
      <div className="flex h-full flex-col md:pl-20">
        <header className="flex items-center gap-3 border-b border-[var(--border-glass)] px-4 py-4 safe-top">
          <Link href="/settings">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Family</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!family ? (
            <div className="text-center py-12">
              <Shield className="mx-auto h-12 w-12 text-accent-light mb-4" />
              <p className="text-[var(--text-secondary)] mb-4">Set up family controls</p>
              <Button onClick={createFamily}>Create Family Group</Button>
            </div>
          ) : (
            <>
              <div className="rounded-2xl glass p-4">
                <h2 className="font-semibold">{family.name}</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {family.members?.length || 0} members · {family.children?.length || 0} children
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Children</h3>
                  <button
                    onClick={() => setShowAddChild(true)}
                    className="flex items-center gap-1 text-sm text-accent-light"
                  >
                    <Plus className="h-4 w-4" /> Add Child
                  </button>
                </div>
                {family.children?.map((child: any) => (
                  <div key={child.id} className="rounded-xl glass p-3 mb-2">
                    <p className="font-medium">{child.displayName}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Restricted mode: {child.restrictedMode ? 'On' : 'Off'}
                      {child.screenTimeLimit && ` · ${child.screenTimeLimit}min/day`}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {showAddChild && (
            <div className="rounded-2xl glass p-4 space-y-3">
              <Input
                label="Display Name"
                value={childForm.displayName}
                onChange={(e) => setChildForm({ ...childForm, displayName: e.target.value })}
              />
              <Input
                label="Email"
                type="email"
                value={childForm.email}
                onChange={(e) => setChildForm({ ...childForm, email: e.target.value })}
              />
              <Input
                label="Age"
                type="number"
                value={childForm.age}
                onChange={(e) => setChildForm({ ...childForm, age: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={addChild} className="flex-1">Add</Button>
                <Button variant="ghost" onClick={() => setShowAddChild(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

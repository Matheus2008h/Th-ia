'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, hydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
    }
  }, [hydrated, user, router]);

  if (!hydrated || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-950 text-gray-500">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return <>{children}</>;
}

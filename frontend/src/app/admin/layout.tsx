'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, LayoutDashboard, KeyRound, Users, Cpu, LogOut, ShieldCheck, Code2 } from 'lucide-react';
import { useAdminStore } from '@/lib/adminAuthStore';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/keys', label: 'Keys Premium', icon: KeyRound },
  { href: '/admin/api-keys', label: 'API Keys (mensal)', icon: Code2 },
  { href: '/admin/users', label: 'Usuários', icon: Users },
  { href: '/admin/providers', label: 'Provedores de IA', icon: Cpu },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, hydrated, hydrate, logout } = useAdminStore();

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hydrated && !admin && pathname !== '/admin/login') {
      router.replace('/admin/login');
    }
  }, [hydrated, admin, pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (!hydrated || !admin) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-base-950 text-gray-500">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-base-950">
      <aside className="flex w-64 flex-col border-r border-base-700 bg-base-900 p-3">
        <div className="flex items-center gap-2 px-1 py-2 mb-4">
          <ShieldCheck className="text-brand-400" size={20} />
          <span className="font-semibold text-sm">Painel Admin</span>
        </div>

        <nav className="flex-1 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                pathname === href ? 'bg-base-850 text-white' : 'text-gray-300 hover:bg-base-850'
              }`}
            >
              <Icon size={15} /> {label}
            </Link>
          ))}
        </nav>

        <div className="pt-3 border-t border-base-700">
          <p className="px-2.5 text-xs text-gray-500 mb-1 truncate">{admin.email}</p>
          <button
            onClick={() => {
              logout();
              router.replace('/admin/login');
            }}
            className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-gray-400 hover:bg-base-850 transition"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}

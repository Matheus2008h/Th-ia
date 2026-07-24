'use client';

import { useEffect, useState } from 'react';
import { Users, Crown, KeyRound, CheckCircle2, Loader2 } from 'lucide-react';
import { fetchStats, AdminStats } from '@/lib/adminApi';

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-900 p-5">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
        <Icon size={16} /> {label}
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Dashboard</h1>

      {loading ? (
        <Loader2 className="animate-spin text-gray-500" size={20} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total de usuários" value={stats?.totalUsers ?? 0} />
          <StatCard icon={Crown} label="Usuários Premium" value={stats?.premiumUsers ?? 0} />
          <StatCard icon={KeyRound} label="Keys disponíveis" value={stats?.freeKeysAvailable ?? 0} />
          <StatCard icon={CheckCircle2} label="Keys utilizadas" value={stats?.keysUsed ?? 0} />
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Loader2, Ban, CheckCircle2, Trash2 } from 'lucide-react';
import { listUsersRequest, blockUserRequest, unblockUserRequest, deleteUserRequest, AdminUserRow } from '@/lib/adminApi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      setUsers(await listUsersRequest());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Usuários</h1>

      <div className="rounded-xl border border-base-700 bg-base-900 overflow-hidden">
        {loading ? (
          <div className="p-6 flex justify-center text-gray-500">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-base-700">
                <th className="px-4 py-2.5 font-medium">Nome</th>
                <th className="px-4 py-2.5 font-medium">E-mail</th>
                <th className="px-4 py-2.5 font-medium">Plano</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-base-800 last:border-0">
                  <td className="px-4 py-2.5">{u.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.plan === 'PREMIUM' ? 'bg-brand-600/20 text-brand-300' : 'bg-gray-700/40 text-gray-300'
                      }`}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {u.is_blocked ? (
                      <span className="text-red-400 text-xs">Bloqueado</span>
                    ) : (
                      <span className="text-green-400 text-xs">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      {u.is_blocked ? (
                        <button
                          onClick={async () => {
                            await unblockUserRequest(u.id);
                            refresh();
                          }}
                          className="text-green-400 hover:text-green-300"
                          title="Desbloquear"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={async () => {
                            await blockUserRequest(u.id);
                            refresh();
                          }}
                          className="text-yellow-400 hover:text-yellow-300"
                          title="Bloquear"
                        >
                          <Ban size={14} />
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          if (confirm(`Excluir a conta de ${u.email}? Essa ação não pode ser desfeita.`)) {
                            await deleteUserRequest(u.id);
                            refresh();
                          }
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Nenhum usuário cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

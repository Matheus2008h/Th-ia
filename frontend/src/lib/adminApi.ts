import { API_URL } from './api';

function adminHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('th_ia_admin_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erro na requisição.');
  return data;
}

export async function adminLoginRequest(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handle(res) as Promise<{ accessToken: string; admin: { id: string; name: string; email: string } }>;
}

export interface AdminStats {
  totalUsers: number;
  premiumUsers: number;
  freeKeysAvailable: number;
  keysUsed: number;
}

export async function fetchStats(): Promise<AdminStats> {
  const res = await fetch(`${API_URL}/api/admin/stats`, { headers: { ...adminHeaders() } });
  return handle(res);
}

// ---------- Keys ----------
export interface LicenseKeyRow {
  id: string;
  code: string;
  plan: string;
  duration_days: number | null;
  status: 'UNUSED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  user_name: string | null;
  user_email: string | null;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export async function listKeysRequest(): Promise<LicenseKeyRow[]> {
  const res = await fetch(`${API_URL}/api/admin/keys`, { headers: { ...adminHeaders() } });
  return handle(res);
}

export async function generateKeyRequest(durationDays: 7 | 30 | 90 | null) {
  const res = await fetch(`${API_URL}/api/admin/keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ durationDays }),
  });
  return handle(res) as Promise<{ code: string }>;
}

export async function revokeKeyRequest(id: string) {
  const res = await fetch(`${API_URL}/api/admin/keys/${id}/revoke`, {
    method: 'PATCH',
    headers: { ...adminHeaders() },
  });
  return handle(res);
}

export async function deleteKeyRequest(id: string) {
  const res = await fetch(`${API_URL}/api/admin/keys/${id}`, { method: 'DELETE', headers: { ...adminHeaders() } });
  return handle(res);
}

// ---------- Users ----------
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  plan: 'FREE' | 'PREMIUM';
  is_blocked: boolean;
  created_at: string;
}

export async function listUsersRequest(): Promise<AdminUserRow[]> {
  const res = await fetch(`${API_URL}/api/admin/users`, { headers: { ...adminHeaders() } });
  return handle(res);
}

export async function blockUserRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/users/${id}/block`, { method: 'PATCH', headers: { ...adminHeaders() } }));
}

export async function unblockUserRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/users/${id}/unblock`, { method: 'PATCH', headers: { ...adminHeaders() } }));
}

export async function deleteUserRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/users/${id}`, { method: 'DELETE', headers: { ...adminHeaders() } }));
}

// ---------- Providers / Models ----------
export interface ProviderRow {
  id: string;
  name: string;
  provider_key: string;
  base_url: string | null;
  is_active: boolean;
  has_key: boolean;
  created_at: string;
}

export async function listProvidersRequest(): Promise<ProviderRow[]> {
  const res = await fetch(`${API_URL}/api/admin/providers`, { headers: { ...adminHeaders() } });
  return handle(res);
}

export async function createProviderRequest(payload: {
  name: string;
  providerKey: string;
  apiKey?: string;
  baseUrl?: string;
}) {
  const res = await fetch(`${API_URL}/api/admin/providers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function toggleProviderRequest(id: string, isActive: boolean) {
  return handle(
    await fetch(`${API_URL}/api/admin/providers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ isActive }),
    })
  );
}

export async function deleteProviderRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/providers/${id}`, { method: 'DELETE', headers: { ...adminHeaders() } }));
}

export interface ModelRow {
  id: string;
  model_name: string;
  task_type: string;
  priority: number;
  is_active: boolean;
  provider_name: string;
  provider_key: string;
}

export async function listModelsRequest(): Promise<ModelRow[]> {
  const res = await fetch(`${API_URL}/api/admin/models`, { headers: { ...adminHeaders() } });
  return handle(res);
}

export async function createModelRequest(payload: {
  providerId: string;
  modelName: string;
  taskType: string;
  priority: number;
}) {
  const res = await fetch(`${API_URL}/api/admin/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateModelRequest(id: string, payload: { priority?: number; isActive?: boolean }) {
  return handle(
    await fetch(`${API_URL}/api/admin/models/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify(payload),
    })
  );
}

export async function deleteModelRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/models/${id}`, { method: 'DELETE', headers: { ...adminHeaders() } }));
}

// ---------- API Keys mensais (acesso à API pública) ----------
export interface ApiKeyRow {
  id: string;
  key_code: string;
  label: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  request_count: number;
  last_used_at: string | null;
  created_at: string;
  expires_at: string;
}

export async function listApiKeysRequest(): Promise<ApiKeyRow[]> {
  const res = await fetch(`${API_URL}/api/admin/api-keys`, { headers: { ...adminHeaders() } });
  return handle(res);
}

export async function generateApiKeyRequest(label?: string) {
  const res = await fetch(`${API_URL}/api/admin/api-keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeaders() },
    body: JSON.stringify({ label }),
  });
  return handle(res) as Promise<{ code: string; expiresAt: string }>;
}

export async function revokeApiKeyRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/api-keys/${id}/revoke`, { method: 'PATCH', headers: { ...adminHeaders() } }));
}

export async function deleteApiKeyRequest(id: string) {
  return handle(await fetch(`${API_URL}/api/admin/api-keys/${id}`, { method: 'DELETE', headers: { ...adminHeaders() } }));
}

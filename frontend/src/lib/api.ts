export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('th_ia_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface PurchaseInfo {
  priceLabel: string;
  whatsappNumber: string;
  whatsappLink: string;
  message: string;
}

export async function fetchPurchaseInfo(): Promise<PurchaseInfo> {
  const res = await fetch(`${API_URL}/api/license/purchase-info`);
  if (!res.ok) throw new Error('Não foi possível carregar as informações de compra.');
  return res.json();
}

export async function activatePremiumKey(code: string) {
  const res = await fetch(`${API_URL}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao ativar a key.');
  return data as { success: boolean; expiresAt: string | null; message: string };
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; plan: 'FREE' | 'PREMIUM' };
}

export async function registerRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao registrar.');
  return data;
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse | { requiresTwoFactor: true; challengeToken: string }> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Credenciais inválidas.');
  return data;
}

export async function verifyTwoFactorLoginRequest(challengeToken: string, code: string): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/2fa/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeToken, code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Código inválido.');
  return data;
}

// ---------- 2FA ----------
export async function setupTwoFactor(): Promise<{ qrCodeDataUrl: string }> {
  const res = await fetch(`${API_URL}/api/user/2fa/setup`, { method: 'POST', headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Falha ao iniciar configuração do 2FA.');
  return res.json();
}

export async function confirmTwoFactor(code: string) {
  const res = await fetch(`${API_URL}/api/user/2fa/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ code }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Código incorreto.');
  return data;
}

export async function disableTwoFactorRequest() {
  await fetch(`${API_URL}/api/user/2fa/disable`, { method: 'POST', headers: { ...authHeaders() } });
}

export async function getTwoFactorStatus(): Promise<{ enabled: boolean }> {
  const res = await fetch(`${API_URL}/api/user/2fa/status`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Falha ao carregar status do 2FA.');
  return res.json();
}

export interface Conversation {
  id: string;
  title: string;
  is_favorite: boolean;
  model_used: string | null;
  updated_at: string;
}

export async function listConversations(): Promise<Conversation[]> {
  const res = await fetch(`${API_URL}/api/chat/conversations`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Falha ao carregar conversas.');
  return res.json();
}

export async function createConversation(): Promise<{ id: string; title: string }> {
  const res = await fetch(`${API_URL}/api/chat/conversations`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Falha ao criar conversa.');
  return res.json();
}

export async function renameConversation(id: string, title: string) {
  await fetch(`${API_URL}/api/chat/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title }),
  });
}

export async function toggleFavoriteConversation(id: string, isFavorite: boolean) {
  await fetch(`${API_URL}/api/chat/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ isFavorite }),
  });
}

export async function deleteConversationRequest(id: string) {
  await fetch(`${API_URL}/api/chat/conversations/${id}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export async function listMessages(conversationId: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error('Falha ao carregar mensagens.');
  return res.json();
}

export interface UserProfile {
  name: string;
  language: string;
  responseStyle: string;
  personality: string | null;
}

export async function getProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_URL}/api/user/profile`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Falha ao carregar perfil.');
  return res.json();
}

export async function updateProfile(data: Partial<UserProfile>) {
  const res = await fetch(`${API_URL}/api/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Falha ao salvar perfil.');
  return res.json();
}

export interface MemoryFact {
  keyName: string;
  valueText: string;
  updatedAt: string;
}

export async function listMemory(): Promise<MemoryFact[]> {
  const res = await fetch(`${API_URL}/api/user/memory`, { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error('Falha ao carregar memória.');
  return res.json();
}

export async function saveMemoryFact(keyName: string, valueText: string) {
  const res = await fetch(`${API_URL}/api/user/memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ keyName, valueText }),
  });
  if (!res.ok) throw new Error('Falha ao salvar.');
  return res.json();
}

export async function deleteMemoryFact(keyName: string) {
  await fetch(`${API_URL}/api/user/memory/${encodeURIComponent(keyName)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  });
}

export async function calculatorRequest(expression: string, conversationId?: string) {
  const res = await fetch(`${API_URL}/api/tools/calculator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ expression, conversationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao calcular.');
  return data as { expression: string; result: string };
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function searchWebRequest(query: string, conversationId?: string) {
  const res = await fetch(`${API_URL}/api/tools/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ query, conversationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao pesquisar.');
  return data as { query: string; results: SearchResult[] };
}

export async function generateImageRequest(prompt: string, conversationId?: string) {
  const res = await fetch(`${API_URL}/api/image/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ prompt, conversationId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao gerar imagem.');
  return data as { imageUrl: string; modelUsed: string; prompt: string };
}

export async function editImageRequest(
  imageFile: File,
  preset: 'remove_object' | 'change_background' | 'upscale' | 'restore' | 'custom',
  extra: string,
  conversationId?: string
) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('preset', preset);
  if (extra) formData.append('extra', extra);
  if (conversationId) formData.append('conversationId', conversationId);

  const res = await fetch(`${API_URL}/api/image/edit`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao editar imagem.');
  return data as { imageUrl: string; modelUsed: string; preset: string };
}

export interface UploadedFile {
  fileName: string;
  storedName: string;
  url: string;
  kind: 'image' | 'pdf' | 'docx' | 'spreadsheet' | 'text' | 'other';
  sizeBytes: number;
  mimeType: string;
  extractedText: string | null;
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { ...authHeaders() },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar arquivo.');
  return data;
}

import { pool } from '@config/database';
import { decrypt } from '@utils/crypto';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

/** Busca se o admin cadastrou um provedor de pesquisa (Tavily, Serper, etc.) no painel */
async function getSearchProviderConfig() {
  const [rows] = await pool.query(
    `SELECT provider_key AS providerKey, api_key_encrypted AS apiKeyEncrypted, base_url AS baseUrl
     FROM ai_providers WHERE provider_key IN ('tavily', 'serper') AND is_active = TRUE LIMIT 1`
  );
  return (rows as any[])[0] || null;
}

async function searchWithTavily(apiKey: string, query: string): Promise<SearchResult[]> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey, query, max_results: 5 }),
  });
  if (!res.ok) throw new Error(`Tavily falhou (${res.status})`);
  const data = await res.json();
  return (data.results || []).map((r: any) => ({ title: r.title, url: r.url, snippet: r.content }));
}

async function searchWithSerper(apiKey: string, query: string): Promise<SearchResult[]> {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query }),
  });
  if (!res.ok) throw new Error(`Serper falhou (${res.status})`);
  const data = await res.json();
  return (data.organic || []).slice(0, 5).map((r: any) => ({ title: r.title, url: r.link, snippet: r.snippet }));
}

/** Fallback gratuito, sem necessidade de key — respostas mais limitadas, mas funciona sempre */
async function searchWithDuckDuckGo(query: string): Promise<SearchResult[]> {
  const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`);
  if (!res.ok) throw new Error('DuckDuckGo falhou');
  const data = await res.json();

  const results: SearchResult[] = [];
  if (data.AbstractText) {
    results.push({ title: data.Heading || query, url: data.AbstractURL, snippet: data.AbstractText });
  }
  for (const topic of data.RelatedTopics || []) {
    if (topic.Text && topic.FirstURL) {
      results.push({ title: topic.Text.split(' - ')[0], url: topic.FirstURL, snippet: topic.Text });
    }
    if (results.length >= 5) break;
  }
  return results;
}

/**
 * Pesquisa na internet: usa o provedor configurado pelo admin (Tavily/Serper) se existir;
 * senão, cai automaticamente no DuckDuckGo (gratuito, sem key) — "tudo deve funcionar
 * automaticamente", mesmo sem nenhuma configuração extra.
 */
export async function searchWeb(query: string): Promise<SearchResult[]> {
  const config = await getSearchProviderConfig();

  if (config && config.apiKeyEncrypted) {
    try {
      const apiKey = decrypt(config.apiKeyEncrypted);
      if (config.providerKey === 'tavily') return await searchWithTavily(apiKey, query);
      if (config.providerKey === 'serper') return await searchWithSerper(apiKey, query);
    } catch (err: any) {
      console.warn(`[Search] Provedor configurado falhou, caindo para DuckDuckGo: ${err.message}`);
    }
  }

  return searchWithDuckDuckGo(query);
}

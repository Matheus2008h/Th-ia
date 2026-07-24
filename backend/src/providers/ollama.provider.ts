import { ProviderCallOptions, ContentBlock } from './types';

/** Ollama espera texto em "content" e imagens em base64 num array separado "images" */
function splitContent(content: string | ContentBlock[]): { text: string; images: string[] } {
  if (typeof content === 'string') return { text: content, images: [] };
  const text = content.filter((b) => b.type === 'text').map((b: any) => b.text).join('\n');
  const images = content.filter((b) => b.type === 'image').map((b: any) => b.data);
  return { text, images };
}

/** Ollama roda localmente (ou em servidor próprio) e não exige API key. Suporta modelos com visão (ex: llava). */
export async function callOllama({ baseUrl, modelName, messages, onToken }: ProviderCallOptions): Promise<string> {
  const url = `${baseUrl || 'http://localhost:11434'}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: modelName,
      messages: messages.map((m) => {
        const { text, images } = splitContent(m.content);
        return { role: m.role, content: text, ...(images.length > 0 ? { images } : {}) };
      }),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama falhou (${response.status}): ${response.statusText}`);
  }

  let fullText = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        const token = event.message?.content;
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // linha incompleta, ignora
      }
    }
    buffer = '';
  }

  return fullText;
}

import { ProviderCallOptions, ContentBlock } from './types';

/** Converte o formato interno de blocos para o formato de conteúdo da API Anthropic */
function toAnthropicContent(content: string | ContentBlock[]) {
  if (typeof content === 'string') return content;
  return content.map((block) =>
    block.type === 'text'
      ? { type: 'text', text: block.text }
      : { type: 'image', source: { type: 'base64', media_type: block.mediaType, data: block.data } }
  );
}

/**
 * Usa a API oficial da Anthropic via fetch + streaming SSE.
 * Suporta visão nativa: mensagens com blocos de imagem são enviadas
 * diretamente como image_url/base64 para o modelo "enxergar" de verdade.
 * Requer que o admin cadastre uma API key válida no painel.
 */
export async function callAnthropic({ apiKey, modelName, messages, onToken }: ProviderCallOptions): Promise<string> {
  const systemMessages = messages
    .filter((m) => m.role === 'system')
    .map((m) => (typeof m.content === 'string' ? m.content : ''))
    .join('\n');
  const conversation = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: modelName,
      max_tokens: 4096,
      system: systemMessages || undefined,
      messages: conversation.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: toAnthropicContent(m.content),
      })),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Anthropic API falhou (${response.status}): ${errText}`);
  }

  let fullText = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr || jsonStr === '[DONE]') continue;
      try {
        const event = JSON.parse(jsonStr);
        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullText += event.delta.text;
          onToken(event.delta.text);
        }
      } catch {
        // linha incompleta, ignora
      }
    }
  }

  return fullText;
}

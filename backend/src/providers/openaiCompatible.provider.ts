import { ProviderCallOptions, ContentBlock } from './types';

/** Converte o formato interno de blocos para o formato de conteúdo da API OpenAI (data URI em base64) */
function toOpenAIContent(content: string | ContentBlock[]) {
  if (typeof content === 'string') return content;
  return content.map((block) =>
    block.type === 'text'
      ? { type: 'text', text: block.text }
      : { type: 'image_url', image_url: { url: `data:${block.mediaType};base64,${block.data}` } }
  );
}

/**
 * Compatível com qualquer API no formato OpenAI Chat Completions:
 * OpenAI, Groq, DeepSeek, OpenRouter e outros — basta trocar o baseUrl.
 * Suporta visão (image_url em base64) para modelos que aceitam, como gpt-4o.
 */
export async function callOpenAICompatible({
  apiKey,
  baseUrl,
  modelName,
  messages,
  onToken,
}: ProviderCallOptions): Promise<string> {
  const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages.map((m) => ({ role: m.role, content: toOpenAIContent(m.content) })),
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Provider falhou (${response.status}): ${errText}`);
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
        const token = event.choices?.[0]?.delta?.content;
        if (token) {
          fullText += token;
          onToken(token);
        }
      } catch {
        // linha incompleta, ignora
      }
    }
  }

  return fullText;
}

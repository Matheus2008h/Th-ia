export interface ImageEditOptions {
  apiKey: string;
  baseUrl?: string | null;
  modelName: string;
  imageBuffer: Buffer;
  maskBuffer?: Buffer | null;
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
}

/**
 * Edita uma imagem existente a partir de um prompt (formato OpenAI Images Edit).
 * Cobre os casos de "remover objeto", "trocar fundo", "restaurar foto" etc. —
 * a diferença entre eles é só o texto do prompt que o usuário/UI manda.
 * Se vier uma máscara (área transparente = onde editar), o resultado fica mais preciso;
 * sem máscara, o modelo edita a imagem inteira com base no prompt.
 */
export async function editImageOpenAI({ apiKey, baseUrl, modelName, imageBuffer, maskBuffer, prompt, size }: ImageEditOptions): Promise<string> {
  const url = `${baseUrl || 'https://api.openai.com/v1'}/images/edits`;

  const form = new FormData();
  form.append('model', modelName);
  form.append('prompt', prompt);
  form.append('size', size || '1024x1024');
  form.append('image', new Blob([imageBuffer]), 'image.png');
  if (maskBuffer) form.append('mask', new Blob([maskBuffer]), 'mask.png');

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as any,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Edição de imagem falhou (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;

  if (imageUrl) return imageUrl;
  if (b64) return `data:image/png;base64,${b64}`;
  throw new Error('Provedor não retornou uma imagem editada.');
}
  apiKey: string;
  baseUrl?: string | null;
  modelName: string;
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
}

/**
 * Gera uma imagem a partir de texto usando a API de imagens no formato OpenAI
 * (OpenAI DALL-E e provedores compatíveis). Retorna a URL da imagem gerada.
 */
export async function generateImageOpenAI({ apiKey, baseUrl, modelName, prompt, size }: ImageGenOptions): Promise<string> {
  const url = `${baseUrl || 'https://api.openai.com/v1'}/images/generations`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      prompt,
      size: size || '1024x1024',
      n: 1,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);
    throw new Error(`Geração de imagem falhou (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const imageUrl = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;

  if (imageUrl) return imageUrl;
  if (b64) return `data:image/png;base64,${b64}`;
  throw new Error('Provedor não retornou uma imagem.');
}

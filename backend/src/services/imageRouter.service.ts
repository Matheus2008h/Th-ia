import { pool } from '@config/database';
import { decrypt } from '@utils/crypto';
import { generateImageOpenAI, editImageOpenAI } from '../providers/imageGen.provider';

interface ImageModelConfig {
  id: string;
  providerKey: string;
  modelName: string;
  apiKeyEncrypted: string | null;
  baseUrl: string | null;
  priority: number;
}

async function getActiveImageModels(): Promise<ImageModelConfig[]> {
  const [rows] = await pool.query(
    `SELECT m.id, p.provider_key AS providerKey, m.model_name AS modelName,
            p.api_key_encrypted AS apiKeyEncrypted, p.base_url AS baseUrl, m.priority
     FROM ai_models m
     JOIN ai_providers p ON p.id = m.provider_id
     WHERE m.task_type = 'image_gen' AND m.is_active = TRUE AND p.is_active = TRUE
     ORDER BY m.priority DESC`
  );
  return rows as ImageModelConfig[];
}

export async function generateImage(prompt: string, size?: '1024x1024' | '1024x1792' | '1792x1024') {
  const models = await getActiveImageModels();

  if (models.length === 0) {
    throw new Error(
      'Nenhum provedor de geração de imagens configurado. Peça ao administrador para cadastrar um modelo com tarefa "image_gen" no painel.'
    );
  }

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      // Hoje suportamos o formato OpenAI Images (OpenAI e compatíveis).
      // Outros formatos (ex: Stability AI) podem ser adicionados aqui seguindo o mesmo padrão dos chat providers.
      const apiKey = model.apiKeyEncrypted ? decrypt(model.apiKeyEncrypted) : '';
      const imageUrl = await generateImageOpenAI({
        apiKey,
        baseUrl: model.baseUrl,
        modelName: model.modelName,
        prompt,
        size,
      });
      return { imageUrl, modelUsed: `${model.providerKey}/${model.modelName}` };
    } catch (err: any) {
      lastError = err;
      console.warn(`[ImageRouter] Falha em ${model.providerKey}/${model.modelName}: ${err.message}. Tentando próximo...`);
      continue;
    }
  }

  throw lastError || new Error('Todos os provedores de geração de imagem falharam.');
}

export async function editImage(
  imageBuffer: Buffer,
  prompt: string,
  maskBuffer?: Buffer | null,
  size?: '1024x1024' | '1024x1792' | '1792x1024'
) {
  const models = await getActiveImageModels();

  if (models.length === 0) {
    throw new Error(
      'Nenhum provedor de geração/edição de imagens configurado. Peça ao administrador para cadastrar um modelo com tarefa "image_gen".'
    );
  }

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const apiKey = model.apiKeyEncrypted ? decrypt(model.apiKeyEncrypted) : '';
      const imageUrl = await editImageOpenAI({
        apiKey,
        baseUrl: model.baseUrl,
        modelName: model.modelName,
        imageBuffer,
        maskBuffer,
        prompt,
        size,
      });
      return { imageUrl, modelUsed: `${model.providerKey}/${model.modelName}` };
    } catch (err: any) {
      lastError = err;
      console.warn(`[ImageRouter] Falha ao editar com ${model.providerKey}/${model.modelName}: ${err.message}`);
      continue;
    }
  }

  throw lastError || new Error('Todos os provedores de edição de imagem falharam.');
}

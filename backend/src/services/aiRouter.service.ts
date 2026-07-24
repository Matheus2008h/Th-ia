import { pool } from '@config/database';
import { decrypt } from '@utils/crypto';
import { callAnthropic } from '../providers/anthropic.provider';
import { callOpenAICompatible } from '../providers/openaiCompatible.provider';
import { callOllama } from '../providers/ollama.provider';
import { ProviderStreamFn, ChatMessageInput } from '../providers/types';

export interface AIRequest {
  taskType: 'chat' | 'vision' | 'image_gen' | 'code' | 'audio';
  messages: ChatMessageInput[];
}

interface AIModelConfig {
  id: string;
  providerKey: string;
  modelName: string;
  apiKeyEncrypted: string | null;
  baseUrl: string | null;
  priority: number;
}

// Mapa de qual função de streaming usar por provedor.
// openai, groq, deepseek e openrouter são todos compatíveis com o formato OpenAI.
const OPENAI_COMPATIBLE = new Set(['openai', 'groq', 'deepseek', 'openrouter', 'mistral']);

function resolveProviderFn(providerKey: string): ProviderStreamFn {
  if (providerKey === 'anthropic') return callAnthropic;
  if (providerKey === 'ollama') return callOllama;
  if (OPENAI_COMPATIBLE.has(providerKey)) return callOpenAICompatible;
  throw new Error(`Provedor desconhecido: ${providerKey}`);
}

async function getActiveModelsForTask(taskType: string): Promise<AIModelConfig[]> {
  const [rows] = await pool.query(
    `SELECT m.id, p.provider_key AS providerKey, m.model_name AS modelName,
            p.api_key_encrypted AS apiKeyEncrypted, p.base_url AS baseUrl, m.priority
     FROM ai_models m
     JOIN ai_providers p ON p.id = m.provider_id
     WHERE m.task_type = :taskType AND m.is_active = TRUE AND p.is_active = TRUE
     ORDER BY m.priority DESC`,
    { taskType }
  );
  return rows as AIModelConfig[];
}

/**
 * Tenta os modelos configurados em ordem de prioridade (definida pelo admin).
 * Caso uma API falhe (rede, limite, chave inválida), tenta automaticamente
 * o próximo modelo disponível — fallback transparente para o usuário, que
 * só percebe uma resposta um pouco mais demorada, nunca um erro.
 */
export async function routeAIRequest(
  request: AIRequest,
  onToken: (token: string) => void
): Promise<{ fullText: string; modelUsed: string }> {
  const models = await getActiveModelsForTask(request.taskType);

  if (models.length === 0) {
    throw new Error(
      'Nenhum provedor de IA configurado para esta tarefa. Peça ao administrador para cadastrar uma API no painel.'
    );
  }

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const fn = resolveProviderFn(model.providerKey);
      const apiKey = model.apiKeyEncrypted ? decrypt(model.apiKeyEncrypted) : '';

      const fullText = await fn({
        apiKey,
        baseUrl: model.baseUrl,
        modelName: model.modelName,
        messages: request.messages,
        onToken,
      });

      return { fullText, modelUsed: `${model.providerKey}/${model.modelName}` };
    } catch (err: any) {
      lastError = err;
      console.warn(`[AIRouter] Falha em ${model.providerKey}/${model.modelName}: ${err.message}. Tentando próximo...`);
      continue;
    }
  }

  throw lastError || new Error('Todos os provedores de IA configurados falharam.');
}

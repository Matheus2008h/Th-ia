import { pool } from '@config/database';

export interface UserProfile {
  name: string;
  language: string;
  responseStyle: string;
  personality: string | null;
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [rows] = await pool.query(
    'SELECT name, language, response_style AS responseStyle, personality FROM users WHERE id = :id',
    { id: userId }
  );
  return (rows as any[])[0];
}

export async function updateUserProfile(
  userId: string,
  data: Partial<{ name: string; language: string; responseStyle: string; personality: string }>
) {
  await pool.query(
    `UPDATE users SET
       name = COALESCE(:name, name),
       language = COALESCE(:language, language),
       response_style = COALESCE(:responseStyle, response_style),
       personality = COALESCE(:personality, personality)
     WHERE id = :userId`,
    {
      userId,
      name: data.name ?? null,
      language: data.language ?? null,
      responseStyle: data.responseStyle ?? null,
      personality: data.personality ?? null,
    }
  );
}

export interface MemoryFact {
  keyName: string;
  valueText: string;
  updatedAt: string;
}

export async function listMemoryFacts(userId: string): Promise<MemoryFact[]> {
  const [rows] = await pool.query(
    'SELECT key_name AS keyName, value_text AS valueText, updated_at AS updatedAt FROM user_memory WHERE user_id = :userId ORDER BY updated_at DESC',
    { userId }
  );
  return rows as MemoryFact[];
}

/** Cria ou atualiza um fato de memória (ex: "projeto_atual" -> "TH IA - plataforma de chat") */
export async function upsertMemoryFact(userId: string, keyName: string, valueText: string) {
  await pool.query(
    `INSERT INTO user_memory (id, user_id, key_name, value_text)
     VALUES (UUID(), :userId, :keyName, :valueText)
     ON DUPLICATE KEY UPDATE value_text = :valueText, updated_at = CURRENT_TIMESTAMP`,
    { userId, keyName, valueText }
  );
}

export async function deleteMemoryFact(userId: string, keyName: string) {
  await pool.query('DELETE FROM user_memory WHERE user_id = :userId AND key_name = :keyName', { userId, keyName });
}

/**
 * Monta o prompt de sistema com tudo que a IA deve "lembrar" sobre o usuário:
 * nome, idioma, estilo de resposta, personalidade configurada e os fatos de
 * memória longa salvos ao longo do tempo. Isso é injetado como mensagem
 * "system" em toda conversa, dando à IA memória persistente entre sessões.
 */
export async function buildMemorySystemPrompt(userId: string): Promise<string | null> {
  const profile = await getUserProfile(userId);
  const facts = await listMemoryFacts(userId);

  if (!profile) return null;

  const lines: string[] = [
    `Você está conversando com ${profile.name}.`,
    `Idioma preferido: ${profile.language || 'pt-BR'}.`,
    `Estilo de resposta preferido: ${profile.responseStyle || 'padrão'}.`,
  ];

  if (profile.personality) {
    lines.push(`Personalidade/tom que a IA deve adotar com este usuário: ${profile.personality}`);
  }

  if (facts.length > 0) {
    lines.push('Fatos que você deve lembrar sobre este usuário:');
    for (const fact of facts) {
      lines.push(`- ${fact.keyName}: ${fact.valueText}`);
    }
  }

  return lines.join('\n');
}

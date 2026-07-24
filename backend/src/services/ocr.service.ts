import { createWorker } from 'tesseract.js';

/**
 * Reconhece texto dentro de uma imagem (OCR) usando Tesseract.js — roda localmente,
 * sem depender de nenhuma API externa paga. Suporta português e inglês por padrão.
 */
export async function recognizeImageText(imagePath: string): Promise<string | null> {
  const worker = await createWorker(['por', 'eng']);
  try {
    const {
      data: { text },
    } = await worker.recognize(imagePath);
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (err: any) {
    console.warn(`[OCR] Falha ao processar imagem: ${err.message}`);
    return null;
  } finally {
    await worker.terminate();
  }
}

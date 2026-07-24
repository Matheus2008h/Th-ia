import fs from 'fs';
import path from 'path';

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.php', '.lua',
  '.json', '.xml', '.yaml', '.yml', '.sql', '.html', '.css',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);

export type FileKind = 'image' | 'pdf' | 'docx' | 'spreadsheet' | 'text' | 'other';

export function detectFileKind(ext: string): FileKind {
  const e = ext.toLowerCase();
  if (IMAGE_EXTENSIONS.has(e)) return 'image';
  if (e === '.pdf') return 'pdf';
  if (e === '.docx' || e === '.doc') return 'docx';
  if (e === '.xlsx' || e === '.xls') return 'spreadsheet';
  if (TEXT_EXTENSIONS.has(e)) return 'text';
  return 'other';
}

const MAX_EXTRACTED_CHARS = 12000; // evita estourar o contexto do modelo com arquivos gigantes

/**
 * Extrai texto de um arquivo já salvo em disco para ser usado como contexto pela IA.
 * Retorna null para tipos que a IA não consegue "ler" como texto (imagem, zip, áudio, vídeo, etc.)
 * — imagens seguem outro caminho (visão), tratado separadamente pelo provider multimodal.
 */
export async function extractTextFromFile(filePath: string, originalName: string): Promise<string | null> {
  const ext = path.extname(originalName).toLowerCase();
  const kind = detectFileKind(ext);

  try {
    switch (kind) {
      case 'image': {
        // OCR: reconhece texto dentro da imagem (prints, documentos escaneados, placas, etc.)
        // Isso é além da visão nativa do modelo — dá um texto pesquisável/confiável mesmo
        // se o provedor de IA configurado não suportar imagens.
        const { recognizeImageText } = await import('./ocr.service');
        const text = await recognizeImageText(filePath);
        return text ? truncate(text) : null;
      }
      case 'text': {
        const content = fs.readFileSync(filePath, 'utf8');
        return truncate(content);
      }
      case 'pdf': {
        const pdfParse = (await import('pdf-parse')).default;
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return truncate(data.text);
      }
      case 'docx': {
        const mammoth = await import('mammoth');
        const { value } = await mammoth.extractRawText({ path: filePath });
        return truncate(value);
      }
      case 'spreadsheet': {
        const XLSX = await import('xlsx');
        const workbook = XLSX.readFile(filePath);
        const sheets = workbook.SheetNames.map((name) => {
          const sheet = workbook.Sheets[name];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          return `## Planilha: ${name}\n${csv}`;
        });
        return truncate(sheets.join('\n\n'));
      }
      default:
        return null; // imagem, zip, áudio, vídeo etc. — não vira texto plano
    }
  } catch (err: any) {
    return `[Não foi possível extrair o conteúdo do arquivo "${originalName}": ${err.message}]`;
  }
}

function truncate(text: string): string {
  if (text.length <= MAX_EXTRACTED_CHARS) return text;
  return text.slice(0, MAX_EXTRACTED_CHARS) + '\n\n[... conteúdo truncado ...]';
}

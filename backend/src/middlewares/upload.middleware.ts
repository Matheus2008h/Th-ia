import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { env } from '@config/env';

if (!fs.existsSync(env.upload.dir)) {
  fs.mkdirSync(env.upload.dir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  // imagens
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  // documentos
  '.pdf', '.docx', '.doc', '.txt', '.md',
  // planilhas
  '.csv', '.xlsx', '.xls',
  // apresentações
  '.pptx', '.ppt',
  // compactados
  '.zip', '.rar',
  // código-fonte
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.php', '.lua', '.json', '.xml', '.yaml', '.yml', '.sql', '.html', '.css',
  // áudio/vídeo
  '.mp3', '.wav', '.ogg', '.mp4', '.mov', '.webm',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.upload.dir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${unique}${ext}`);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error(`Tipo de arquivo não suportado: ${ext}`));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.upload.maxSizeMb * 1024 * 1024 },
});

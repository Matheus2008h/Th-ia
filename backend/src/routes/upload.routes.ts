import { Router } from 'express';
import path from 'path';
import { authGuard } from '@middlewares/auth.middleware';
import { upload } from '@middlewares/upload.middleware';
import { extractTextFromFile, detectFileKind } from '@services/fileExtraction.service';
import { env } from '@config/env';

const router = Router();
router.use(authGuard);

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  const ext = path.extname(req.file.originalname);
  const kind = detectFileKind(ext);
  const extractedText = await extractTextFromFile(req.file.path, req.file.originalname);

  res.status(201).json({
    fileName: req.file.originalname,
    storedName: req.file.filename,
    url: `${env.appUrl}/uploads/${req.file.filename}`,
    kind, // image | pdf | docx | spreadsheet | text | other
    sizeBytes: req.file.size,
    mimeType: req.file.mimetype,
    // Texto extraído (quando aplicável) para ser usado como contexto pela IA.
    // Para imagens, o próprio arquivo é enviado ao modelo com capacidade de visão.
    extractedText,
  });
});

// Upload múltiplo (ex: vários documentos de uma vez)
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

  const results = await Promise.all(
    files.map(async (file) => {
      const ext = path.extname(file.originalname);
      const kind = detectFileKind(ext);
      const extractedText = await extractTextFromFile(file.path, file.originalname);
      return {
        fileName: file.originalname,
        storedName: file.filename,
        url: `${env.appUrl}/uploads/${file.filename}`,
        kind,
        sizeBytes: file.size,
        mimeType: file.mimetype,
        extractedText,
      };
    })
  );

  res.status(201).json(results);
});

export default router;

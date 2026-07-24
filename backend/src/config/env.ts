import dotenv from 'dotenv';
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:4000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  jwt: {
    secret: required('JWT_SECRET', 'dev_secret_change_me'),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'thia',
    password: process.env.DB_PASSWORD || 'thia_password',
    database: process.env.DB_NAME || 'th_ia',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  admin: {
    name: process.env.ADMIN_NAME || 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@thia.local',
    password: process.env.ADMIN_PASSWORD || 'change_this_password',
  },

  premium: {
    priceLabel: process.env.PREMIUM_PRICE || 'R$15/mês',
    whatsappNumber: process.env.PREMIUM_WHATSAPP_NUMBER || '5511942945429',
    whatsappMessage:
      process.env.PREMIUM_WHATSAPP_MESSAGE ||
      'Olá Theus, quero adquirir o premium do TH IA (TH-5.5)',
    keyDurationDays: Number(process.env.PREMIUM_KEY_DURATION_DAYS || 30),
  },

  free: {
    messageLimit: Number(process.env.FREE_MESSAGE_LIMIT || 15),
    windowHours: Number(process.env.FREE_MESSAGE_WINDOW_HOURS || 5),
  },

  providers: {
    openai: process.env.OPENAI_API_KEY || '',
    anthropic: process.env.ANTHROPIC_API_KEY || '',
    google: process.env.GOOGLE_API_KEY || '',
    mistral: process.env.MISTRAL_API_KEY || '',
    deepseek: process.env.DEEPSEEK_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    openrouter: process.env.OPENROUTER_API_KEY || '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  },

  upload: {
    maxSizeMb: Number(process.env.UPLOAD_MAX_SIZE_MB || 50),
    dir: process.env.UPLOAD_DIR || './uploads',
  },
};

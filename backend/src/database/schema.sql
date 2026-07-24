-- ==========================================================
-- TH IA (TH-5.5) - Schema completo do banco de dados MySQL
-- Executado automaticamente na inicialização (database/migrate.ts)
-- ==========================================================

CREATE DATABASE IF NOT EXISTS th_ia CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE th_ia;

-- ==========================================================
-- USERS
-- ==========================================================
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  plan ENUM('FREE','PREMIUM') NOT NULL DEFAULT 'FREE',
  language VARCHAR(10) DEFAULT 'pt-BR',
  response_style VARCHAR(50) DEFAULT 'padrao',
  personality TEXT NULL,
  avatar_url VARCHAR(255) NULL,
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  twofa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  twofa_secret VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- ADMINS (apenas 1 conta criada na instalação)
-- ==========================================================
CREATE TABLE IF NOT EXISTS admins (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- PLANS
-- ==========================================================
CREATE TABLE IF NOT EXISTS plans (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(60) NOT NULL,
  message_limit INT NULL,
  window_hours INT NULL,
  price_label VARCHAR(50) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO plans (id, code, name, message_limit, window_hours, price_label)
VALUES
  (UUID(), 'FREE', 'Free', 15, 5, 'Grátis'),
  (UUID(), 'PREMIUM', 'Premium', NULL, NULL, 'R$15/mês');

-- ==========================================================
-- LICENSE_KEYS (as keys geradas pelo admin)
-- Regras de negócio:
--  - Cada key só pode ser usada por 1 conta (uso único, "used_by_user_id")
--  - Depois de vinculada, nunca pode ser usada por outra conta
--  - Ao expirar (expires_at), o usuário volta automaticamente para FREE
--  - duration_days: 7, 30 (padrão do TH IA), 90 ou NULL (permanente)
-- ==========================================================
CREATE TABLE IF NOT EXISTS license_keys (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code VARCHAR(64) NOT NULL UNIQUE,
  plan VARCHAR(30) NOT NULL DEFAULT 'PREMIUM',
  duration_days INT NULL, -- NULL = permanente
  status ENUM('UNUSED','ACTIVE','EXPIRED','REVOKED') NOT NULL DEFAULT 'UNUSED',
  used_by_user_id CHAR(36) NULL,
  activation_ip VARCHAR(45) NULL,
  activated_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_by_admin_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (used_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- LICENSES (histórico de ativação de premium por usuário)
-- ==========================================================
CREATE TABLE IF NOT EXISTS licenses (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  key_id CHAR(36) NOT NULL,
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  activation_ip VARCHAR(45) NULL,
  status ENUM('ACTIVE','EXPIRED','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (key_id) REFERENCES license_keys(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- CONVERSATIONS
-- ==========================================================
CREATE TABLE IF NOT EXISTS conversations (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  title VARCHAR(180) NOT NULL DEFAULT 'Nova conversa',
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  model_used VARCHAR(60) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- MESSAGES
-- ==========================================================
CREATE TABLE IF NOT EXISTS messages (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  conversation_id CHAR(36) NOT NULL,
  role ENUM('user','assistant','system') NOT NULL,
  content MEDIUMTEXT NOT NULL,
  attachments JSON NULL,
  model_used VARCHAR(60) NULL,
  tokens_used INT NULL,
  edited BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- MEMORY (memória longa por usuário)
-- ==========================================================
CREATE TABLE IF NOT EXISTS user_memory (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  key_name VARCHAR(80) NOT NULL,
  value_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uniq_user_key (user_id, key_name)
) ENGINE=InnoDB;

-- ==========================================================
-- AI PROVIDERS / MODELS (configurados pelo admin)
-- ==========================================================
CREATE TABLE IF NOT EXISTS ai_providers (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name VARCHAR(60) NOT NULL,
  provider_key VARCHAR(30) NOT NULL, -- openai, anthropic, google, mistral, deepseek, groq, openrouter, ollama
  api_key_encrypted TEXT NULL,
  base_url VARCHAR(255) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_models (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  provider_id CHAR(36) NOT NULL,
  model_name VARCHAR(120) NOT NULL,
  task_type VARCHAR(60) NOT NULL DEFAULT 'chat', -- chat, vision, image_gen, code, audio
  priority INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES ai_providers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- USAGE / RATE LIMIT (janela de 5h do plano free)
-- ==========================================================
CREATE TABLE IF NOT EXISTS message_usage (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id CHAR(36) NOT NULL,
  window_start TIMESTAMP NOT NULL,
  message_count INT NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==========================================================
-- LOGS
-- ==========================================================
CREATE TABLE IF NOT EXISTS logs (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  actor_type ENUM('user','admin','system') NOT NULL,
  actor_id CHAR(36) NULL,
  action VARCHAR(120) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==========================================================
-- API_KEYS (acesso à API pública da plataforma, vendido separado do Premium)
-- Regras de negócio:
--  - Só o administrador pode gerar uma key.
--  - Fica ativa por 30 dias a partir da geração (mesmo padrão do Premium);
--    depois disso, para de funcionar automaticamente.
--  - Não está vinculada a uma conta de usuário — é usada por sistemas/integrações
--    externas que chamam a API pública (/api/v1/*) com o header Authorization.
-- ==========================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  key_code VARCHAR(80) NOT NULL UNIQUE,
  label VARCHAR(120) NULL, -- nome/identificação livre (ex: "Cliente X - integração Zapier")
  status ENUM('ACTIVE','EXPIRED','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  request_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP NULL,
  created_by_admin_id CHAR(36) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==========================================================
-- SETTINGS (configurações gerais da plataforma)
-- ==========================================================
CREATE TABLE IF NOT EXISTS settings (
  `key` VARCHAR(80) PRIMARY KEY,
  `value` TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (`key`, `value`) VALUES
  ('premium_price_label', 'R$15/mês'),
  ('premium_whatsapp_number', '5511942945429'),
  ('premium_key_duration_days', '30');

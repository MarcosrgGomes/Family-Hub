-- ============================================================
--  FamilyHub — Schema do Banco de Dados MySQL  (v5)
--
--  Novidades nesta versão:
--  + Tabela login_attempts para proteção contra brute force
--  + Índice composto em activity_logs (user_id, created_at)
--  + Índice em notifications.created_at para limpeza automática
--  + Evento de limpeza de tentativas de login antigas
--  + Evento de limpeza de notificações lidas com +90 dias
--
--  Execute: mysql -u root -p familyhub < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS familyhub
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE familyhub;

-- ─── Usuários ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(150)  NOT NULL,
  email         VARCHAR(200)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  phone         VARCHAR(20)   DEFAULT NULL,
  age           INT           DEFAULT NULL,
  family_name   VARCHAR(150)  DEFAULT 'Minha Família',
  is_active     TINYINT(1)    DEFAULT 1,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  last_login    TIMESTAMP     NULL,
  INDEX idx_email  (email),
  INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Dados da Família (JSON blob) ─────────────────────────
CREATE TABLE IF NOT EXISTS family_data (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  data_json   LONGTEXT     NOT NULL,
  version     INT          DEFAULT 1,
  updated_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_fd_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Notificações ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT         NOT NULL,
  type        ENUM('info','success','warning','achievement') DEFAULT 'info',
  icon        VARCHAR(50)  DEFAULT 'bell',
  is_read     TINYINT(1)   DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_read  (user_id, is_read),
  INDEX idx_user_date  (user_id, created_at),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Conquistas Desbloqueadas ──────────────────────────────
CREATE TABLE IF NOT EXISTS achievements_log (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  user_id        INT          NOT NULL,
  achievement_id VARCHAR(50)  NOT NULL,
  member_name    VARCHAR(100) DEFAULT NULL,
  unlocked_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_ach_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_ach_member (user_id, achievement_id, member_name),
  INDEX idx_user_ach (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Tokens de Sessão ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  token       VARCHAR(64)  NOT NULL UNIQUE,
  expires_at  TIMESTAMP    NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  user_agent  VARCHAR(500) DEFAULT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  CONSTRAINT fk_tok_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token      (token),
  INDEX idx_user_token (user_id, expires_at),
  INDEX idx_expires    (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Histórico de Pontos ──────────────────────────────────
CREATE TABLE IF NOT EXISTS points_log (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  member_name VARCHAR(100) NOT NULL,
  points      INT          NOT NULL,
  reason      VARCHAR(200) DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pts_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_member (user_id, member_name),
  INDEX idx_date        (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Eventos de Atividade ─────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  event_type  VARCHAR(50)  NOT NULL,
  payload     JSON         DEFAULT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_evt_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_type (user_id, event_type),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Histórico de Ações do Sistema ────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT          NOT NULL,
  description VARCHAR(255) NOT NULL,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_log_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_log_user  (user_id),
  INDEX idx_log_date  (created_at),
  INDEX idx_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Rate Limiting — Proteção Brute Force (v5) ────────────
--
--  Registra tentativas de login por IP.
--  Regras padrão (configuráveis no .env):
--    RATE_LIMIT_ATTEMPTS = 5  (tentativas máximas)
--    RATE_LIMIT_WINDOW   = 15 (minutos de janela)
--    RATE_LIMIT_LOCKOUT  = 30 (minutos de bloqueio)
--
CREATE TABLE IF NOT EXISTS login_attempts (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  ip_address   VARCHAR(45)  NOT NULL,
  email        VARCHAR(200) DEFAULT NULL,
  success      TINYINT(1)   DEFAULT 0,
  attempted_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_ip_date    (ip_address, attempted_at),
  INDEX idx_email_date (email, attempted_at),
  INDEX idx_attempted  (attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  EVENTOS AGENDADOS (requer event_scheduler = ON)
--  Ative com: SET GLOBAL event_scheduler = ON;
-- ============================================================

DROP EVENT IF EXISTS cleanup_expired_tokens;
CREATE EVENT cleanup_expired_tokens
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM auth_tokens WHERE expires_at < NOW();

DROP EVENT IF EXISTS cleanup_login_attempts;
CREATE EVENT cleanup_login_attempts
  ON SCHEDULE EVERY 1 DAY STARTS CURRENT_TIMESTAMP
  DO DELETE FROM login_attempts WHERE attempted_at < DATE_SUB(NOW(), INTERVAL 24 HOUR);

DROP EVENT IF EXISTS cleanup_old_notifications;
CREATE EVENT cleanup_old_notifications
  ON SCHEDULE EVERY 1 WEEK STARTS CURRENT_TIMESTAMP
  DO DELETE FROM notifications
     WHERE is_read = 1 AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);



-- Execute conectado ao banco techcycle: psql "$DATABASE_URL" -f database/schema.sql

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(30) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_username_format CHECK (username ~ '^[[:upper:]][[:alpha:]]*$')
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'member';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('member', 'admin'));
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique ON users (LOWER(username));
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS about_me TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_public BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_sort VARCHAR(16) NOT NULL DEFAULT 'recent';
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_categories SMALLINT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS admin_creation_tokens (
  id BIGSERIAL PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS admin_creation_tokens_available_idx ON admin_creation_tokens(token_hash) WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  address TEXT NOT NULL,
  cep VARCHAR(9) NOT NULL,
  contact VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  image_data TEXT,
  status VARCHAR(16) NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_review', 'resolved', 'closed')),
  admin_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reports_created_idx ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);

CREATE TABLE IF NOT EXISTS profile_photo_suggestions (
  id SMALLSERIAL PRIMARY KEY,
  title VARCHAR(80) NOT NULL,
  image_url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO profile_photo_suggestions (title, image_url) VALUES
  ('Folhas e natureza', 'https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=360&q=80'),
  ('Floresta sustentável', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=360&q=80'),
  ('Reciclagem criativa', 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=360&q=80'),
  ('Energia limpa', 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=360&q=80'),
  ('Vida ao ar livre', 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=360&q=80'),
  ('Horta urbana', 'https://images.unsplash.com/photo-1492496913980-501348b61469?auto=format&fit=crop&w=360&q=80'),
  ('Oceano preservado', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=360&q=80'),
  ('Montanhas verdes', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=360&q=80'),
  ('Mobilidade sustentavel', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=360&q=80')
ON CONFLICT (image_url) DO NOTHING;

-- Mantém o filtro de nomes editável sem modificar código da aplicação.
CREATE TABLE IF NOT EXISTS blocked_usernames (
  normalized_username VARCHAR(30) PRIMARY KEY,
  category VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id BIGSERIAL PRIMARY KEY,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS posts (
  id BIGSERIAL PRIMARY KEY,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(160),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS posts_author_created_idx ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE TABLE IF NOT EXISTS post_likes (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS comments_post_created_idx ON comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS post_favorites (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS post_favorites_post_idx ON post_favorites(post_id);

-- Comunidade: evolui as publicações existentes sem criar uma área paralela.
CREATE TABLE IF NOT EXISTS idea_categories (
  id SMALLSERIAL PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE,
  slug VARCHAR(60) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO idea_categories (name, slug) VALUES
  ('Tecnologia', 'tecnologia'), ('Sustentabilidade', 'sustentabilidade'),
  ('Educação', 'educacao'), ('Inovação', 'inovacao'),
  ('Meio ambiente', 'meio-ambiente'), ('Comunidade', 'comunidade'), ('Outros', 'outros')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id SMALLINT REFERENCES idea_categories(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'published'
  CHECK (status IN ('published', 'pending', 'hidden', 'deleted'));
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_data TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_data TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS cover_data TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'idea';
UPDATE posts SET content_type = 'tutorial' WHERE video_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_category_created_idx ON posts(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_status_created_idx ON posts(status, created_at DESC);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id BIGINT REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'published'
  CHECK (status IN ('published', 'pending', 'hidden', 'deleted'));
CREATE INDEX IF NOT EXISTS comments_parent_idx ON comments(parent_id, created_at ASC);

CREATE TABLE IF NOT EXISTS post_ratings (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_ratings_user_post_unique UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS post_ratings_post_idx ON post_ratings(post_id);

require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = 'techcycle_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32) throw new Error('SESSION_SECRET deve ter pelo menos 32 caracteres.');

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '3mb' }));
app.use(cookieParser(sessionSecret));
app.use(['/pages/feed.html', '/pages/perfil.html', '/pages/favoritos.html', '/pages/criar-post.html'], requirePageAuth);
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const hashToken = (token) => crypto.createHmac('sha256', sessionSecret).update(token).digest('hex');
const newToken = () => crypto.randomBytes(32).toString('base64url');
const normalizeUsername = (value) => typeof value === 'string' ? value.trim() : '';
const validUsername = (username) => /^\p{Lu}[\p{L}]*$/u.test(username) && username.length <= 30;
const normalizedUsername = (username) => username.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const publicUser = (user) => ({ id: user.id, username: user.username, profileImage: user.profile_image || null, createdAt: user.created_at });

async function usernameIsBlocked(username) {
  const result = await db.query('SELECT 1 FROM blocked_usernames WHERE normalized_username = $1', [normalizedUsername(username)]);
  return result.rowCount > 0;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (password.length > 128) return 'A senha deve ter no máximo 128 caracteres.';
  return null;
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/', maxAge: SESSION_TTL_MS });
}
function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: isProduction, sameSite: 'lax', path: '/' });
}
async function createSession(userId, res) {
  const token = newToken();
  await db.query('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'7 days\')', [hashToken(token), userId]);
  setSessionCookie(res, token);
}
async function currentUser(req) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
    const result = await db.query(`SELECT users.id, users.username, users.profile_image, users.created_at
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = $1 AND sessions.expires_at > NOW()`, [hashToken(token)]);
  return result.rows[0] || null;
}
async function requireApiAuth(req, res, next) {
  try {
    const user = await currentUser(req);
    if (!user) return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    req.user = user;
    return next();
  } catch (error) { return next(error); }
}
async function requirePageAuth(req, res, next) {
  try {
    if (await currentUser(req)) return next();
    const target = encodeURIComponent(req.originalUrl);
    return res.redirect(`/login?next=${target}`);
  } catch (error) { return next(error); }
}

app.post('/api/auth/username/check', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    if (!validUsername(username)) return res.status(400).json({ error: 'Use somente letras e inicie o nome de usuário com letra maiúscula.' });
    if (await usernameIsBlocked(username)) return res.status(422).json({ error: 'Este nome de usuário não está disponível.' });
    const result = await db.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    return res.json({ exists: result.rowCount > 0 });
  } catch (error) { return next(error); }
});
app.post('/api/auth/register', authLimiter, async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password, confirmPassword } = req.body;
    if (!validUsername(username)) return res.status(400).json({ error: 'O nome de usuário deve conter apenas letras e começar com letra maiúscula.' });
    if (await usernameIsBlocked(username)) return res.status(422).json({ error: 'Este nome de usuário não está disponível.' });
    const passwordError = validatePassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    if (password !== confirmPassword) return res.status(400).json({ error: 'As senhas não conferem.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, profile_image, created_at', [username, passwordHash]);
    const user = result.rows[0];
    await createSession(user.id, res);
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Este nome de usuário já está em uso.' });
    return next(error);
  }
});
app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username);
    const { password } = req.body;
    if (!validUsername(username) || typeof password !== 'string') return res.status(400).json({ error: 'Nome de usuário e senha são obrigatórios.' });
    const result = await db.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Nome de usuário ou senha inválidos.' });
    await createSession(user.id, res);
    return res.json({ user: publicUser(user) });
  } catch (error) { return next(error); }
});
app.get('/api/auth/session', requireApiAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.post('/api/auth/logout', async (req, res, next) => {
  try {
    if (req.cookies[SESSION_COOKIE]) await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(req.cookies[SESSION_COOKIE])]);
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (error) { return next(error); }
});

const cleanText = (value, max, required = true) => {
  if (typeof value !== 'string') return required ? null : '';
  const text = value.trim().replace(/[<>]/g, '');
  return (!required && !text) || (text.length >= 1 && text.length <= max) ? text : null;
};
const cleanTags = (value) => {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(raw.map((tag) => String(tag).trim().replace(/^#/, '').replace(/[^\p{L}\p{N}_-]/gu, '')).filter(Boolean).slice(0, 8))];
};
const ideaFields = `p.id, p.title, p.content, p.tags, p.image_data, p.status, p.created_at, p.updated_at, p.views,
  u.id AS author_id, u.username AS author_name, u.profile_image AS author_profile_image, c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
  COALESCE(r.rating_count, 0)::int AS rating_count, COALESCE(r.average_rating, 0)::float AS average_rating,
  COALESCE(cm.comment_count, 0)::int AS comment_count`;
const ideaJoins = `FROM posts p JOIN users u ON u.id = p.author_id
  LEFT JOIN idea_categories c ON c.id = p.category_id
  LEFT JOIN (SELECT post_id, COUNT(*) AS rating_count, ROUND(AVG(rating), 1) AS average_rating FROM post_ratings GROUP BY post_id) r ON r.post_id = p.id
  LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM comments WHERE status = 'published' GROUP BY post_id) cm ON cm.post_id = p.id`;
const cleanImage = (value) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(value) || value.length > 2_800_000) return undefined;
  return value;
};

app.get('/api/categories', async (req, res, next) => {
  try { res.json({ categories: (await db.query('SELECT id, name, slug FROM idea_categories ORDER BY name')).rows }); } catch (error) { next(error); }
});
app.get('/api/ideas', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 12, 1), 50);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const search = cleanText(String(req.query.search || ''), 120, false);
    const category = cleanText(String(req.query.category || ''), 60, false);
    const orders = { recent: 'p.created_at DESC', rated: 'average_rating DESC, rating_count DESC, p.created_at DESC', commented: 'comment_count DESC, p.created_at DESC' };
    const order = orders[req.query.sort] || orders.recent;
    const values = [];
    const where = ["p.status = 'published'"];
    if (search) { values.push(`%${search}%`); where.push(`(p.title ILIKE $${values.length} OR p.content ILIKE $${values.length} OR c.name ILIKE $${values.length} OR array_to_string(p.tags, ' ') ILIKE $${values.length})`); }
    if (category) { values.push(category); where.push(`c.slug = $${values.length}`); }
    const count = await db.query(`SELECT COUNT(*) ${ideaJoins} WHERE ${where.join(' AND ')}`, values);
    values.push(limit, (page - 1) * limit);
    const result = await db.query(`SELECT ${ideaFields} ${ideaJoins} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    res.json({ ideas: result.rows, page, total: Number(count.rows[0].count), pages: Math.ceil(Number(count.rows[0].count) / limit) });
  } catch (error) { next(error); }
});
app.get('/api/ideas/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id); if (!Number.isSafeInteger(id)) return res.status(400).json({ error: 'Ideia inválida.' });
    const result = await db.query(`SELECT ${ideaFields} ${ideaJoins} WHERE p.id = $1 AND p.status = 'published'`, [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Ideia não encontrada.' });
    db.query('UPDATE posts SET views = views + 1 WHERE id = $1', [id]).catch(() => {});
    res.json({ idea: result.rows[0] });
  } catch (error) { next(error); }
});
app.post('/api/ideas', requireApiAuth, async (req, res, next) => {
  try {
    const title = cleanText(req.body.title, 160); const content = cleanText(req.body.content, 5000);
    const categoryId = Number(req.body.categoryId); const tags = cleanTags(req.body.tags); const imageData = cleanImage(req.body.imageData);
    if (!title || !content || !Number.isSafeInteger(categoryId)) return res.status(400).json({ error: 'Informe título, descrição e categoria válidos.' });
    if (imageData === undefined) return res.status(400).json({ error: 'Envie uma imagem PNG, JPG, WEBP ou GIF de até 2 MB.' });
    const category = await db.query('SELECT id FROM idea_categories WHERE id = $1', [categoryId]);
    if (!category.rowCount) return res.status(400).json({ error: 'Categoria inválida.' });
    const result = await db.query('INSERT INTO posts (author_id, title, content, category_id, tags, image_data) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id', [req.user.id, title, content, categoryId, tags, imageData]);
    res.status(201).json({ id: result.rows[0].id });
  } catch (error) { next(error); }
});
app.put('/api/ideas/:id', requireApiAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id); const title = cleanText(req.body.title, 160); const content = cleanText(req.body.content, 5000); const categoryId = Number(req.body.categoryId);
    if (!Number.isSafeInteger(id) || !title || !content || !Number.isSafeInteger(categoryId)) return res.status(400).json({ error: 'Dados inválidos.' });
    const result = await db.query('UPDATE posts SET title=$1, content=$2, category_id=$3, tags=$4, updated_at=NOW() WHERE id=$5 AND author_id=$6 AND status <> \'deleted\' RETURNING id', [title, content, categoryId, cleanTags(req.body.tags), id, req.user.id]);
    if (!result.rowCount) return res.status(403).json({ error: 'Você não pode editar esta ideia.' }); res.json({ id });
  } catch (error) { next(error); }
});
app.delete('/api/ideas/:id', requireApiAuth, async (req, res, next) => {
  try { const result = await db.query("UPDATE posts SET status='deleted', updated_at=NOW() WHERE id=$1 AND author_id=$2 AND status <> 'deleted' RETURNING id", [Number(req.params.id), req.user.id]); if (!result.rowCount) return res.status(403).json({ error: 'Você não pode excluir esta ideia.' }); res.status(204).end(); } catch (error) { next(error); }
});
app.post('/api/ideas/:id/rating', requireApiAuth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id); const rating = Number(req.body.rating);
    if (!Number.isSafeInteger(postId) || !Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'A avaliação deve ser de 1 a 5.' });
    const exists = await db.query("SELECT id FROM posts WHERE id=$1 AND status='published'", [postId]); if (!exists.rowCount) return res.status(404).json({ error: 'Ideia não encontrada.' });
    await db.query('INSERT INTO post_ratings (post_id, user_id, rating) VALUES ($1,$2,$3) ON CONFLICT (post_id,user_id) DO UPDATE SET rating=EXCLUDED.rating, updated_at=NOW()', [postId, req.user.id, rating]);
    res.status(204).end();
  } catch (error) { next(error); }
});
app.get('/api/ideas/:id/comments', async (req, res, next) => {
  try { const result = await db.query(`SELECT cm.id, cm.content, cm.parent_id, cm.created_at, cm.updated_at, u.id author_id, u.username author_name, u.profile_image AS author_profile_image FROM comments cm JOIN users u ON u.id=cm.author_id WHERE cm.post_id=$1 AND cm.status='published' ORDER BY cm.created_at ASC`, [Number(req.params.id)]); res.json({ comments: result.rows }); } catch (error) { next(error); }
});
app.post('/api/ideas/:id/comments', requireApiAuth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id); const content = cleanText(req.body.content, 1500); const parentId = req.body.parentId == null ? null : Number(req.body.parentId);
    if (!Number.isSafeInteger(postId) || !content || (parentId !== null && !Number.isSafeInteger(parentId))) return res.status(400).json({ error: 'Comentário inválido.' });
    const post = await db.query("SELECT id FROM posts WHERE id=$1 AND status='published'", [postId]); if (!post.rowCount) return res.status(404).json({ error: 'Ideia não encontrada.' });
    if (parentId !== null) { const parent = await db.query('SELECT id FROM comments WHERE id=$1 AND post_id=$2 AND status=\'published\'', [parentId, postId]); if (!parent.rowCount) return res.status(400).json({ error: 'Resposta inválida.' }); }
    const result = await db.query('INSERT INTO comments (post_id, author_id, content, parent_id) VALUES ($1,$2,$3,$4) RETURNING id', [postId, req.user.id, content, parentId]); res.status(201).json({ id: result.rows[0].id });
  } catch (error) { next(error); }
});
app.put('/api/comments/:id', requireApiAuth, async (req, res, next) => {
  try { const content = cleanText(req.body.content, 1500); if (!content) return res.status(400).json({ error: 'Comentário inválido.' }); const result = await db.query("UPDATE comments SET content=$1, updated_at=NOW() WHERE id=$2 AND author_id=$3 AND status='published' RETURNING id", [content, Number(req.params.id), req.user.id]); if (!result.rowCount) return res.status(403).json({ error: 'Você não pode editar este comentário.' }); res.json({ id: result.rows[0].id }); } catch (error) { next(error); }
});
app.delete('/api/comments/:id', requireApiAuth, async (req, res, next) => {
  try { const result = await db.query("UPDATE comments SET status='deleted', updated_at=NOW() WHERE id=$1 AND author_id=$2 AND status='published' RETURNING id", [Number(req.params.id), req.user.id]); if (!result.rowCount) return res.status(403).json({ error: 'Você não pode excluir este comentário.' }); res.status(204).end(); } catch (error) { next(error); }
});
app.get('/api/me/ideas', requireApiAuth, async (req, res, next) => {
  try { const result = await db.query(`SELECT ${ideaFields} ${ideaJoins} WHERE p.author_id=$1 AND p.status <> 'deleted' ORDER BY p.created_at DESC`, [req.user.id]); res.json({ ideas: result.rows }); } catch (error) { next(error); }
});
app.get('/api/profile/photo-suggestions', requireApiAuth, async (req, res, next) => {
  try { res.json({ suggestions: (await db.query('SELECT id, title, image_url FROM profile_photo_suggestions ORDER BY id')).rows }); } catch (error) { next(error); }
});
app.put('/api/me/profile-photo', requireApiAuth, async (req, res, next) => {
  try {
    let profileImage = null;
    if (req.body.suggestionId != null) {
      const suggestion = await db.query('SELECT image_url FROM profile_photo_suggestions WHERE id=$1', [Number(req.body.suggestionId)]);
      if (!suggestion.rowCount) return res.status(400).json({ error: 'Sugestão de foto inválida.' });
      profileImage = suggestion.rows[0].image_url;
    } else {
      profileImage = cleanImage(req.body.imageData);
      if (profileImage === undefined || !profileImage) return res.status(400).json({ error: 'Envie uma imagem PNG, JPG, WEBP ou GIF de até 2 MB.' });
    }
    const result = await db.query('UPDATE users SET profile_image=$1, updated_at=NOW() WHERE id=$2 RETURNING id, username, profile_image, created_at', [profileImage, req.user.id]);
    res.json({ user: publicUser(result.rows[0]) });
  } catch (error) { next(error); }
});

app.get(['/feed', '/perfil', '/favoritos', '/criar-post', '/pages/feed.html', '/pages/perfil.html', '/pages/favoritos.html', '/pages/criar-post.html'], requirePageAuth, (req, res) => res.sendFile(path.join(__dirname, 'pages', `${path.basename(req.path, '.html')}.html`)));
app.get(['/comunidade', '/pages/comunidade.html'], (req, res) => res.sendFile(path.join(__dirname, 'pages', 'comunidade.html')));
app.get(['/ideia/:id', '/pages/ideia.html'], (req, res) => res.sendFile(path.join(__dirname, 'pages', 'ideia.html')));
app.get(['/login', '/pages/login.html'], (req, res) => res.sendFile(path.join(__dirname, 'pages', 'login.html')));
app.get(['/cadastro', '/pages/cadastro.html'], (req, res) => res.sendFile(path.join(__dirname, 'pages', 'cadastro.html')));
app.get('/', (req, res) => res.redirect('/login'));
app.use((error, req, res, next) => { console.error(error); res.status(500).json({ error: 'Erro interno do servidor.' }); });
app.listen(PORT, () => console.log(`TechCycle em http://localhost:${PORT}`));

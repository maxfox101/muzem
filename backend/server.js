import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const FORM_ACCESS_SECRET = process.env.FORM_ACCESS_JWT_SECRET || `${JWT_SECRET}.form_access_v1`;

function createToken(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

function createFormAccessToken(codeRowId) {
  return jwt.sign({ typ: 'form_access', cid: codeRowId }, FORM_ACCESS_SECRET, { expiresIn: '30d' });
}

function authMiddleware(req, res, next) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(h.slice(7), JWT_SECRET);
      req.userId = payload.userId;
    } catch (e) {}
  }
  next();
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.warn('ВНИМАНИЕ: файл .env не найден:', envPath);
  console.warn('Создайте backend\\.env с переменными DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT');
}
dotenv.config({ path: envPath });

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const app = express();
const PORT = process.env.PORT || 3000;

const mailFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@hero.local';
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const mailTransport = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function sendMailSafe({ to, subject, text }) {
  if (!to) return;
  if (!mailTransport) {
    console.log(`[mail:disabled] to=${to} subject="${subject}" text="${text}"`);
    return;
  }
  try {
    await mailTransport.sendMail({ from: mailFrom, to, subject, text });
  } catch (e) {
    console.warn('Mail send error:', e.message);
  }
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(String(value));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (_) {
    return {};
  }
}

function parseCustomFormFields(value) {
  let parsed = [];
  if (Array.isArray(value)) parsed = value;
  else if (typeof value === 'string') {
    try {
      const tmp = JSON.parse(value);
      if (Array.isArray(tmp)) parsed = tmp;
    } catch (_) {}
  }
  return parsed
    .map((f) => ({
      key: String(f?.key || '').trim(),
      label: String(f?.label || '').trim(),
      type: ['text', 'textarea', 'select', 'date'].includes(f?.type) ? f.type : 'text',
      required: Boolean(f?.required),
      options: Array.isArray(f?.options) ? f.options.map((o) => String(o).trim()).filter(Boolean) : [],
    }))
    .filter((f) => f.key && f.label);
}

async function ensureApplicationConfigSchema() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS application_submission_config (
      id SERIAL PRIMARY KEY,
      is_enabled BOOLEAN DEFAULT TRUE,
      disabled_message TEXT DEFAULT '',
      custom_form_fields JSONB DEFAULT '[]'::jsonb
    )`
  );
  await pool.query(
    `ALTER TABLE application_submission_config
     ADD COLUMN IF NOT EXISTS custom_form_fields JSONB DEFAULT '[]'::jsonb`
  );
  await pool.query(
    `ALTER TABLE application_submission_config
     ADD COLUMN IF NOT EXISTS show_photo BOOLEAN DEFAULT TRUE`
  );
  await pool.query(
    `ALTER TABLE application_submission_config
     ADD COLUMN IF NOT EXISTS show_cloud_link BOOLEAN DEFAULT TRUE`
  );
  await pool.query(
    `ALTER TABLE applications
     ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb`
  );
  await pool.query(
    `INSERT INTO application_submission_config (id, is_enabled, disabled_message, custom_form_fields, show_photo, show_cloud_link)
     VALUES (1, TRUE, '', '[]'::jsonb, TRUE, TRUE)
     ON CONFLICT (id) DO NOTHING`
  );
}

async function ensureFormAccessSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS application_access_codes (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      label TEXT DEFAULT '',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function seedDefaultFormAccessCode() {
  await ensureFormAccessSchema();
  const c = await pool.query('SELECT COUNT(*)::int AS n FROM application_access_codes');
  if (c.rows[0].n === 0) {
    await pool.query(
      `INSERT INTO application_access_codes (code, label) VALUES ($1, $2)`,
      ['invite-1', 'Начальный код — смените в админ-панели']
    );
    console.log('Доступ к форме: создан код invite-1 (измените в разделе «Коды доступа»).');
  }
}

function requireAdmin(req, res, next) {
  (async () => {
    if (!req.userId) {
      res.status(401).json({ error: 'Необходима авторизация' });
      return;
    }
    const r = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
    if (r.rows[0]?.role !== 'admin') {
      res.status(403).json({ error: 'Только для администратора' });
      return;
    }
    next();
  })().catch((e) => res.status(500).json({ error: e.message }));
}

function requireFormAccess(req, res, next) {
  (async () => {
    const raw = req.headers['x-form-access-token'];
    if (!raw || typeof raw !== 'string') {
      res.status(403).json({
        error: 'Нужен доступ к форме: введите код приглашения или откройте ссылку с кодом от администратора.',
      });
      return;
    }
    let cid;
    try {
      const p = jwt.verify(String(raw).trim(), FORM_ACCESS_SECRET);
      if (p.typ !== 'form_access') throw new Error('bad type');
      cid = Number(p.cid);
      if (!Number.isFinite(cid)) throw new Error('bad cid');
    } catch {
      res.status(403).json({ error: 'Код доступа недействителен или истёк. Запросите новую ссылку.' });
      return;
    }
    const ok = await pool.query(
      'SELECT 1 FROM application_access_codes WHERE id = $1 AND is_active = TRUE',
      [cid]
    );
    if (ok.rows.length === 0) {
      res.status(403).json({ error: 'Этот код доступа отключён. Обратитесь к администратору.' });
      return;
    }
    next();
  })().catch((e) => res.status(500).json({ error: e.message }));
}

// PostgreSQL подключение
const dbConfig = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hero_memorial',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432', 10),
};
const pool = new Pool(dbConfig);
// Все запросы к БД — в UTF-8 (исправляет «кракозябры» в справочниках)
pool.on('connect', (client) => {
  client.query("SET client_encoding TO 'UTF8'").catch((err) => console.warn('SET client_encoding:', err?.message));
});

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});
app.use(authMiddleware);
app.use(express.static('public'));

// Multer для загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 МБ
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
      cb(null, true);
    } else {
      cb(new Error('Только JPEG и PNG разрешены'));
    }
  },
});

// Проверка работы сервера (без БД)
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'API сервиса заявок', port: PORT });
});

app.get('/api/health', (req, res) => {
  pool.query('SELECT 1').then(() => {
    res.json({ ok: true, db: 'connected' });
  }).catch((err) => {
    res.status(500).json({ ok: false, db: 'error', error: err.message });
  });
});

// ——— Авторизация ———
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }
    const r = await pool.query(
      'SELECT id, email, name, role, phone, password_hash FROM users WHERE email = $1',
      [String(email).trim().toLowerCase()]
    );
    if (r.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    const u = { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone ?? null };
    res.json({ user: u, token: createToken(u) });
  } catch (err) {
    console.error('Login error:', err.message);
    const msg = err.code === 'ECONNREFUSED' || err.message?.includes('connect') || err.message?.includes('postgres')
      ? 'Нет связи с базой данных. Проверьте: 1) PostgreSQL запущен, 2) в папке backend есть файл .env с верным DB_PASSWORD (пароль пользователя postgres).'
      : 'Ошибка сервера. Попробуйте позже.';
    res.status(500).json({ error: msg });
  }
});

// Сид тестовых пользователей (всегда обновляем пароль по email)
async function seedTestUsers() {
  try {
    await pool.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT COALESCE(MAX(id), 1) FROM users))`);
    const hash = await bcrypt.hash('password', 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES
       ('Пользователь', 'user@example.com', $1, 'sender'),
       ('Модератор', 'moderator@example.com', $1, 'moderator'),
       ('Администратор', 'admin@example.com', $1, 'admin')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role`,
      [hash]
    );
    console.log('Тестовые пользователи: user@example.com, moderator@example.com, admin@example.com (пароль: password)');
  } catch (e) {
    console.warn('Сид пользователей:', e.message);
  }
}

// Безопасное исправление «кракозябр» в справочниках (UPDATE по id, без DELETE). Вызывать при FIX_DICTIONARIES_UTF8=1.
async function fixDictionariesUtf8() {
  const names = {
    ranks: ['Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант', 'Старший сержант', 'Старшина', 'Прапорщик', 'Старший прапорщик', 'Младший лейтенант', 'Лейтенант', 'Старший лейтенант', 'Капитан', 'Майор', 'Подполковник', 'Полковник', 'Генерал-майор', 'Генерал-лейтенант', 'Генерал-полковник'],
    localities: ['Ростов-на-Дону', 'Таганрог', 'Шахты', 'Новочеркасск', 'Волгодонск', 'Батайск', 'Новошахтинск', 'Азов', 'Каменск-Шахтинский', 'Гуково'],
    service_places: ['Сухопутные войска', 'Военно-морской флот', 'Воздушно-космические силы', 'Воздушно-десантные войска', 'Ракетные войска стратегического назначения', 'Войска национальной гвардии', 'Пограничная служба', 'Другое'],
  };
  try {
    for (let i = 0; i < names.ranks.length; i++) {
      await pool.query('UPDATE ranks SET name = $1 WHERE id = $2', [names.ranks[i], i + 1]);
    }
    for (let i = 0; i < names.localities.length; i++) {
      await pool.query('UPDATE localities SET name = $1 WHERE id = $2', [names.localities[i], i + 1]);
    }
    for (let i = 0; i < names.service_places.length; i++) {
      await pool.query('UPDATE service_places SET name = $1 WHERE id = $2', [names.service_places[i], i + 1]);
    }
    console.log('Справочники (ranks, localities, service_places): кодировка UTF-8 исправлена.');
  } catch (e) {
    console.warn('fixDictionariesUtf8:', e.message);
  }
}

// Регистрация (только роль sender)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body || {};
    const emailNorm = String(email || '').trim().toLowerCase();
    if (!emailNorm || !password) {
      return res.status(400).json({ error: 'Укажите email и пароль' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль не менее 6 символов' });
    }
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [emailNorm]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Такой email уже зарегистрирован' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const r = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone) VALUES ($1, $2, $3, 'sender', $4) RETURNING id, email, name, role, phone`,
      [String(name || emailNorm).trim() || 'Пользователь', emailNorm, password_hash, (phone && String(phone).trim()) || null]
    );
    const u = r.rows[0];
    const user = { id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone || null };
    res.status(201).json({ user, token: createToken(user) });
  } catch (err) {
    console.error('Register error:', err.message);
    const msg = err.code === 'ECONNREFUSED' || err.message?.includes('connect') || err.message?.includes('postgres')
      ? 'Нет связи с базой данных. Проверьте: 1) PostgreSQL запущен, 2) в папке backend есть файл .env с верным DB_PASSWORD (пароль пользователя postgres).'
      : 'Ошибка сервера. Попробуйте позже.';
    res.status(500).json({ error: msg });
  }
});

// Профиль (авторизованный пользователь)
app.get('/api/profile', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Необходима авторизация' });
  try {
    const r = await pool.query('SELECT id, email, name, role, phone FROM users WHERE id = $1', [req.userId]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Пользователь не найден' });
    const u = r.rows[0];
    res.json({ data: { id: u.id, email: u.email, name: u.name, role: u.role, phone: u.phone || null } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/profile', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Необходима авторизация' });
  try {
    const { name, phone } = req.body || {};
    await pool.query(
      'UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone) WHERE id = $3',
      [name != null ? String(name).trim() : null, phone != null ? String(phone).trim() : null, req.userId]
    );
    const r = await pool.query('SELECT id, email, name, role, phone FROM users WHERE id = $1', [req.userId]);
    res.json({ data: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Контакты поддержки (для всех)
app.get('/api/support', async (req, res) => {
  try {
    const r = await pool.query('SELECT email, phone FROM support_contacts WHERE id = 1');
    res.json({ data: r.rows[0] || { email: 'support@example.com', phone: '+7 (000) 000-00-00' } });
  } catch (e) {
    res.json({ data: { email: 'support@example.com', phone: '+7 (000) 000-00-00' } });
  }
});

// API Routes

// Справочники (DISTINCT ON по name — без дубликатов в выпадающих списках)
app.get('/api/dictionaries/ranks', async (req, res) => {
  try {
    // Звания по старшинству, а не по алфавиту
    const result = await pool.query(`
      SELECT id, name
      FROM ranks
      ORDER BY CASE name
        WHEN 'Рядовой' THEN 1
        WHEN 'Ефрейтор' THEN 2
        WHEN 'Младший сержант' THEN 3
        WHEN 'Сержант' THEN 4
        WHEN 'Старший сержант' THEN 5
        WHEN 'Старшина' THEN 6
        WHEN 'Прапорщик' THEN 7
        WHEN 'Старший прапорщик' THEN 8
        WHEN 'Младший лейтенант' THEN 9
        WHEN 'Лейтенант' THEN 10
        WHEN 'Старший лейтенант' THEN 11
        WHEN 'Капитан' THEN 12
        WHEN 'Майор' THEN 13
        WHEN 'Подполковник' THEN 14
        WHEN 'Полковник' THEN 15
        WHEN 'Генерал-майор' THEN 16
        WHEN 'Генерал-лейтенант' THEN 17
        WHEN 'Генерал-полковник' THEN 18
        ELSE 999
      END, id
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dictionaries/localities', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT ON (name) id, name FROM localities ORDER BY name, id');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/dictionaries/service-places', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT ON (name) id, name FROM service_places ORDER BY name, id');
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Доступ к форме заявки (код приглашения или ссылка ?code=)
app.post('/api/application-access/verify', async (req, res) => {
  try {
    await ensureFormAccessSchema();
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Укажите код доступа' });
    const r = await pool.query(
      'SELECT id FROM application_access_codes WHERE code = $1 AND is_active = TRUE',
      [code]
    );
    if (r.rows.length === 0) return res.status(403).json({ error: 'Неверный или отключённый код доступа' });
    const token = createFormAccessToken(r.rows[0].id);
    res.json({ data: { token } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/admin/form-access-codes', requireAdmin, async (req, res) => {
  try {
    await ensureFormAccessSchema();
    const r = await pool.query(
      'SELECT id, code, label, is_active, created_at FROM application_access_codes ORDER BY id DESC'
    );
    res.json({ data: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/form-access-codes', requireAdmin, async (req, res) => {
  try {
    await ensureFormAccessSchema();
    const code = String(req.body?.code || '').trim();
    const label = String(req.body?.label || '').trim();
    if (!code) return res.status(400).json({ error: 'Укажите код' });
    const r = await pool.query(
      'INSERT INTO application_access_codes (code, label) VALUES ($1, $2) RETURNING id, code, label, is_active, created_at',
      [code, label]
    );
    res.status(201).json({ data: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Такой код уже есть' });
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/form-access-codes/:id', requireAdmin, async (req, res) => {
  try {
    const { is_active } = req.body || {};
    await pool.query('UPDATE application_access_codes SET is_active = $1 WHERE id = $2', [
      is_active !== false,
      req.params.id,
    ]);
    res.json({ message: 'Обновлено' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/admin/form-access-codes/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM application_access_codes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Удалено' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Заявки
app.post('/api/applications', requireFormAccess, upload.single('photo'), async (req, res) => {
  try {
    const {
      last_name, first_name, middle_name,
      birth_date, birth_locality_name, death_date,
      rank_id, service_place_id, extra_info, cloud_link,
      sender_full_name, sender_email, sender_phone,
      subscribe_to_news, custom_fields,
    } = req.body;
    let currentCfg = { is_enabled: true, disabled_message: '' };
    try {
      const cfg = await pool.query('SELECT is_enabled, disabled_message FROM application_submission_config WHERE id = 1');
      currentCfg = cfg.rows[0] || currentCfg;
    } catch (_) {}
    if (!currentCfg.is_enabled) {
      return res.status(403).json({ error: currentCfg.disabled_message || 'Приём заявок временно отключён' });
    }

    // Населённый пункт: свободный ввод, создаём запись в localities при необходимости
    let birthLocalityId = null;
    const birthLocalityNameNorm = String(birth_locality_name || '').trim();
    if (birthLocalityNameNorm) {
      const existingLoc = await pool.query('SELECT id FROM localities WHERE name = $1', [birthLocalityNameNorm]);
      if (existingLoc.rows.length > 0) {
        birthLocalityId = existingLoc.rows[0].id;
      } else {
        const insertedLoc = await pool.query(
          'INSERT INTO localities (name) VALUES ($1) RETURNING id',
          [birthLocalityNameNorm]
        );
        birthLocalityId = insertedLoc.rows[0].id;
      }
    }

    // Создание героя
    const heroResult = await pool.query(
      `INSERT INTO heroes (last_name, first_name, middle_name, birth_date, birth_locality_id, 
       death_date, rank_id, service_place_id, extra_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [last_name, first_name, middle_name || null, birth_date, birthLocalityId,
       death_date || null, rank_id, service_place_id || null, extra_info || null]
    );

    const heroId = heroResult.rows[0].id;

    const userId = req.userId || 1;
    const appResult = await pool.query(
      `INSERT INTO applications (hero_id, status, created_by_user_id, sender_full_name, sender_email, sender_phone, cloud_link, custom_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING id`,
      [heroId, 'draft', userId, sender_full_name, sender_email, sender_phone || null, (cloud_link && String(cloud_link).trim()) || null, JSON.stringify(parseJsonObject(custom_fields))]
    );
    if (userId !== 1) {
      await pool.query(
        'UPDATE users SET name = $1, phone = $2 WHERE id = $3',
        [sender_full_name || null, sender_phone || null, userId]
      ).catch(() => {});
    }

    const appId = appResult.rows[0].id;

    // Сохранение фото
    if (req.file) {
      await pool.query(
        `INSERT INTO hero_media (hero_id, application_id, file_path, file_type, file_size)
         VALUES ($1, $2, $3, $4, $5)`,
        [heroId, appId, req.file.path, req.file.mimetype, req.file.size]
      );
    }

    await sendMailSafe({
      to: sender_email,
      subject: 'Заявка принята в работу',
      text: `Здравствуйте, ${sender_full_name || 'пользователь'}!\n\nВаша заявка №${appId} успешно отправлена и передана на модерацию.`,
    });

    res.json({ data: { id: appId, hero_id: heroId }, message: 'Заявка создана' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, h.last_name, h.first_name, h.middle_name, h.birth_date, h.death_date,
             l.name as birth_locality, r.name as rank, sp.name as service_place,
             m.file_path as photo_path
      FROM applications a
      JOIN heroes h ON a.hero_id = h.id
      LEFT JOIN localities l ON h.birth_locality_id = l.id
      LEFT JOIN ranks r ON h.rank_id = r.id
      LEFT JOIN service_places sp ON h.service_place_id = sp.id
      LEFT JOIN LATERAL (
        SELECT hm.file_path
        FROM hero_media hm
        WHERE hm.application_id = a.id
        ORDER BY hm.created_at DESC
        LIMIT 1
      ) m ON TRUE
      ORDER BY a.created_at DESC
    `);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications/mine', async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Необходима авторизация' });
  try {
    const result = await pool.query(`
      SELECT a.*, h.last_name, h.first_name, h.middle_name, h.birth_date, h.death_date,
             h.rank_id, h.birth_locality_id, h.service_place_id, h.extra_info,
             l.name as birth_locality, r.name as rank
      FROM applications a
      JOIN heroes h ON a.hero_id = h.id
      LEFT JOIN localities l ON h.birth_locality_id = l.id
      LEFT JOIN ranks r ON h.rank_id = r.id
      WHERE a.created_by_user_id = $1
      ORDER BY a.created_at DESC
    `, [req.userId]);
    res.json({ data: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/applications/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.*, h.last_name, h.first_name, h.middle_name, h.birth_date, h.death_date,
             h.rank_id, h.birth_locality_id, h.service_place_id, h.extra_info,
             l.name as birth_locality, r.name as rank
      FROM applications a
      JOIN heroes h ON a.hero_id = h.id
      LEFT JOIN localities l ON h.birth_locality_id = l.id
      LEFT JOIN ranks r ON h.rank_id = r.id
      WHERE a.id = $1
    `, [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Заявка не найдена' });
    const row = r.rows[0];
    if (req.userId && row.created_by_user_id !== req.userId && req.userId !== 1) {
      const admin = await pool.query('SELECT role FROM users WHERE id = $1', [req.userId]);
      if (admin.rows[0]?.role !== 'admin' && admin.rows[0]?.role !== 'moderator')
        return res.status(403).json({ error: 'Нет доступа' });
    }
    res.json({ data: row });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/applications/:id', upload.single('photo'), async (req, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Необходима авторизация' });
  try {
    const r = await pool.query('SELECT id, created_by_user_id, status FROM applications WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Заявка не найдена' });
    const app = r.rows[0];
    if (app.created_by_user_id !== req.userId) return res.status(403).json({ error: 'Можно редактировать только свою заявку' });
    if (app.status !== 'draft' && app.status !== 'clarification') return res.status(400).json({ error: 'Редактирование недоступно после модерации' });
    const b = req.body || {};
    const heroId = (await pool.query('SELECT hero_id FROM applications WHERE id = $1', [req.params.id])).rows[0].hero_id;

    // Населённый пункт при редактировании: свободный ввод, как при создании
    let birthLocalityId = null;
    const birthLocalityNameNorm = b.birth_locality_name ? String(b.birth_locality_name).trim() : '';
    if (birthLocalityNameNorm) {
      const existingLoc = await pool.query('SELECT id FROM localities WHERE name = $1', [birthLocalityNameNorm]);
      if (existingLoc.rows.length > 0) {
        birthLocalityId = existingLoc.rows[0].id;
      } else {
        const insertedLoc = await pool.query(
          'INSERT INTO localities (name) VALUES ($1) RETURNING id',
          [birthLocalityNameNorm]
        );
        birthLocalityId = insertedLoc.rows[0].id;
      }
    }

    await pool.query(
      `UPDATE heroes SET last_name=$1, first_name=$2, middle_name=$3, birth_date=$4, birth_locality_id=$5, death_date=$6, rank_id=$7, service_place_id=$8, extra_info=$9 WHERE id=$10`,
      [b.last_name, b.first_name, b.middle_name || null, b.birth_date, birthLocalityId, b.death_date || null, b.rank_id, b.service_place_id || null, b.extra_info || null, heroId]
    );
    await pool.query(
      'UPDATE applications SET sender_full_name=$1, sender_email=$2, sender_phone=$3, cloud_link=$4, custom_fields=$5::jsonb WHERE id=$6',
      [b.sender_full_name, b.sender_email, b.sender_phone || null, (b.cloud_link && String(b.cloud_link).trim()) || null, JSON.stringify(parseJsonObject(b.custom_fields)), req.params.id]
    );
    res.json({ message: 'Заявка обновлена' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/applications/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    
    await pool.query(
      'UPDATE applications SET status = $1, moderator_comments = $2 WHERE id = $3',
      [status, comment || null, id]
    );

    if (status === 'published') {
      await pool.query(
        'UPDATE heroes SET is_published = TRUE WHERE id = (SELECT hero_id FROM applications WHERE id = $1)',
        [id]
      );
    }

    const appRow = await pool.query(
      `SELECT a.id, a.sender_email, a.sender_full_name, h.last_name, h.first_name
       FROM applications a
       JOIN heroes h ON h.id = a.hero_id
       WHERE a.id = $1`,
      [id]
    );
    const row = appRow.rows[0];
    if (row?.sender_email) {
      const statusMap = {
        published: 'Принята',
        rejected: 'Отклонена',
        clarification: 'Нужно уточнение',
        draft: 'Черновик',
      };
      const statusLabel = statusMap[status] || status;
      const name = [row.last_name, row.first_name].filter(Boolean).join(' ');
      await sendMailSafe({
        to: row.sender_email,
        subject: `Обновление по заявке №${id}`,
        text: `Здравствуйте, ${row.sender_full_name || 'пользователь'}!\n\nСтатус заявки №${id} (${name}) изменён: ${statusLabel}.${comment ? `\nКомментарий модератора: ${comment}` : ''}`,
      });
    }

    res.json({ message: 'Статус обновлён' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Админ: настройки облачного хранилища
app.get('/api/admin/cloud-storage', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM cloud_storage_config ORDER BY id DESC LIMIT 1');
    res.json({ data: result.rows[0] || { enabled: false, link: '', max_size_mb: 50 } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/cloud-storage', async (req, res) => {
  try {
    const { enabled, link, max_size_mb } = req.body;
    const mb = max_size_mb || 50;
    await pool.query(
      `INSERT INTO cloud_storage_config (id, enabled, link, max_size_mb)
       VALUES (1, $1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET enabled = $1, link = $2, max_size_mb = $3, updated_at = CURRENT_TIMESTAMP`,
      [!!enabled, link || '', mb]
    );
    res.json({ message: 'Настройки сохранены' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/support-contacts', async (req, res) => {
  try {
    const r = await pool.query('SELECT email, phone FROM support_contacts WHERE id = 1');
    res.json({ data: r.rows[0] || { email: '', phone: '' } });
  } catch (e) {
    res.json({ data: { email: 'support@example.com', phone: '+7 (000) 000-00-00' } });
  }
});

app.patch('/api/admin/support-contacts', async (req, res) => {
  try {
    const { email, phone } = req.body || {};
    await pool.query(
      `INSERT INTO support_contacts (id, email, phone) VALUES (1, $1, $2)
       ON CONFLICT (id) DO UPDATE SET email = $1, phone = $2`,
      [String(email ?? '').trim(), String(phone ?? '').trim()]
    );
    res.json({ message: 'Контакты поддержки обновлены' });
  } catch (e) {
    if (e.message && e.message.includes('support_contacts')) {
      await pool.query('CREATE TABLE IF NOT EXISTS support_contacts (id SERIAL PRIMARY KEY, email VARCHAR(255), phone VARCHAR(50))');
      await pool.query('INSERT INTO support_contacts (id, email, phone) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING', [String(req.body?.email ?? '').trim(), String(req.body?.phone ?? '').trim()]);
      return res.json({ message: 'Контакты поддержки обновлены' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/application-config', async (req, res) => {
  try {
    await ensureApplicationConfigSchema();
    const r = await pool.query(
      'SELECT is_enabled, disabled_message, custom_form_fields, show_photo, show_cloud_link FROM application_submission_config WHERE id = 1'
    );
    res.json({
      data: r.rows[0] || {
        is_enabled: true,
        disabled_message: '',
        custom_form_fields: [],
        show_photo: true,
        show_cloud_link: true,
      },
    });
  } catch (e) {
    res.json({
      data: {
        is_enabled: true,
        disabled_message: '',
        custom_form_fields: [],
        show_photo: true,
        show_cloud_link: true,
      },
    });
  }
});

app.patch('/api/admin/application-config', async (req, res) => {
  try {
    await ensureApplicationConfigSchema();
    const { is_enabled, disabled_message, custom_form_fields, show_photo, show_cloud_link } = req.body || {};
    const safeFields = parseCustomFormFields(custom_form_fields);
    const sp = show_photo !== false;
    const scl = show_cloud_link !== false;
    await pool.query(
      `INSERT INTO application_submission_config (id, is_enabled, disabled_message, custom_form_fields, show_photo, show_cloud_link)
       VALUES (1, $1, $2, $3::jsonb, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         is_enabled = $1,
         disabled_message = $2,
         custom_form_fields = $3::jsonb,
         show_photo = $4,
         show_cloud_link = $5`,
      [is_enabled !== false, String(disabled_message ?? '').trim(), JSON.stringify(safeFields), sp, scl]
    );
    res.json({ message: 'Конфигурация приёма заявок обновлена' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Подписка на новости
app.post('/api/subscription/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    await pool.query(
      `INSERT INTO subscriptions (email, verification_code)
       VALUES ($1, $2)
       ON CONFLICT (email) DO UPDATE SET verification_code = $2, verified = FALSE`,
      [email, code]
    );

    // Здесь должна быть отправка email через nodemailer
    console.log(`Код для ${email}: ${code}`);

    res.json({ message: 'Код отправлен на email' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/subscription/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    const result = await pool.query(
      'UPDATE subscriptions SET verified = TRUE WHERE email = $1 AND verification_code = $2 RETURNING id',
      [email, code]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    res.json({ message: 'Подписка подтверждена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function start() {
  console.log(`БД: host=${dbConfig.host} port=${dbConfig.port} database=${dbConfig.database} user=${dbConfig.user}`);
  try {
    await pool.query('SELECT 1');
    console.log('БД: подключено');
    await ensureApplicationConfigSchema();
    await seedDefaultFormAccessCode();
    await seedTestUsers();
    if (process.env.FIX_DICTIONARIES_UTF8 === '1') {
      await fixDictionariesUtf8();
      console.log('Подсказка: уберите FIX_DICTIONARIES_UTF8 из .env после первого успешного запуска.');
    }
  } catch (e) {
    console.error('Ошибка подключения к БД:', e.message);
    console.error('Проверьте: PostgreSQL запущен, в backend\\.env указаны DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD');
  }
  app.listen(PORT, () => {
    console.log(`Сервер: http://localhost:${PORT}`);
  });
}
start();

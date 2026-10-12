import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-env';

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on('connect', () => console.log('Подключение к PostgreSQL установлено'));
pool.on('error', (err) => console.error('Ошибка PostgreSQL:', err));

// =========================================================
// ПОЧТА
// =========================================================
const mailer = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
    },
});

async function sendResetCode(email, code) {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
        console.log(`⚠️  MAIL не настроен. Код сброса для ${email}: ${code}`);
        return;
    }
    await mailer.sendMail({
        from: process.env.MAIL_FROM || 'noreply@watershop.local',
        to: email,
        subject: 'WaterShop — сброс пароля',
        html: `
            <h2>Сброс пароля</h2>
            <p>Ваш код подтверждения:</p>
            <h1 style="letter-spacing: 4px;">${code}</h1>
            <p>Код действителен 15 минут. Если вы не запрашивали сброс — проигнорируйте это письмо.</p>
        `,
    });
}

// =========================================================
// MIDDLEWARE
// =========================================================
function protect(roles = null) {
    return (req, res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) return res.status(401).json({ error: 'Требуется авторизация' });
        try {
            req.user = jwt.verify(token, JWT_SECRET);
        } catch {
            return res.status(401).json({ error: 'Сессия истекла, войдите заново' });
        }
        if (roles && !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }
        next();
    };
}

function optionalAuth() {
    return (req, _res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;
        if (!token) return next();
        try { req.user = jwt.verify(token, JWT_SECRET); } catch { /* ignore */ }
        next();
    };
}

const auth      = () => protect(null);
const adminOnly = () => protect(['admin']);
const staffOnly = () => protect(['admin', 'employee']);

function signToken(user) {
    return jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role_name },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// =========================================================
// ВАЛИДАТОРЫ
// =========================================================
const BAD_WORDS = [
    'хуй', 'пизд', 'ебан', 'ебат', 'бляд', 'сука', 'мудак', 'гандон',
    'долбоеб', 'залуп', 'пидор', 'fuck', 'shit', 'bitch', 'cunt',
];

function containsBadWords(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return BAD_WORDS.some(w => lower.includes(w));
}

function isValidFullName(name) {
    if (!name || name.trim().length < 2) return false;
    if (!/^[А-Яа-яЁёA-Za-z\s-]+$/.test(name.trim())) return false;
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2;
}

function normalizePhone(phone) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11) return null;
    return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
}

// =========================================================
// АВТОРИЗАЦИЯ
// =========================================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Заполните обязательные поля' });
        }
        if (!isValidFullName(full_name)) {
            return res.status(400).json({ error: 'Укажите настоящее ФИО (только буквы, минимум имя и фамилия)' });
        }
        if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Некорректный email' });
        }

        const phoneNormalized = normalizePhone(phone);
        if (phone && !phoneNormalized) {
            return res.status(400).json({ error: 'Телефон должен быть в формате +7 (999) 123-45-67' });
        }

        const dup = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (dup.rows.length) return res.status(400).json({ error: 'Email уже занят' });

        const roleRes = await pool.query(
            "SELECT role_id FROM roles WHERE role_name = 'user' LIMIT 1"
        );

        const parts = full_name.trim().split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ');

        const hash = await bcrypt.hash(password, 10);
        const r = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING user_id, email, first_name, last_name, phone, role_id, discount_percent`,
            [email, hash, firstName, lastName, phoneNormalized, roleRes.rows[0].role_id]
        );

        const user = { ...r.rows[0], role_name: 'user' };
        const token = signToken(user);
        const { user_id, role_id, ...safeUser } = user;

        res.status(201).json({ user: safeUser, token });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

        const r = await pool.query(
            `SELECT u.*, r.role_name FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.email = $1`,
            [email]
        );
        if (!r.rows.length) return res.status(401).json({ error: 'Неверный email или пароль' });

        const user = r.rows[0];
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Неверный email или пароль' });

        const token = signToken(user);
        const { user_id, role_id, password_hash, ...safeUser } = user;
        res.json({ user: safeUser, token });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/auth/me', auth(), async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT u.email, u.first_name, u.last_name, u.phone, u.address,
                    u.discount_percent, r.role_name
             FROM users u JOIN roles r ON u.role_id = r.role_id
             WHERE u.user_id = $1`,
            [req.user.userId]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// СБРОС ПАРОЛЯ
// =========================================================
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email обязателен' });

        const r = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
        if (!r.rows.length) {
            return res.json({ message: 'Если такой email есть — код отправлен' });
        }

        const userId = r.rows[0].user_id;

        await pool.query('UPDATE password_resets SET used = TRUE WHERE user_id = $1', [userId]);

        const code = String(Math.floor(100000 + Math.random() * 900000));

        await pool.query(
            `INSERT INTO password_resets (user_id, code, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
            [userId, code]
        );

        await sendResetCode(email, code);

        res.json({ message: 'Если такой email есть — код отправлен' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, code, new_password } = req.body;
        if (!email || !code || !new_password) {
            return res.status(400).json({ error: 'Заполните все поля' });
        }
        if (new_password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });

        const r = await pool.query(
            `SELECT pr.reset_id, pr.user_id
             FROM password_resets pr
             JOIN users u ON pr.user_id = u.user_id
             WHERE u.email = $1 AND pr.code = $2
               AND pr.used = FALSE AND pr.expires_at > NOW()
             ORDER BY pr.reset_id DESC LIMIT 1`,
            [email, code]
        );
        if (!r.rows.length) {
            return res.status(400).json({ error: 'Неверный или истёкший код' });
        }

        const { reset_id, user_id } = r.rows[0];
        const hash = await bcrypt.hash(new_password, 10);

        await pool.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [hash, user_id]);
        await pool.query('UPDATE password_resets SET used = TRUE WHERE reset_id = $1', [reset_id]);

        res.json({ message: 'Пароль успешно изменён' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// =========================================================
// КАТЕГОРИИ
// =========================================================
app.get('/api/categories', async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT c.slug, c.category_name, c.description,
                    COALESCE(cdl.daily_limit, 10) AS daily_limit
             FROM categories c
             LEFT JOIN category_daily_limits cdl ON c.category_id = cdl.category_id
             ORDER BY c.category_id`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', staffOnly(), async (req, res) => {
    try {
        const { category_name, description, daily_limit } = req.body;
        if (!category_name || !category_name.trim()) {
            return res.status(400).json({ error: 'Название обязательно' });
        }
        const slug = category_name.trim().toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

        const dup = await pool.query(
            'SELECT 1 FROM categories WHERE LOWER(category_name) = LOWER($1)',
            [category_name.trim()]
        );
        if (dup.rows.length) return res.status(400).json({ error: 'Такая категория уже есть' });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const r = await client.query(
                `INSERT INTO categories (category_name, description, slug)
                 VALUES ($1, $2, $3)
                 RETURNING category_id, slug, category_name, description`,
                [category_name.trim(), description || null, slug]
            );
            await client.query(
                `INSERT INTO category_daily_limits (category_id, daily_limit) VALUES ($1, $2)
                 ON CONFLICT (category_id) DO UPDATE SET daily_limit = $2`,
                [r.rows[0].category_id, daily_limit || 10]
            );
            await client.query('COMMIT');
            res.status(201).json({ ...r.rows[0], daily_limit: daily_limit || 10 });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Уже существует' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/categories/:slug', staffOnly(), async (req, res) => {
    try {
        const { category_name, description, daily_limit } = req.body;
        const newSlug = category_name.trim().toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

        const r = await pool.query(
            `UPDATE categories SET category_name = $1, description = $2, slug = $3
             WHERE slug = $4
             RETURNING category_id, slug, category_name, description`,
            [category_name, description || null, newSlug, req.params.slug]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });

        if (daily_limit) {
            await pool.query(
                `INSERT INTO category_daily_limits (category_id, daily_limit)
                 VALUES ($1, $2)
                 ON CONFLICT (category_id) DO UPDATE SET daily_limit = $2`,
                [r.rows[0].category_id, daily_limit]
            );
        }
        res.json({ ...r.rows[0], daily_limit: daily_limit || 10 });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:slug', staffOnly(), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (req.params.slug === 'no-category') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Категорию "Без категории" удалять нельзя' });
        }

        const noCat = await client.query(
            "SELECT category_id FROM categories WHERE slug = 'no-category'"
        );
        if (!noCat.rows.length) {
            await client.query('ROLLBACK');
            return res.status(500).json({ error: 'Не найдена служебная категория "Без категории"' });
        }
        const fallbackId = noCat.rows[0].category_id;

        const move = await client.query(
            `UPDATE services SET category_id = $1
             WHERE category_id = (SELECT category_id FROM categories WHERE slug = $2)`,
            [fallbackId, req.params.slug]
        );

        const r = await client.query(
            'DELETE FROM categories WHERE slug = $1 RETURNING category_name',
            [req.params.slug]
        );
        if (!r.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Категория не найдена' });
        }

        await client.query('COMMIT');
        res.json({
            message: `Категория "${r.rows[0].category_name}" удалена. Товаров перенесено в "Без категории": ${move.rowCount}`,
            movedServices: move.rowCount,
        });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// =========================================================
// ТОВАРЫ
// =========================================================
app.get('/api/services', async (req, res) => {
    try {
        const { category, q, min_price, max_price, sort } = req.query;
        const params = [];
        let query = `
            SELECT s.slug, s.service_name, s.description, s.duration_minutes,
                   s.price, s.image_url, s.discount_percent,
                   c.slug AS category_slug, c.category_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.category_id
            WHERE s.is_active = TRUE
        `;
        if (category) { params.push(category); query += ` AND c.slug = $${params.length}`; }
        if (q && q.trim()) {
            params.push(`%${q.trim()}%`);
            query += ` AND (s.service_name ILIKE $${params.length} OR s.description ILIKE $${params.length})`;
        }
        if (min_price) { params.push(min_price); query += ` AND s.price >= $${params.length}`; }
        if (max_price) { params.push(max_price); query += ` AND s.price <= $${params.length}`; }

        const sortMap = {
            price_asc: 's.price ASC',
            price_desc: 's.price DESC',
            name: 's.service_name ASC',
        };
        query += ` ORDER BY ${sortMap[sort] || 's.service_id'}`;

        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/services/:slug', optionalAuth(), async (req, res) => {
    try {
        const srv = await pool.query(
            `SELECT s.slug, s.service_name, s.description, s.duration_minutes,
                    s.price, s.image_url, s.discount_percent,
                    c.slug AS category_slug, c.category_name,
                    COALESCE(cdl.daily_limit, 10) AS daily_limit,
                    COALESCE((
                        SELECT SUM(oi.quantity)::int
                        FROM order_items oi
                        JOIN orders o ON oi.order_id = o.order_id
                        JOIN services ss ON oi.service_id = ss.service_id
                        WHERE ss.category_id = c.category_id
                          AND o.created_at::date = CURRENT_DATE
                          AND o.status <> 'cancelled'
                    ), 0) AS sold_today
             FROM services s
             LEFT JOIN categories c ON s.category_id = c.category_id
             LEFT JOIN category_daily_limits cdl ON c.category_id = cdl.category_id
             WHERE s.slug = $1`,
            [req.params.slug]
        );
        if (!srv.rows.length) return res.status(404).json({ error: 'Товар не найден' });

        const userId = req.user?.userId;

        const rv = await pool.query(
            `SELECT r.review_id, r.user_id, r.rating, r.comment,
                    r.created_at, r.updated_at,
                    r.deleted_by_admin, r.deleted_reason,
                    u.first_name, u.last_name
             FROM reviews r
             JOIN users u ON r.user_id = u.user_id
             WHERE r.service_id = (SELECT service_id FROM services WHERE slug = $1)
             ORDER BY r.created_at DESC`,
            [req.params.slug]
        );

        const reviews = rv.rows.map(r => ({
            review_id: r.review_id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            updated_at: r.updated_at,
            deleted_by_admin: r.deleted_by_admin,
            deleted_reason: r.deleted_reason,
            first_name: r.first_name,
            last_name: r.last_name,
            is_mine: userId ? r.user_id === userId : false,
        }));

        let can_review = false;
        if (userId) {
            const purchase = await pool.query(
                `SELECT 1 FROM order_items oi
                 JOIN orders o ON oi.order_id = o.order_id
                 WHERE o.user_id = $1
                   AND oi.service_id = (SELECT service_id FROM services WHERE slug = $2)
                   AND o.status <> 'cancelled'
                 LIMIT 1`,
                [userId, req.params.slug]
            );
            can_review = purchase.rows.length > 0;
        }

        const row = srv.rows[0];
        const remaining = row.daily_limit - row.sold_today;

        res.json({
            ...row,
            remaining_today: Math.max(0, remaining),
            can_review,
            reviews,
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/services', staffOnly(), async (req, res) => {
    try {
        const { service_name, description, duration_minutes, price,
                category_slug, image_url, discount_percent } = req.body;

        if (!service_name || !price) {
            return res.status(400).json({ error: 'Название и цена обязательны' });
        }
        if (Number(price) <= 0) {
            return res.status(400).json({ error: 'Цена должна быть больше нуля' });
        }

        const cat = await pool.query('SELECT category_id FROM categories WHERE slug = $1', [category_slug]);
        if (!cat.rows.length) return res.status(400).json({ error: 'Категория не найдена' });

        const slug = service_name.trim().toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

        const r = await pool.query(
            `INSERT INTO services (service_name, description, duration_minutes, price,
                                   category_id, image_url, discount_percent, slug)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             RETURNING slug, service_name, description, duration_minutes, price,
                       image_url, discount_percent`,
            [service_name, description || null, duration_minutes || 0, price,
             cat.rows[0].category_id, image_url || null, discount_percent || 0, slug]
        );
        res.status(201).json({ ...r.rows[0], category_slug });
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Такой товар уже есть' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/services/:slug', staffOnly(), async (req, res) => {
    try {
        const { service_name, description, duration_minutes, price,
                category_slug, image_url, discount_percent } = req.body;

        if (Number(price) <= 0) {
            return res.status(400).json({ error: 'Цена должна быть больше нуля' });
        }

        const cat = await pool.query('SELECT category_id FROM categories WHERE slug = $1', [category_slug]);
        if (!cat.rows.length) return res.status(400).json({ error: 'Категория не найдена' });

        const newSlug = service_name.trim().toLowerCase().replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

        const r = await pool.query(
            `UPDATE services SET service_name = $1, description = $2, duration_minutes = $3,
                                 price = $4, category_id = $5, image_url = $6,
                                 discount_percent = $7, slug = $8
             WHERE slug = $9
             RETURNING slug, service_name, description, duration_minutes, price,
                       image_url, discount_percent`,
            [service_name, description || null, duration_minutes || 0, price,
             cat.rows[0].category_id, image_url || null, discount_percent || 0,
             newSlug, req.params.slug]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Товар не найден' });
        res.json({ ...r.rows[0], category_slug });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/services/:slug', staffOnly(), async (req, res) => {
    try {
        const r = await pool.query(
            'DELETE FROM services WHERE slug = $1 RETURNING service_name',
            [req.params.slug]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Товар не найден' });
        res.json({ message: 'Товар удалён', service_name: r.rows[0].service_name });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ДНЕВНОЙ ЛИМИТ МАГАЗИНА
// =========================================================
async function checkShopDailyLimit(client, serviceSlug, quantity) {
    const res = await client.query(
        `SELECT c.category_id, c.slug AS category_slug,
                COALESCE(cdl.daily_limit, 10) AS daily_limit
         FROM services s
         JOIN categories c ON s.category_id = c.category_id
         LEFT JOIN category_daily_limits cdl ON c.category_id = cdl.category_id
         WHERE s.slug = $1`,
        [serviceSlug]
    );
    if (!res.rows.length) return { ok: false, error: 'Товар не найден' };

    const { category_id, category_slug, daily_limit } = res.rows[0];

    const sold = await client.query(
        `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total
         FROM order_items oi
         JOIN orders o ON oi.order_id = o.order_id
         JOIN services s ON oi.service_id = s.service_id
         WHERE s.category_id = $1
           AND o.created_at::date = CURRENT_DATE
           AND o.status <> 'cancelled'`,
        [category_id]
    );

    const soldToday = sold.rows[0].total;
    const remaining = daily_limit - soldToday;

    if (quantity > remaining) {
        return {
            ok: false,
            error: `Категория "${category_slug}" на сегодня закончилась. Осталось: ${remaining} шт. Уже продано сегодня: ${soldToday}.`,
        };
    }
    return { ok: true, remaining: remaining - quantity };
}

// =========================================================
// КОРЗИНА
// =========================================================
app.get('/api/cart', auth(), async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT c.quantity, c.added_at,
                    s.slug, s.service_name, s.price, s.duration_minutes,
                    s.discount_percent, s.image_url
             FROM cart c
             JOIN services s ON c.service_id = s.service_id
             WHERE c.user_id = $1
             ORDER BY c.added_at DESC`,
            [req.user.userId]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cart', auth(), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { service_slug, quantity = 1 } = req.body;
        if (!service_slug) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'service_slug обязателен' });
        }

        const roleRes = await client.query(
            `SELECT r.role_name FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.user_id = $1`,
            [req.user.userId]
        );
        if (roleRes.rows[0]?.role_name !== 'user') {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Сотрудники и администраторы не могут добавлять товары в корзину' });
        }

        const srv = await client.query(
            'SELECT service_id FROM services WHERE slug = $1',
            [service_slug]
        );
        if (!srv.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Товар не найден' });
        }

        const limit = await checkShopDailyLimit(client, service_slug, quantity);
        if (!limit.ok) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: limit.error });
        }

        const r = await client.query(
            `INSERT INTO cart (user_id, service_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, service_id)
             DO UPDATE SET quantity = cart.quantity + $3
             RETURNING quantity`,
            [req.user.userId, srv.rows[0].service_id, quantity]
        );
        await client.query('COMMIT');
        res.status(201).json({ message: 'Добавлено в корзину', quantity: r.rows[0].quantity });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.patch('/api/cart/:slug', auth(), async (req, res) => {
    try {
        const { quantity } = req.body;
        if (quantity < 1) {
            await pool.query(
                `DELETE FROM cart WHERE user_id = $1 AND service_id = (
                    SELECT service_id FROM services WHERE slug = $2
                )`,
                [req.user.userId, req.params.slug]
            );
            return res.json({ deleted: true });
        }
        const r = await pool.query(
            `UPDATE cart SET quantity = $1
             WHERE user_id = $2 AND service_id = (
                SELECT service_id FROM services WHERE slug = $3
             )
             RETURNING quantity`,
            [quantity, req.user.userId, req.params.slug]
        );
        res.json({ quantity: r.rows[0]?.quantity });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cart/:slug', auth(), async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM cart WHERE user_id = $1 AND service_id = (
                SELECT service_id FROM services WHERE slug = $2
            )`,
            [req.user.userId, req.params.slug]
        );
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cart', auth(), async (req, res) => {
    try {
        await pool.query('DELETE FROM cart WHERE user_id = $1', [req.user.userId]);
        res.json({ message: 'Корзина очищена' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ЗАКАЗЫ
// =========================================================
app.post('/api/orders', auth(), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { coupon_code, address, delivery_date } = req.body;

        if (!address || !address.trim()) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Адрес доставки обязателен' });
        }
        if (!delivery_date) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Дата доставки обязательна' });
        }

        const today = new Date(); today.setHours(0, 0, 0, 0);
        const chosen = new Date(delivery_date);
        if (isNaN(chosen) || chosen < today) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Дата доставки не может быть в прошлом' });
        }

        const userRes = await client.query(
            'SELECT discount_percent FROM users WHERE user_id = $1',
            [req.user.userId]
        );
        const userDiscount = Number(userRes.rows[0].discount_percent) || 0;

        const cartRes = await client.query(
            `SELECT c.quantity, s.price, s.discount_percent, s.service_name, s.service_id
             FROM cart c JOIN services s ON c.service_id = s.service_id
             WHERE c.user_id = $1`,
            [req.user.userId]
        );
        if (!cartRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Корзина пуста' });
        }

        const byCategory = {};
        for (const it of cartRes.rows) {
            const srv = await client.query(
                `SELECT c.category_id, c.slug AS category_slug,
                        COALESCE(cdl.daily_limit, 10) AS daily_limit
                 FROM services s
                 JOIN categories c ON s.category_id = c.category_id
                 LEFT JOIN category_daily_limits cdl ON c.category_id = cdl.category_id
                 WHERE s.service_id = $1`,
                [it.service_id]
            );
            const { category_id, category_slug, daily_limit } = srv.rows[0];
            if (!byCategory[category_id]) {
                byCategory[category_id] = { slug: category_slug, limit: daily_limit, qty: 0 };
            }
            byCategory[category_id].qty += it.quantity;
        }

        for (const [catId, data] of Object.entries(byCategory)) {
            const sold = await client.query(
                `SELECT COALESCE(SUM(oi.quantity), 0)::int AS total
                 FROM order_items oi
                 JOIN orders o ON oi.order_id = o.order_id
                 JOIN services s ON oi.service_id = s.service_id
                 WHERE s.category_id = $1
                   AND o.created_at::date = CURRENT_DATE
                   AND o.status <> 'cancelled'`,
                [catId]
            );
            const soldToday = sold.rows[0].total;
            const remaining = data.limit - soldToday;
            if (data.qty > remaining) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `Категория "${data.slug}" на сегодня закончилась. Осталось: ${remaining} шт.`,
                });
            }
        }

        let subtotal = 0, afterService = 0;
        for (const it of cartRes.rows) {
            const p = parseFloat(it.price);
            const d = it.discount_percent || 0;
            subtotal += p * it.quantity;
            afterService += p * (1 - d / 100) * it.quantity;
        }
        const afterUser = afterService - afterService * (userDiscount / 100);

        let couponDiscount = 0, couponId = null;
        if (coupon_code) {
            const cp = await client.query(
                `SELECT * FROM coupons
                 WHERE code = $1 AND is_active = TRUE
                 AND (usage_limit IS NULL OR used_count < usage_limit)`,
                [coupon_code.toUpperCase()]
            );
            if (!cp.rows.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ error: 'Купон недействителен' });
            }
            if (cp.rows[0].first_order_only) {
                const orders = await client.query(
                    'SELECT COUNT(*)::int AS c FROM orders WHERE user_id = $1',
                    [req.user.userId]
                );
                if (orders.rows[0].c > 0) {
                    await client.query('ROLLBACK');
                    return res.status(400).json({ error: 'Этот купон доступен только на первый заказ' });
                }
            }
            couponDiscount = cp.rows[0].discount_percent;
            couponId = cp.rows[0].coupon_id;
        }

        const couponAmount = afterUser * (couponDiscount / 100);
        const finalAmount = afterUser - couponAmount;

        // Вычисляем локальный номер заказа для этого пользователя
        const numRes = await client.query(
            `SELECT COALESCE(MAX(user_order_number), 0) + 1 AS next_num
             FROM orders WHERE user_id = $1`,
            [req.user.userId]
        );
        const userOrderNumber = numRes.rows[0].next_num;

        const orderRes = await client.query(
            `INSERT INTO orders (user_id, total_amount, discount_amount, final_amount,
                                 coupon_code, address, delivery_date, status, user_order_number)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)
             RETURNING order_id, user_order_number, total_amount, discount_amount,
                       final_amount, coupon_code, address, delivery_date, status, created_at`,
            [req.user.userId, subtotal, subtotal - finalAmount, finalAmount,
             coupon_code || null, address.trim(), delivery_date, userOrderNumber]
        );

        for (const it of cartRes.rows) {
            await client.query(
                `INSERT INTO order_items (order_id, service_id, service_name, quantity, price)
                 VALUES ($1,$2,$3,$4,$5)`,
                [orderRes.rows[0].order_id, it.service_id, it.service_name, it.quantity, it.price]
            );
        }

        if (couponId) {
            await client.query(
                'UPDATE coupons SET used_count = used_count + 1 WHERE coupon_id = $1',
                [couponId]
            );
        }

        await client.query('DELETE FROM cart WHERE user_id = $1', [req.user.userId]);
        await client.query('COMMIT');

        res.status(201).json({
            ...orderRes.rows[0],
            items: cartRes.rows,
        });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.get('/api/orders', auth(), async (req, res) => {
    try {
        const orders = await pool.query(
            `SELECT o.order_id, o.user_order_number, o.total_amount,
                    o.discount_amount, o.final_amount,
                    o.coupon_code, o.address, o.delivery_date, o.status, o.created_at
             FROM orders o WHERE o.user_id = $1
             ORDER BY o.created_at DESC`,
            [req.user.userId]
        );

        const result = [];
        for (const o of orders.rows) {
            const items = await pool.query(
                `SELECT service_name, quantity, price
                 FROM order_items WHERE order_id = $1`,
                [o.order_id]
            );
            result.push({
                ...o,
                items: items.rows,
            });
        }
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ОПЛАТА ЗАКАЗА
// =========================================================
app.post('/api/orders/:id/pay', auth(), async (req, res) => {
    try {
        const { card_number, card_holder, expiry, cvv } = req.body;

        const digits = (card_number || '').replace(/\s/g, '');
        if (!/^\d{16}$/.test(digits)) {
            return res.status(400).json({ error: 'Номер карты — 16 цифр' });
        }
        if (!card_holder || card_holder.trim().length < 3) {
            return res.status(400).json({ error: 'Укажите имя держателя карты' });
        }
        if (!/^\d{2}\/\d{2}$/.test(expiry || '')) {
            return res.status(400).json({ error: 'Срок действия в формате ММ/ГГ' });
        }

        const [mm, yy] = expiry.split('/').map(s => parseInt(s, 10));
        if (mm < 1 || mm > 12) {
            return res.status(400).json({ error: 'Неверный месяц' });
        }
        const now = new Date();
        const expDate = new Date(2000 + yy, mm, 0);
        if (expDate < now) {
            return res.status(400).json({ error: 'Срок действия карты истёк' });
        }

        if (!/^\d{3}$/.test(cvv || '')) {
            return res.status(400).json({ error: 'CVV — 3 цифры' });
        }

        const check = await pool.query(
            `SELECT order_id, status, user_id FROM orders WHERE order_id = $1`,
            [req.params.id]
        );
        if (!check.rows.length) return res.status(404).json({ error: 'Заказ не найден' });

        const order = check.rows[0];
        if (order.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Это не ваш заказ' });
        }
        if (order.status !== 'pending') {
            return res.status(400).json({ error: `Заказ нельзя оплатить (текущий статус: ${order.status})` });
        }

        const r = await pool.query(
            `UPDATE orders SET status = 'paid', paid_at = NOW()
             WHERE order_id = $1
             RETURNING order_id, user_order_number, status, paid_at`,
            [req.params.id]
        );

        res.json({
            message: 'Оплата прошла успешно',
            order: r.rows[0],
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/orders/:id/status', staffOnly(), async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['pending', 'paid', 'shipped', 'done', 'cancelled'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: 'Недопустимый статус' });
        }

        const current = await pool.query(
            'SELECT status FROM orders WHERE order_id = $1',
            [req.params.id]
        );
        if (!current.rows.length) return res.status(404).json({ error: 'Заказ не найден' });

        const cur = current.rows[0].status;

        if (cur === 'paid' && status === 'pending') {
            return res.status(403).json({ error: 'Нельзя вернуть заказ с "Оплачено" обратно в "Ожидает оплаты"' });
        }
        if (cur === 'done' || cur === 'cancelled') {
            return res.status(403).json({ error: 'Заказ уже закрыт' });
        }

        const r = await pool.query(
            `UPDATE orders SET status = $1,
                    paid_at = CASE WHEN $1 = 'paid' THEN NOW() ELSE paid_at END
             WHERE order_id = $2
             RETURNING order_id, user_order_number, status, paid_at`,
            [status, req.params.id]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/orders/:id', staffOnly(), (_req, res) => {
    res.status(403).json({ error: 'Удаление заказов и чеков запрещено. Обратитесь к администратору БД.' });
});

// =========================================================
// ОТЗЫВЫ
// =========================================================
app.post('/api/services/:slug/reviews', auth(), async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const r = Number(rating);
        if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

        const trimmed = (comment || '').trim();
        if (trimmed.length === 0) return res.status(400).json({ error: 'Отзыв не может быть пустым' });
        if (trimmed.length < 5) return res.status(400).json({ error: 'Отзыв слишком короткий (минимум 5 символов)' });
        if (trimmed.length > 1000) return res.status(400).json({ error: 'Отзыв слишком длинный (максимум 1000 символов)' });
        if (containsBadWords(trimmed)) {
            return res.status(400).json({ error: 'Отзыв содержит недопустимые выражения' });
        }

        const srv = await pool.query('SELECT service_id FROM services WHERE slug = $1', [req.params.slug]);
        if (!srv.rows.length) return res.status(404).json({ error: 'Товар не найден' });

        const purchase = await pool.query(
            `SELECT 1 FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             WHERE o.user_id = $1
               AND oi.service_id = $2
               AND o.status <> 'cancelled'
             LIMIT 1`,
            [req.user.userId, srv.rows[0].service_id]
        );
        if (!purchase.rows.length) {
            return res.status(403).json({ error: 'Оставить отзыв можно только после покупки этого товара' });
        }

        const exists = await pool.query(
            'SELECT review_id, deleted_by_admin FROM reviews WHERE user_id = $1 AND service_id = $2',
            [req.user.userId, srv.rows[0].service_id]
        );
        if (exists.rows.length && !exists.rows[0].deleted_by_admin) {
            return res.status(400).json({ error: 'Вы уже оставляли отзыв на этот товар' });
        }

        if (exists.rows.length && exists.rows[0].deleted_by_admin) {
            await pool.query(
                `UPDATE reviews SET rating = $1, comment = $2, created_at = NOW(),
                                     updated_at = NULL, deleted_by_admin = FALSE, deleted_reason = NULL
                 WHERE review_id = $3`,
                [r, trimmed, exists.rows[0].review_id]
            );
        } else {
            await pool.query(
                `INSERT INTO reviews (user_id, service_id, rating, comment)
                 VALUES ($1, $2, $3, $4)`,
                [req.user.userId, srv.rows[0].service_id, r, trimmed]
            );
        }
        res.status(201).json({ message: 'Отзыв добавлен' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reviews/my', auth(), async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT r.review_id, r.rating, r.comment,
                    r.created_at, r.updated_at,
                    r.deleted_by_admin, r.deleted_reason,
                    s.slug AS service_slug, s.service_name, s.image_url
             FROM reviews r
             JOIN services s ON r.service_id = s.service_id
             WHERE r.user_id = $1
             ORDER BY r.created_at DESC`,
            [req.user.userId]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reviews/:reviewId', auth(), async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const r = Number(rating);
        if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'Оценка от 1 до 5' });

        const trimmed = (comment || '').trim();
        if (trimmed.length < 5) return res.status(400).json({ error: 'Отзыв слишком короткий (минимум 5 символов)' });
        if (trimmed.length > 1000) return res.status(400).json({ error: 'Отзыв слишком длинный (максимум 1000 символов)' });
        if (containsBadWords(trimmed)) return res.status(400).json({ error: 'Отзыв содержит недопустимые выражения' });

        const owner = await pool.query(
            `SELECT user_id, deleted_by_admin FROM reviews WHERE review_id = $1`,
            [req.params.reviewId]
        );
        if (!owner.rows.length) return res.status(404).json({ error: 'Отзыв не найден' });
        if (owner.rows[0].user_id !== req.user.userId) return res.status(403).json({ error: 'Это не ваш отзыв' });
        if (owner.rows[0].deleted_by_admin) return res.status(403).json({ error: 'Этот отзыв удалён администратором' });

        await pool.query(
            `UPDATE reviews SET rating = $1, comment = $2, updated_at = NOW()
             WHERE review_id = $3`,
            [r, trimmed, req.params.reviewId]
        );
        res.json({ message: 'Отзыв обновлён' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reviews/:reviewId', adminOnly(), async (req, res) => {
    try {
        const { reason } = req.body;
        const r = await pool.query(
            `UPDATE reviews SET deleted_by_admin = TRUE,
                                deleted_reason = $1,
                                comment = '[Отзыв удалён администратором за нарушение политики]'
             WHERE review_id = $2
             RETURNING review_id`,
            [reason || 'Нарушение политики', req.params.reviewId]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Отзыв не найден' });
        res.json({ message: 'Отзыв помечен как удалённый' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ПРОФИЛЬ
// =========================================================
app.put('/api/profile', auth(), async (req, res) => {
    try {
        const { email, first_name, last_name, address, phone, password } = req.body;

        if (email) {
            const dup = await pool.query(
                'SELECT 1 FROM users WHERE email = $1 AND user_id <> $2',
                [email, req.user.userId]
            );
            if (dup.rows.length) return res.status(400).json({ error: 'Email уже занят' });
        }

        let hash = null;
        if (password && password.length >= 6) hash = await bcrypt.hash(password, 10);

        const phoneNormalized = phone ? normalizePhone(phone) : null;
        if (phone && !phoneNormalized) {
            return res.status(400).json({ error: 'Телефон должен быть в формате +7 (999) 123-45-67' });
        }

        const r = await pool.query(
            `UPDATE users SET
                email = COALESCE($1, email),
                first_name = COALESCE($2, first_name),
                last_name = COALESCE($3, last_name),
                address = COALESCE($4, address),
                phone = COALESCE($5, phone),
                password_hash = COALESCE($6, password_hash)
             WHERE user_id = $7
             RETURNING email, first_name, last_name, address, phone, discount_percent`,
            [email || null, first_name || null, last_name || null,
             address || null, phoneNormalized, hash, req.user.userId]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// АДМИН: пользователи
// =========================================================
app.get('/api/admin/users', adminOnly(), async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT u.email, u.first_name, u.last_name, u.phone, u.address,
                    u.discount_percent, r.role_name
             FROM users u JOIN roles r ON u.role_id = r.role_id
             ORDER BY u.user_id`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:email', adminOnly(), (_req, res) => {
    res.status(403).json({ error: 'Изменение данных пользователей запрещено. Пользователь редактирует свой профиль сам.' });
});

app.delete('/api/admin/users/:email', adminOnly(), (_req, res) => {
    res.status(403).json({ error: 'Удаление пользователей запрещено. Обратитесь к администратору БД.' });
});

app.put('/api/admin/users/:email/role', adminOnly(), async (req, res) => {
    try {
        const { role_name } = req.body;
        const role = await pool.query(
            'SELECT role_id, role_name FROM roles WHERE role_name = $1',
            [role_name]
        );
        if (!role.rows.length) return res.status(400).json({ error: 'Роль не существует' });
        if (role.rows[0].role_name === 'admin') {
            return res.status(403).json({ error: 'Нельзя назначить роль администратора через интерфейс' });
        }

        const target = await pool.query(
            `SELECT r.role_name FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.email = $1`,
            [req.params.email]
        );
        if (!target.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
        if (target.rows[0].role_name === 'admin') {
            return res.status(403).json({ error: 'Нельзя изменить роль администратора' });
        }

        await pool.query(
            'UPDATE users SET role_id = $1 WHERE email = $2',
            [role.rows[0].role_id, req.params.email]
        );
        res.json({ message: 'Роль обновлена', role_name: role.rows[0].role_name });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/users/:email/discount', adminOnly(), async (req, res) => {
    try {
        const { discount_percent } = req.body;
        const d = Number(discount_percent);
        if (isNaN(d) || d < 0 || d > 99) {
            return res.status(400).json({ error: 'Скидка от 0 до 99%' });
        }
        const r = await pool.query(
            'UPDATE users SET discount_percent = $1 WHERE email = $2 RETURNING email, discount_percent',
            [d, req.params.email]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// РОЛИ
// =========================================================
app.get('/api/roles', adminOnly(), async (_req, res) => {
    try {
        const r = await pool.query('SELECT role_name, description FROM roles ORDER BY role_id');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// КУПОНЫ
// =========================================================
app.get('/api/coupons', async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT code, discount_percent, usage_limit, used_count, is_active, first_order_only
             FROM coupons ORDER BY coupon_id`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coupons/validate', auth(), async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT code, discount_percent, first_order_only FROM coupons
             WHERE code = $1 AND is_active = TRUE
             AND (usage_limit IS NULL OR used_count < usage_limit)`,
            [req.query.code?.toUpperCase()]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Купон не найден или неактивен' });

        const coupon = r.rows[0];
        if (coupon.first_order_only) {
            const orders = await pool.query(
                'SELECT COUNT(*)::int AS c FROM orders WHERE user_id = $1',
                [req.user.userId]
            );
            if (orders.rows[0].c > 0) {
                return res.status(400).json({ error: 'Этот купон доступен только на первый заказ' });
            }
        }
        res.json(coupon);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/coupons', adminOnly(), async (req, res) => {
    try {
        const { code, discount_percent, usage_limit, first_order_only } = req.body;
        const percent = parseInt(discount_percent, 10);
        if (!code || !code.trim()) return res.status(400).json({ error: 'Код обязателен' });
        if (!percent || percent < 1 || percent > 99) {
            return res.status(400).json({ error: 'Скидка от 1 до 99%' });
        }
        const r = await pool.query(
            `INSERT INTO coupons (code, discount_percent, usage_limit, first_order_only)
             VALUES ($1,$2,$3,$4)
             RETURNING code, discount_percent, usage_limit, used_count, is_active, first_order_only`,
            [code.trim().toUpperCase(), percent, usage_limit || null, first_order_only === true]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Такой купон уже есть' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/coupons/:code', adminOnly(), async (req, res) => {
    try {
        const { code, discount_percent, usage_limit, is_active, first_order_only } = req.body;
        const percent = parseInt(discount_percent, 10);
        if (!percent || percent < 1 || percent > 99) {
            return res.status(400).json({ error: 'Скидка от 1 до 99%' });
        }
        const r = await pool.query(
            `UPDATE coupons SET code = $1, discount_percent = $2,
                                usage_limit = $3, is_active = $4, first_order_only = $5
             WHERE code = $6
             RETURNING code, discount_percent, usage_limit, used_count, is_active, first_order_only`,
            [code.toUpperCase(), percent, usage_limit || null,
             is_active !== false, first_order_only === true, req.params.code]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/coupons/:code', adminOnly(), async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE code = $1', [req.params.code]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// СЕРТИФИКАТЫ
// =========================================================
app.get('/api/certificates', async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT code, title, description, image_url, amount, is_active
             FROM certificates ORDER BY certificate_id`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/certificates', adminOnly(), async (req, res) => {
    try {
        const { code, title, description, image_url, amount } = req.body;
        if (!code || !title) return res.status(400).json({ error: 'Код и название обязательны' });
        const r = await pool.query(
            `INSERT INTO certificates (code, title, description, image_url, amount)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING code, title, description, image_url, amount, is_active`,
            [code.toUpperCase(), title, description || null, image_url || null, amount || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Код уже занят' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/certificates/:code', adminOnly(), async (req, res) => {
    try {
        const { code, title, description, image_url, amount, is_active } = req.body;
        const r = await pool.query(
            `UPDATE certificates SET code = $1, title = $2, description = $3,
                                    image_url = $4, amount = $5, is_active = $6
             WHERE code = $7
             RETURNING code, title, description, image_url, amount, is_active`,
            [code.toUpperCase(), title, description || null, image_url || null,
             amount || null, is_active !== false, req.params.code]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/certificates/:code', adminOnly(), async (req, res) => {
    try {
        await pool.query('DELETE FROM certificates WHERE code = $1', [req.params.code]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ЗАПИСИ
// =========================================================
app.get('/api/appointments', staffOnly(), async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT a.appointment_date, a.appointment_time, a.status, a.notes,
                    u.email, s.service_name
             FROM appointments a
             JOIN users u ON a.user_id = u.user_id
             JOIN services s ON a.service_id = s.service_id
             ORDER BY a.appointment_date DESC`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ПОИСК
// =========================================================
app.get('/api/admin/search', staffOnly(), async (req, res) => {
    try {
        const { type, q } = req.query;
        if (!q || !q.trim()) return res.json([]);
        const needle = `%${q.trim()}%`;

        const map = {
            user: `SELECT email, first_name, last_name FROM users
                   WHERE email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`,
            service: `SELECT slug, service_name, price FROM services
                      WHERE service_name ILIKE $1`,
            coupon: `SELECT code, discount_percent FROM coupons WHERE code ILIKE $1`,
            certificate: `SELECT code, title FROM certificates
                          WHERE code ILIKE $1 OR title ILIKE $1`,
        };
        const sql = map[type];
        if (!sql) return res.status(400).json({ error: 'Неверный тип' });
        const r = await pool.query(sql, [needle]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ЗАПУСК
// =========================================================
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`JWT_SECRET задан: ${process.env.JWT_SECRET ? 'да' : 'НЕТ'}`);
    console.log(`MAIL настроен: ${process.env.MAIL_USER ? 'да' : 'нет (коды в консоль)'}`);
});
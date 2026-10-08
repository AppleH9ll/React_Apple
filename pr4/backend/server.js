import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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
// MIDDLEWARE — единая система защиты
// =========================================================
// protect(roles) — фабрика middleware.
//   roles = null              → любой авторизованный пользователь
//   roles = ['admin']         → только админ
//   roles = ['admin','employee'] → админ или сотрудник
//
// Примеры использования в роутах:
//   app.get('/api/roles', adminOnly(), handler)
//   app.get('/api/appointments', staffOnly(), handler)
//   app.get('/api/cart', auth(), handler)
function protect(roles = null) {
    return (req, res, next) => {
        const header = req.headers.authorization || '';
        const token = header.startsWith('Bearer ') ? header.slice(7) : null;

        if (!token) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
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

// Готовые шорткаты для роутов
const auth      = () => protect(null);
const adminOnly = () => protect(['admin']);
const staffOnly = () => protect(['admin', 'employee']);

// Хелпер: получить информацию о роли по id
async function getRoleById(roleId, client = pool) {
    const r = await client.query(
        'SELECT role_id, role_name FROM roles WHERE role_id = $1',
        [roleId]
    );
    return r.rows[0] || null;
}

function signToken(user) {
    return jwt.sign(
        { userId: user.user_id, email: user.email, role: user.role_name },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// =========================================================
// АВТОРИЗАЦИЯ (публичные роуты)
// =========================================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { full_name, email, password, phone } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({ error: 'Заполните обязательные поля' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Пароль минимум 6 символов' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Некорректный email' });
        }

        const dup = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (dup.rows.length) return res.status(400).json({ error: 'Email уже занят' });

        const roleRes = await pool.query(
            "SELECT role_id, role_name FROM roles WHERE role_name = 'user' LIMIT 1"
        );
        if (!roleRes.rows.length) {
            return res.status(500).json({ error: 'Роль "user" не найдена в БД' });
        }

        const parts = full_name.trim().split(' ');
        const firstName = parts[0] || '';
        const lastName = parts.slice(1).join(' ') || '';

        const hash = await bcrypt.hash(password, 10);
        const r = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, role_id)
             VALUES ($1,$2,$3,$4,$5,$6)
             RETURNING user_id, email, first_name, last_name, phone, role_id, discount_percent`,
            [email, hash, firstName, lastName, phone || null, roleRes.rows[0].role_id]
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
        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

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
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// Текущий пользователь — по токену
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
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =========================================================
// КАТЕГОРИИ
// =========================================================
app.get('/api/categories', async (_req, res) => {
    try {
        const r = await pool.query(
            'SELECT slug, category_name, description FROM categories ORDER BY category_id'
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', staffOnly(), async (req, res) => {
    try {
        const { category_name, description } = req.body;
        if (!category_name || !category_name.trim()) {
            return res.status(400).json({ error: 'Название обязательно' });
        }
        const slug = category_name.trim().toLowerCase()
            .replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

        const dup = await pool.query(
            'SELECT 1 FROM categories WHERE LOWER(category_name) = LOWER($1)',
            [category_name.trim()]
        );
        if (dup.rows.length) return res.status(400).json({ error: 'Такая категория уже есть' });

        const r = await pool.query(
            `INSERT INTO categories (category_name, description, slug)
             VALUES ($1, $2, $3) RETURNING slug, category_name, description`,
            [category_name.trim(), description || null, slug]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Уже существует' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/categories/:slug', staffOnly(), async (req, res) => {
    try {
        const { category_name, description } = req.body;
        const dup = await pool.query(
            'SELECT 1 FROM categories WHERE LOWER(category_name) = LOWER($1) AND slug <> $2',
            [category_name, req.params.slug]
        );
        if (dup.rows.length) return res.status(400).json({ error: 'Название занято' });

        const newSlug = category_name.trim().toLowerCase()
            .replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

        const r = await pool.query(
            `UPDATE categories SET category_name = $1, description = $2, slug = $3
             WHERE slug = $4 RETURNING slug, category_name, description`,
            [category_name, description || null, newSlug, req.params.slug]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// КАСКАДНОЕ УДАЛЕНИЕ КАТЕГОРИИ
app.delete('/api/categories/:slug', staffOnly(), async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const cnt = await client.query(
            `SELECT COUNT(*)::int AS count FROM services s
             JOIN categories c ON s.category_id = c.category_id
             WHERE c.slug = $1`,
            [req.params.slug]
        );
        const serviceCount = cnt.rows[0].count;

        if (serviceCount > 0 && req.query.cascade !== 'true') {
            await client.query('ROLLBACK');
            return res.status(409).json({
                error: `В категории ${serviceCount} товаров. Требуется каскадное удаление.`,
                serviceCount,
                requiresCascade: true,
            });
        }

        if (serviceCount > 0) {
            await client.query(
                `DELETE FROM services WHERE category_id = (
                    SELECT category_id FROM categories WHERE slug = $1
                )`,
                [req.params.slug]
            );
        }

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
            message: `Категория "${r.rows[0].category_name}" удалена. Удалено товаров: ${serviceCount}`,
            deletedServices: serviceCount,
        });
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

// =========================================================
// ТОВАРЫ (публичные GET, защищённые POST/PUT/DELETE)
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

app.get('/api/services/:slug', async (req, res) => {
    try {
        const srv = await pool.query(
            `SELECT s.slug, s.service_name, s.description, s.duration_minutes,
                    s.price, s.image_url, s.discount_percent,
                    c.slug AS category_slug, c.category_name
             FROM services s
             LEFT JOIN categories c ON s.category_id = c.category_id
             WHERE s.slug = $1`,
            [req.params.slug]
        );
        if (!srv.rows.length) return res.status(404).json({ error: 'Товар не найден' });

        const rv = await pool.query(
            `SELECT r.rating, r.comment, r.created_at,
                    u.first_name, u.last_name
             FROM reviews r
             JOIN users u ON r.user_id = u.user_id
             WHERE r.service_id = (SELECT service_id FROM services WHERE slug = $1)
             ORDER BY r.created_at DESC`,
            [req.params.slug]
        );

        res.json({ ...srv.rows[0], reviews: rv.rows });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/services', staffOnly(), async (req, res) => {
    try {
        const { service_name, description, duration_minutes, price,
                category_slug, image_url, discount_percent } = req.body;

        if (!service_name || !price) {
            return res.status(400).json({ error: 'Название и цена обязательны' });
        }

        const cat = await pool.query(
            'SELECT category_id FROM categories WHERE slug = $1',
            [category_slug]
        );
        if (!cat.rows.length) return res.status(400).json({ error: 'Категория не найдена' });

        const slug = service_name.trim().toLowerCase()
            .replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

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

        const cat = await pool.query(
            'SELECT category_id FROM categories WHERE slug = $1',
            [category_slug]
        );
        if (!cat.rows.length) return res.status(400).json({ error: 'Категория не найдена' });

        const newSlug = service_name.trim().toLowerCase()
            .replace(/[^a-zA-Zа-яА-Я0-9]+/g, '-');

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
// КОРЗИНА — только роль user
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
    try {
        const { service_slug, quantity = 1 } = req.body;
        if (!service_slug) return res.status(400).json({ error: 'service_slug обязателен' });

        const roleRes = await pool.query(
            `SELECT r.role_name FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.user_id = $1`,
            [req.user.userId]
        );
        if (roleRes.rows[0]?.role_name !== 'user') {
            return res.status(403).json({
                error: 'Сотрудники и администраторы не могут добавлять товары в корзину'
            });
        }

        const srv = await pool.query(
            'SELECT service_id FROM services WHERE slug = $1',
            [service_slug]
        );
        if (!srv.rows.length) return res.status(404).json({ error: 'Товар не найден' });

        const r = await pool.query(
            `INSERT INTO cart (user_id, service_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, service_id)
             DO UPDATE SET quantity = cart.quantity + $3
             RETURNING quantity`,
            [req.user.userId, srv.rows[0].service_id, quantity]
        );
        res.status(201).json({ message: 'Добавлено в корзину', quantity: r.rows[0].quantity });
    } catch (e) { res.status(500).json({ error: e.message }); }
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
// ЗАКАЗЫ — с датой доставки, без user_id на входе
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
        if (!userRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
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
            couponDiscount = cp.rows[0].discount_percent;
            couponId = cp.rows[0].coupon_id;
        }

        const couponAmount = afterUser * (couponDiscount / 100);
        const finalAmount = afterUser - couponAmount;

        const orderRes = await client.query(
            `INSERT INTO orders (user_id, total_amount, discount_amount, final_amount,
                                 coupon_code, address, delivery_date)
             VALUES ($1,$2,$3,$4,$5,$6,$7)
             RETURNING order_id, total_amount, discount_amount, final_amount,
                       coupon_code, address, delivery_date, created_at`,
            [req.user.userId, subtotal, subtotal - finalAmount, finalAmount,
             coupon_code || null, address.trim(), delivery_date]
        );

        for (const it of cartRes.rows) {
            await client.query(
                `INSERT INTO order_items (order_id, service_id, service_name, quantity, price)
                 VALUES ($1,$2,$3,$4,$5)`,
                [orderRes.rows[0].order_id, it.service_id, it.service_name,
                 it.quantity, it.price]
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

        const { order_id, ...safeOrder } = orderRes.rows[0];
        res.status(201).json({ ...safeOrder, items: cartRes.rows });
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
            `SELECT o.order_id, o.total_amount, o.discount_amount, o.final_amount,
                    o.coupon_code, o.address, o.delivery_date, o.status, o.created_at
             FROM orders o WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
            [req.user.userId]
        );

        const result = [];
        for (const o of orders.rows) {
            const items = await pool.query(
                `SELECT service_name, quantity, price
                 FROM order_items WHERE order_id = $1`,
                [o.order_id]
            );
            result.push({ ...o, items: items.rows });
        }
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// ОТЗЫВЫ
// =========================================================
app.post('/api/services/:slug/reviews', auth(), async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const r = Number(rating);
        if (!r || r < 1 || r > 5) {
            return res.status(400).json({ error: 'Оценка от 1 до 5' });
        }

        const srv = await pool.query(
            'SELECT service_id FROM services WHERE slug = $1',
            [req.params.slug]
        );
        if (!srv.rows.length) return res.status(404).json({ error: 'Товар не найден' });

        const exists = await pool.query(
            'SELECT 1 FROM reviews WHERE user_id = $1 AND service_id = $2',
            [req.user.userId, srv.rows[0].service_id]
        );
        if (exists.rows.length) {
            return res.status(400).json({ error: 'Вы уже оставляли отзыв на этот товар' });
        }

        await pool.query(
            `INSERT INTO reviews (user_id, service_id, rating, comment)
             VALUES ($1, $2, $3, $4)`,
            [req.user.userId, srv.rows[0].service_id, r, comment || null]
        );
        res.status(201).json({ message: 'Отзыв добавлен' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/services/:slug/reviews', adminOnly(), async (req, res) => {
    try {
        await pool.query(
            `DELETE FROM reviews WHERE service_id = (
                SELECT service_id FROM services WHERE slug = $1
            )`,
            [req.params.slug]
        );
        res.json({ message: 'Отзывы удалены' });
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
             address || null, phone || null, hash, req.user.userId]
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

app.put('/api/admin/users/:email/role', adminOnly(), async (req, res) => {
    try {
        const { role_name } = req.body;
        const role = await pool.query(
            'SELECT role_id, role_name FROM roles WHERE role_name = $1',
            [role_name]
        );
        if (!role.rows.length) return res.status(400).json({ error: 'Роль не существует' });
        if (role.rows[0].role_name === 'admin') {
            return res.status(403).json({
                error: 'Нельзя назначить роль администратора через интерфейс'
            });
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

app.delete('/api/admin/users/:email', adminOnly(), async (req, res) => {
    try {
        const check = await pool.query(
            `SELECT r.role_name FROM users u
             JOIN roles r ON u.role_id = r.role_id
             WHERE u.email = $1`,
            [req.params.email]
        );
        if (!check.rows.length) return res.status(404).json({ error: 'Пользователь не найден' });
        if (check.rows[0].role_name === 'admin') {
            return res.status(403).json({
                error: 'Администраторов можно удалять только через БД'
            });
        }
        await pool.query('DELETE FROM users WHERE email = $1', [req.params.email]);
        res.json({ message: 'Пользователь удалён со всеми связанными данными' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// РОЛИ (только админ)
// =========================================================
app.get('/api/roles', adminOnly(), async (_req, res) => {
    try {
        const r = await pool.query(
            'SELECT role_name, description FROM roles ORDER BY role_id'
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// =========================================================
// КУПОНЫ (публичное чтение, защищённая запись)
// =========================================================
app.get('/api/coupons', async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT code, discount_percent, usage_limit, used_count, is_active
             FROM coupons ORDER BY coupon_id`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coupons/validate', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT code, discount_percent FROM coupons
             WHERE code = $1 AND is_active = TRUE
             AND (usage_limit IS NULL OR used_count < usage_limit)`,
            [req.query.code?.toUpperCase()]
        );
        if (!r.rows.length) {
            return res.status(404).json({ error: 'Купон не найден или неактивен' });
        }
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/coupons', adminOnly(), async (req, res) => {
    try {
        const { code, discount_percent, usage_limit } = req.body;
        const percent = parseInt(discount_percent, 10);
        if (!code || !code.trim()) return res.status(400).json({ error: 'Код обязателен' });
        if (!percent || percent < 1 || percent > 99) {
            return res.status(400).json({ error: 'Скидка от 1 до 99%' });
        }
        const r = await pool.query(
            `INSERT INTO coupons (code, discount_percent, usage_limit)
             VALUES ($1,$2,$3)
             RETURNING code, discount_percent, usage_limit, used_count, is_active`,
            [code.trim().toUpperCase(), percent, usage_limit || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Такой купон уже есть' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/coupons/:code', adminOnly(), async (req, res) => {
    try {
        const { code, discount_percent, usage_limit, is_active } = req.body;
        const percent = parseInt(discount_percent, 10);
        if (!percent || percent < 1 || percent > 99) {
            return res.status(400).json({ error: 'Скидка от 1 до 99%' });
        }
        const r = await pool.query(
            `UPDATE coupons SET code = $1, discount_percent = $2,
                                usage_limit = $3, is_active = $4
             WHERE code = $5
             RETURNING code, discount_percent, usage_limit, used_count, is_active`,
            [code.toUpperCase(), percent, usage_limit || null,
             is_active !== false, req.params.code]
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
        if (!code || !title) {
            return res.status(400).json({ error: 'Код и название обязательны' });
        }
        const r = await pool.query(
            `INSERT INTO certificates (code, title, description, image_url, amount)
             VALUES ($1,$2,$3,$4,$5)
             RETURNING code, title, description, image_url, amount, is_active`,
            [code.toUpperCase(), title, description || null,
             image_url || null, amount || null]
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
// ЗАПИСИ (appointments) — админ и сотрудник
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
// ПОИСК — админ и сотрудник
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
    console.log(`JWT_SECRET задан: ${process.env.JWT_SECRET ? 'да' : 'НЕТ (используется дефолтный!)'}`);
});
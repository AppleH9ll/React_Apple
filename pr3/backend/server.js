import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import pg from 'pg';
import bcrypt from 'bcryptjs';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

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

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, first_name, last_name, address, phone } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' });

        const dup = await pool.query('SELECT 1 FROM users WHERE email = $1', [email]);
        if (dup.rows.length) return res.status(400).json({ error: 'Email уже занят' });

        const hash = await bcrypt.hash(password, 10);
        const r = await pool.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, address, phone, role_id)
             VALUES ($1,$2,$3,$4,$5,$6,2)
             RETURNING user_id, email, first_name, last_name, address, phone, role_id`,
            [email, hash, first_name, last_name, address, phone]
        );
        res.status(201).json(r.rows[0]);
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

        const { password_hash, ...clean } = user;
        res.json(clean);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/services', async (req, res) => {
    try {
        const { category_id, q, min_price, max_price, sort } = req.query;
        const params = [];
        let query = `
            SELECT s.*, c.category_name
            FROM services s
            LEFT JOIN categories c ON s.category_id = c.category_id
            WHERE s.is_active = TRUE
        `;
        if (category_id) { params.push(category_id); query += ` AND s.category_id = $${params.length}`; }
        if (q && q.trim()) { params.push(`%${q.trim()}%`); query += ` AND (s.service_name ILIKE $${params.length} OR s.description ILIKE $${params.length})`; }
        if (min_price) { params.push(min_price); query += ` AND s.price >= $${params.length}`; }
        if (max_price) { params.push(max_price); query += ` AND s.price <= $${params.length}`; }

        const sortMap = { price_asc: 's.price ASC', price_desc: 's.price DESC', name: 's.service_name ASC' };
        query += ` ORDER BY ${sortMap[sort] || 's.service_id'}`;

        const r = await pool.query(query, params);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/services/:id', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT s.*, c.category_name FROM services s
             LEFT JOIN categories c ON s.category_id = c.category_id
             WHERE s.service_id = $1`,
            [req.params.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Услуга не найдена' });
        res.json(r.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/services', async (req, res) => {
    try {
        const { service_name, description, duration_minutes, price, category_id, image_url, discount_percent } = req.body;
        const r = await pool.query(
            `INSERT INTO services (service_name, description, duration_minutes, price, category_id, image_url, discount_percent)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [service_name, description, duration_minutes, price, category_id, image_url || null, discount_percent || 0]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/services/:id', async (req, res) => {
    try {
        const { service_name, description, duration_minutes, price, category_id, image_url, discount_percent } = req.body;
        const r = await pool.query(
            `UPDATE services SET service_name=$1, description=$2, duration_minutes=$3, price=$4,
                                 category_id=$5, image_url=$6, discount_percent=$7
             WHERE service_id=$8 RETURNING *`,
            [service_name, description, duration_minutes, price, category_id, image_url || null, discount_percent || 0, req.params.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
        res.json(r.rows[0]);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM services WHERE service_id = $1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/categories', async (_req, res) => {
    try {
        const r = await pool.query('SELECT * FROM categories ORDER BY category_id');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/categories', async (req, res) => {
    try {
        const { category_name, description } = req.body;
        if (!category_name || !category_name.trim()) {
            return res.status(400).json({ error: 'Название обязательно' });
        }
        const dup = await pool.query(
            'SELECT 1 FROM categories WHERE LOWER(category_name) = LOWER($1)',
            [category_name.trim()]
        );
        if (dup.rows.length) return res.status(400).json({ error: 'Такая категория уже есть' });

        const r = await pool.query(
            'INSERT INTO categories (category_name, description) VALUES ($1,$2) RETURNING *',
            [category_name.trim(), description || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Уже существует' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/categories/:id', async (req, res) => {
    try {
        const { category_name, description } = req.body;
        const dup = await pool.query(
            'SELECT 1 FROM categories WHERE LOWER(category_name)=LOWER($1) AND category_id<>$2',
            [category_name, req.params.id]
        );
        if (dup.rows.length) return res.status(400).json({ error: 'Название занято' });

        const r = await pool.query(
            'UPDATE categories SET category_name=$1, description=$2 WHERE category_id=$3 RETURNING *',
            [category_name, description || null, req.params.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Не найдено' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/categories/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categories WHERE category_id=$1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cart/:userId', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT c.*, s.service_name, s.price, s.duration_minutes, s.discount_percent, s.image_url
             FROM cart c JOIN services s ON c.service_id = s.service_id
             WHERE c.user_id = $1 ORDER BY c.added_at DESC`,
            [req.params.userId]
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cart', async (req, res) => {
    try {
        const { user_id, service_id, quantity = 1 } = req.body;
        const r = await pool.query(
            `INSERT INTO cart (user_id, service_id, quantity)
             VALUES ($1,$2,$3)
             ON CONFLICT (user_id, service_id)
             DO UPDATE SET quantity = cart.quantity + $3
             RETURNING *`,
            [user_id, service_id, quantity]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/api/cart/:cartId', async (req, res) => {
    try {
        const { quantity } = req.body;
        if (quantity < 1) {
            await pool.query('DELETE FROM cart WHERE cart_id = $1', [req.params.cartId]);
            return res.json({ deleted: true });
        }
        const r = await pool.query(
            'UPDATE cart SET quantity = $1 WHERE cart_id = $2 RETURNING *',
            [quantity, req.params.cartId]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cart/:cartId', async (req, res) => {
    try {
        await pool.query('DELETE FROM cart WHERE cart_id = $1', [req.params.cartId]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cart/user/:userId', async (req, res) => {
    try {
        await pool.query('DELETE FROM cart WHERE user_id = $1', [req.params.userId]);
        res.json({ message: 'Очищено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/orders', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { user_id, coupon_code, address } = req.body;

        const cartRes = await client.query(
            `SELECT c.*, s.price, s.discount_percent, s.service_name
             FROM cart c JOIN services s ON c.service_id = s.service_id
             WHERE c.user_id = $1`,
            [user_id]
        );
        if (!cartRes.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Корзина пуста' });
        }

        let total = 0;
        for (const it of cartRes.rows) {
            const price = parseFloat(it.price);
            const disc = it.discount_percent || 0;
            total += price * (1 - disc / 100) * it.quantity;
        }

        let couponDiscount = 0, couponId = null;
        if (coupon_code) {
            const cp = await client.query(
                `SELECT * FROM coupons WHERE code = $1 AND is_active = TRUE
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

        const discountAmount = total * (couponDiscount / 100);
        const final = total - discountAmount;

        const orderRes = await client.query(
            `INSERT INTO orders (user_id, total_amount, discount_amount, final_amount, coupon_code, address)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
            [user_id, total, discountAmount, final, coupon_code || null, address || null]
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

        await client.query('DELETE FROM cart WHERE user_id = $1', [user_id]);
        await client.query('COMMIT');
        res.status(201).json(orderRes.rows[0]);
    } catch (e) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: e.message });
    } finally {
        client.release();
    }
});

app.get('/api/users/:id/orders', async (req, res) => {
    try {
        const orders = await pool.query(
            `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
            [req.params.id]
        );
        const result = [];
        for (const o of orders.rows) {
            const items = await pool.query(
                `SELECT order_item_id, service_id, service_name, quantity, price
                 FROM order_items WHERE order_id = $1`,
                [o.order_id]
            );
            result.push({ ...o, items: items.rows });
        }
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coupons', async (_req, res) => {
    try {
        const r = await pool.query('SELECT * FROM coupons ORDER BY coupon_id');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/coupons/validate', async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) return res.status(400).json({ error: 'Код обязателен' });
        const r = await pool.query(
            `SELECT coupon_id, code, discount_percent FROM coupons
             WHERE code = $1 AND is_active = TRUE
             AND (usage_limit IS NULL OR used_count < usage_limit)`,
            [code.toUpperCase()]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Купон не найден или неактивен' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/coupons', async (req, res) => {
    try {
        const { code, discount_percent, usage_limit } = req.body;
        const percent = parseInt(discount_percent, 10);
        if (!code || !code.trim()) return res.status(400).json({ error: 'Код обязателен' });
        if (!percent || percent < 1 || percent > 99) {
            return res.status(400).json({ error: 'Скидка от 1 до 99%' });
        }
        const r = await pool.query(
            `INSERT INTO coupons (code, discount_percent, usage_limit)
             VALUES ($1,$2,$3) RETURNING *`,
            [code.trim().toUpperCase(), percent, usage_limit || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Такой купон уже есть' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/coupons/:id', async (req, res) => {
    try {
        const { code, discount_percent, usage_limit, is_active } = req.body;
        const percent = parseInt(discount_percent, 10);
        if (!percent || percent < 1 || percent > 99) {
            return res.status(400).json({ error: 'Скидка от 1 до 99%' });
        }
        const r = await pool.query(
            `UPDATE coupons SET code=$1, discount_percent=$2, usage_limit=$3, is_active=$4
             WHERE coupon_id=$5 RETURNING *`,
            [code.toUpperCase(), percent, usage_limit || null, is_active !== false, req.params.id]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/coupons/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM coupons WHERE coupon_id=$1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/certificates', async (_req, res) => {
    try {
        const r = await pool.query('SELECT * FROM certificates ORDER BY certificate_id');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/certificates', async (req, res) => {
    try {
        const { code, title, description, image_url, amount } = req.body;
        if (!code || !title) return res.status(400).json({ error: 'Код и название обязательны' });
        const r = await pool.query(
            `INSERT INTO certificates (code, title, description, image_url, amount)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [code.toUpperCase(), title, description || null, image_url || null, amount || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ error: 'Код уже занят' });
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/certificates/:id', async (req, res) => {
    try {
        const { code, title, description, image_url, amount, is_active } = req.body;
        const r = await pool.query(
            `UPDATE certificates SET code=$1, title=$2, description=$3, image_url=$4,
                                    amount=$5, is_active=$6
             WHERE certificate_id=$7 RETURNING *`,
            [code.toUpperCase(), title, description || null, image_url || null, amount || null, is_active !== false, req.params.id]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/certificates/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM certificates WHERE certificate_id=$1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT u.user_id, u.email, u.first_name, u.last_name, u.phone, u.address,
                    u.discount_percent, u.role_id, r.role_name
             FROM users u LEFT JOIN roles r ON u.role_id = r.role_id
             ORDER BY u.user_id`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const r = await pool.query(
            `SELECT u.user_id, u.email, u.first_name, u.last_name, u.phone, u.address,
                    u.discount_percent, u.discount_coupon, r.role_name
             FROM users u LEFT JOIN roles r ON u.role_id = r.role_id
             WHERE u.user_id = $1`,
            [req.params.id]
        );
        if (!r.rows.length) return res.status(404).json({ error: 'Не найден' });
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { email, first_name, last_name, address, phone, password, discount_percent } = req.body;

        if (email) {
            const dup = await pool.query(
                'SELECT 1 FROM users WHERE email=$1 AND user_id<>$2',
                [email, req.params.id]
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
                password_hash = COALESCE($6, password_hash),
                discount_percent = COALESCE($7, discount_percent)
             WHERE user_id = $8
             RETURNING user_id, email, first_name, last_name, address, phone, discount_percent, role_id`,
            [email, first_name, last_name, address, phone, hash, discount_percent, req.params.id]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/roles', async (_req, res) => {
    try {
        const r = await pool.query('SELECT * FROM roles ORDER BY role_id');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/appointments', async (_req, res) => {
    try {
        const r = await pool.query(
            `SELECT a.*, u.email, s.service_name
             FROM appointments a
             JOIN users u ON a.user_id = u.user_id
             JOIN services s ON a.service_id = s.service_id
             ORDER BY a.appointment_date DESC`
        );
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/appointments', async (req, res) => {
    try {
        const { user_id, service_id, appointment_date, appointment_time, notes } = req.body;
        const r = await pool.query(
            `INSERT INTO appointments (user_id, service_id, appointment_date, appointment_time, notes)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [user_id, service_id, appointment_date, appointment_time || null, notes || null]
        );
        res.status(201).json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM appointments WHERE appointment_id=$1', [req.params.id]);
        res.json({ message: 'Удалено' });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/admin/search', async (req, res) => {
    try {
        const { type, q } = req.query;
        if (!q || !q.trim()) return res.json([]);
        const needle = `%${q.trim()}%`;

        const map = {
            user: `SELECT user_id, email, first_name, last_name FROM users
                   WHERE email ILIKE $1 OR first_name ILIKE $1 OR last_name ILIKE $1`,
            service: `SELECT service_id, service_name, price FROM services
                      WHERE service_name ILIKE $1`,
            coupon: `SELECT coupon_id, code, discount_percent FROM coupons WHERE code ILIKE $1`,
            certificate: `SELECT certificate_id, code, title FROM certificates
                          WHERE code ILIKE $1 OR title ILIKE $1`,
        };
        const sql = map[type];
        if (!sql) return res.status(400).json({ error: 'Неверный тип' });
        const r = await pool.query(sql, [needle]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
import { useEffect, useState } from 'react';
import { api } from '../api/api';

const empty = {
    service_name: '',
    description: '',
    duration_minutes: 60,
    price: '',
    category_id: '',
    image_url: '',
    discount_percent: 0,
};

export default function AdminServices() {
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [form, setForm] = useState(empty);
    const [editing, setEditing] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const [s, c] = await Promise.all([api.services(), api.categories()]);
            setServices(s);
            setCategories(c);
        } catch (err) {
            setError(err.message);
        }
    }

    const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    async function save(e) {
        e.preventDefault();
        try {
            if (editing) await api.updateService(editing, form);
            else await api.addService(form);
            setForm(empty);
            setEditing(null);
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    async function remove(id) {
        if (!confirm('Удалить услугу?')) return;
        try {
            await api.deleteService(id);
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    function edit(s) {
        setEditing(s.service_id);
        setForm({
            service_name: s.service_name,
            description: s.description,
            duration_minutes: s.duration_minutes,
            price: s.price,
            category_id: s.category_id,
            image_url: s.image_url || '',
            discount_percent: s.discount_percent || 0,
        });
    }

    return (
        <section className="admin-section">
            <h1>Управление услугами</h1>

            {error && <div className="admin-message error">{error}</div>}

            <form className="admin-form-grid" onSubmit={save}>
                <input name="service_name" value={form.service_name} onChange={change} placeholder="Название" required />
                <input name="duration_minutes" type="number" value={form.duration_minutes} onChange={change} placeholder="Длительность (мин)" required />
                <input name="price" type="number" value={form.price} onChange={change} placeholder="Цена" required />
                <select name="category_id" value={form.category_id} onChange={change} required>
                    <option value="">Выберите категорию</option>
                    {categories.map(c => (
                        <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                    ))}
                </select>
                <input name="discount_percent" type="number" min="0" max="99" value={form.discount_percent} onChange={change} placeholder="Скидка %" />
                <input name="image_url" value={form.image_url} onChange={change} placeholder="URL фото" className="admin-form-wide" />
                <textarea name="description" value={form.description} onChange={change} placeholder="Описание" className="admin-form-wide" rows={2} required />
                <button className="btn-primary admin-form-wide">
                    {editing ? 'Сохранить изменения' : 'Добавить услугу'}
                </button>
                {editing && (
                    <button
                        type="button"
                        className="btn-cancel admin-form-wide"
                        onClick={() => { setEditing(null); setForm(empty); }}
                    >
                        Отмена
                    </button>
                )}
            </form>

            <div className="admin-table">
                {services.map(s => (
                    <div key={s.service_id} className="admin-table-row admin-table-row-service">
                        <span className="admin-cell-strong">{s.service_name}</span>
                        <span className="admin-cell-muted">{s.category_name}</span>
                        <span>{Number(s.price).toLocaleString()} ₽</span>
                        <div className="admin-row-actions">
                            <button className="btn-edit" onClick={() => edit(s)}>Изменить</button>
                            <button className="btn-delete" onClick={() => remove(s.service_id)}>Удалить</button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
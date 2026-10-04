import { useEffect, useState } from 'react';
import { api } from '../api/api';

const empty = { code: '', title: '', description: '', image_url: '', amount: '' };

export default function AdminCertificates() {
    const [items, setItems] = useState([]);
    const [form, setForm] = useState(empty);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setItems(await api.certificates());
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    function showMessage(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }

    function updateForm(field, value) {
        setForm(prev => ({ ...prev, [field]: value }));
    }

    async function handleCreate(e) {
        e.preventDefault();
        if (!form.code.trim() || !form.title.trim()) return;
        try {
            setLoading(true);
            await api.addCertificate({
                code: form.code.trim(),
                title: form.title.trim(),
                description: form.description.trim(),
                image_url: form.image_url.trim(),
                amount: form.amount ? parseFloat(form.amount) : null,
            });
            setForm(empty);
            showMessage('success', 'Сертификат создан');
            load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    function startEdit(it) {
        setEditingId(it.certificate_id);
        setEditData({
            code: it.code,
            title: it.title,
            amount: it.amount || '',
            is_active: it.is_active,
        });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditData({});
    }

    async function handleUpdate(id) {
        try {
            setLoading(true);
            await api.updateCertificate(id, {
                code: editData.code,
                title: editData.title,
                amount: editData.amount ? parseFloat(editData.amount) : null,
                is_active: editData.is_active,
            });
            setEditingId(null);
            showMessage('success', 'Сертификат обновлён');
            load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Удалить сертификат?')) return;
        try {
            await api.deleteCertificate(id);
            showMessage('success', 'Сертификат удалён');
            load();
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    return (
        <section className="admin-section">
            <div className="admin-section-header">
                <h2>Подарочные сертификаты</h2>
            </div>

            {message.text && <div className={`admin-message ${message.type}`}>{message.text}</div>}

            <form onSubmit={handleCreate} className="admin-form-grid">
                <input type="text" placeholder="Код" value={form.code} onChange={(e) => updateForm('code', e.target.value.toUpperCase())} />
                <input type="text" placeholder="Название" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
                <input type="number" placeholder="Номинал, ₽" value={form.amount} onChange={(e) => updateForm('amount', e.target.value)} />
                <input type="text" placeholder="URL фото" value={form.image_url} onChange={(e) => updateForm('image_url', e.target.value)} className="admin-form-wide" />
                <textarea placeholder="Описание" value={form.description} onChange={(e) => updateForm('description', e.target.value)} className="admin-form-wide" rows={2} />
                <button type="submit" className="btn-primary admin-form-wide" disabled={loading || !form.code.trim() || !form.title.trim()}>
                    Создать сертификат
                </button>
            </form>

            <div className="admin-table">
                <div className="admin-table-head admin-table-head-cert">
                    <div>Код</div>
                    <div>Название</div>
                    <div>Номинал</div>
                    <div>Статус</div>
                    <div>Действия</div>
                </div>

                {items.map(it => (
                    <div key={it.certificate_id} className="admin-table-row admin-table-row-cert">
                        {editingId === it.certificate_id ? (
                            <>
                                <input value={editData.code} onChange={(e) => setEditData({ ...editData, code: e.target.value.toUpperCase() })} />
                                <input value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
                                <input type="number" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} />
                                <label className="admin-switch">
                                    <input type="checkbox" checked={editData.is_active} onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })} />
                                    <span>{editData.is_active ? 'Активен' : 'Выключен'}</span>
                                </label>
                                <div className="admin-row-actions">
                                    <button className="btn-save" onClick={() => handleUpdate(it.certificate_id)}>Сохранить</button>
                                    <button className="btn-cancel" onClick={cancelEdit}>Отмена</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="admin-cell-strong">{it.code}</div>
                                <div>{it.title}</div>
                                <div className="admin-cell-muted">{it.amount ? `${it.amount} ₽` : '—'}</div>
                                <div>
                                    <span className={it.is_active ? 'status-pill status-active' : 'status-pill status-inactive'}>
                                        {it.is_active ? 'Активен' : 'Выключен'}
                                    </span>
                                </div>
                                <div className="admin-row-actions">
                                    <button className="btn-edit" onClick={() => startEdit(it)}>Изменить</button>
                                    <button className="btn-delete" onClick={() => handleDelete(it.certificate_id)}>Удалить</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
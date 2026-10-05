import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setCategories(await api.categories());
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    function showMessage(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }

    async function handleCreate(e) {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            setLoading(true);
            await api.addCategory({ category_name: newName.trim(), description: newDesc.trim() });
            setNewName('');
            setNewDesc('');
            showMessage('success', 'Категория добавлена');
            load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    function startEdit(c) {
        setEditingId(c.category_id);
        setEditName(c.category_name);
        setEditDesc(c.description || '');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditName('');
        setEditDesc('');
    }

    async function handleUpdate(id) {
        if (!editName.trim()) return;
        try {
            setLoading(true);
            await api.updateCategory(id, {
                category_name: editName.trim(),
                description: editDesc.trim(),
            });
            setEditingId(null);
            showMessage('success', 'Категория обновлена');
            load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('Удалить категорию?')) return;
        try {
            await api.deleteCategory(id);
            showMessage('success', 'Категория удалена');
            load();
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    return (
        <section className="admin-section">
            <div className="admin-section-header">
                <h2>Категории товаров</h2>
                <p className="admin-section-hint">Названия категорий должны быть уникальны</p>
            </div>

            {message.text && <div className={`admin-message ${message.type}`}>{message.text}</div>}

            <form onSubmit={handleCreate} className="admin-form-row">
                <input
                    type="text"
                    placeholder="Название новой категории"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    disabled={loading}
                />
                <input
                    type="text"
                    placeholder="Описание (необязательно)"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    disabled={loading}
                />
                <button type="submit" className="btn-primary" disabled={loading || !newName.trim()}>
                    Добавить
                </button>
            </form>

            <div className="admin-table">
                <div className="admin-table-head">
                    <div>Название</div>
                    <div>Описание</div>
                    <div>Действия</div>
                </div>

                {categories.map(cat => (
                    <div key={cat.category_id} className="admin-table-row">
                        {editingId === cat.category_id ? (
                            <>
                                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                                <div className="admin-row-actions">
                                    <button className="btn-save" onClick={() => handleUpdate(cat.category_id)}>Сохранить</button>
                                    <button className="btn-cancel" onClick={cancelEdit}>Отмена</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="admin-cell-strong">{cat.category_name}</div>
                                <div className="admin-cell-muted">{cat.description || '—'}</div>
                                <div className="admin-row-actions">
                                    <button className="btn-edit" onClick={() => startEdit(cat)}>Изменить</button>
                                    <button className="btn-delete" onClick={() => handleDelete(cat.category_id)}>Удалить</button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
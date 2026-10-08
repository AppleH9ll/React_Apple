import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminCategories() {
    const [categories, setCategories] = useState([]);
    const [services, setServices] = useState([]);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [editingSlug, setEditingSlug] = useState(null);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const [cats, svcs] = await Promise.all([
                api.categories(),
                api.services(),
            ]);
            setCategories(cats);
            setServices(svcs);
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    function showMessage(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }

    function countServices(slug) {
        return services.filter(s => s.category_slug === slug).length;
    }

    async function handleCreate(e) {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            setLoading(true);
            await api.addCategory({
                category_name: newName.trim(),
                description: newDesc.trim(),
            });
            setNewName('');
            setNewDesc('');
            showMessage('success', 'Категория добавлена');
            await load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    function startEdit(c) {
        setEditingSlug(c.slug);
        setEditName(c.category_name);
        setEditDesc(c.description || '');
    }

    function cancelEdit() {
        setEditingSlug(null);
        setEditName('');
        setEditDesc('');
    }

    async function handleUpdate(slug) {
        if (!editName.trim()) return;
        try {
            setLoading(true);
            await api.updateCategory(slug, {
                category_name: editName.trim(),
                description: editDesc.trim(),
            });
            setEditingSlug(null);
            showMessage('success', 'Категория обновлена');
            await load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(category) {
        const count = countServices(category.slug);

        if (count === 0) {
            if (!confirm(`Удалить категорию "${category.category_name}"?`)) return;
            try {
                setLoading(true);
                await api.deleteCategory(category.slug, false);
                showMessage('success', 'Категория удалена');
                await load();
            } catch (err) {
                showMessage('error', err.message);
            } finally {
                setLoading(false);
            }
            return;
        }

        const confirmed = confirm(
            `В категории "${category.category_name}" ${count} товар(ов).\n\n` +
            `ВНИМАНИЕ: все они будут удалены вместе с категорией.\n` +
            `Продолжить каскадное удаление?`
        );
        if (!confirmed) return;

        try {
            setLoading(true);
            const result = await api.deleteCategory(category.slug, true);
            showMessage(
                'success',
                result.message || `Категория удалена. Товаров удалено: ${count}`
            );
            await load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="admin-section">
            <div className="admin-section-header">
                <h2>Категории товаров</h2>
                <p className="admin-section-hint">
                    Названия категорий должны быть уникальны.
                    При удалении категории с товарами — они удаляются каскадно.
                </p>
            </div>

            {message.text && (
                <div className={`admin-message ${message.type}`}>{message.text}</div>
            )}

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
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading || !newName.trim()}
                >
                    Добавить
                </button>
            </form>

            <div className="admin-table">
                <div className="admin-table-head admin-table-head-categories">
                    <div>Название</div>
                    <div>Описание</div>
                    <div>Товаров</div>
                    <div>Действия</div>
                </div>

                {categories.map(cat => {
                    const count = countServices(cat.slug);
                    const isEditing = editingSlug === cat.slug;

                    return (
                        <div
                            key={cat.slug}
                            className="admin-table-row admin-table-row-categories"
                        >
                            {isEditing ? (
                                <>
                                    <input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                    />
                                    <input
                                        value={editDesc}
                                        onChange={(e) => setEditDesc(e.target.value)}
                                    />
                                    <div className="admin-cell-muted">{count}</div>
                                    <div className="admin-row-actions">
                                        <button
                                            className="btn-save"
                                            onClick={() => handleUpdate(cat.slug)}
                                            disabled={loading}
                                        >
                                            Сохранить
                                        </button>
                                        <button className="btn-cancel" onClick={cancelEdit}>
                                            Отмена
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="admin-cell-strong">
                                        {cat.category_name}
                                    </div>
                                    <div className="admin-cell-muted">
                                        {cat.description || '—'}
                                    </div>
                                    <div>
                                        <span className={count > 0 ? 'admin-cell-badge' : 'admin-cell-muted'}>
                                            {count}
                                        </span>
                                    </div>
                                    <div className="admin-row-actions">
                                        <button
                                            className="btn-edit"
                                            onClick={() => startEdit(cat)}
                                            disabled={loading}
                                        >
                                            Изменить
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDelete(cat)}
                                            disabled={loading}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
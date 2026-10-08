import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminCoupons() {
    const [coupons, setCoupons] = useState([]);
    const [newCode, setNewCode] = useState('');
    const [newPercent, setNewPercent] = useState('');
    const [newLimit, setNewLimit] = useState('');
    const [editingCode, setEditingCode] = useState(null);
    const [editData, setEditData] = useState({});
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setCoupons(await api.coupons());
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
        const percent = parseInt(newPercent, 10);
        if (!newCode.trim()) return;
        if (!percent || percent < 1 || percent > 99) {
            showMessage('error', 'Скидка от 1 до 99%');
            return;
        }
        try {
            setLoading(true);
            await api.addCoupon({
                code: newCode.trim(),
                discount_percent: percent,
                usage_limit: newLimit ? parseInt(newLimit, 10) : null,
            });
            setNewCode('');
            setNewPercent('');
            setNewLimit('');
            showMessage('success', 'Купон создан');
            load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    function startEdit(c) {
        setEditingCode(c.code);
        setEditData({
            code: c.code,
            discount_percent: c.discount_percent,
            usage_limit: c.usage_limit || '',
            is_active: c.is_active,
        });
    }

    function cancelEdit() {
        setEditingCode(null);
        setEditData({});
    }

    async function handleUpdate(originalCode) {
        const percent = parseInt(editData.discount_percent, 10);
        if (!percent || percent < 1 || percent > 99) {
            showMessage('error', 'Скидка от 1 до 99%');
            return;
        }
        try {
            setLoading(true);
            await api.updateCoupon(originalCode, {
                code: editData.code,
                discount_percent: percent,
                usage_limit: editData.usage_limit ? parseInt(editData.usage_limit, 10) : null,
                is_active: editData.is_active,
            });
            setEditingCode(null);
            showMessage('success', 'Купон обновлён');
            load();
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleDelete(code) {
        if (!confirm('Удалить купон?')) return;
        try {
            await api.deleteCoupon(code);
            showMessage('success', 'Купон удалён');
            load();
        } catch (err) {
            showMessage('error', err.message);
        }
    }

    return (
        <section className="admin-section">
            <div className="admin-section-header">
                <h2>Купоны на скидку</h2>
                <p className="admin-section-hint">Максимальная скидка — 99%</p>
            </div>

            {message.text && (
                <div className={`admin-message ${message.type}`}>{message.text}</div>
            )}

            <form onSubmit={handleCreate} className="admin-form-row">
                <input
                    type="text"
                    placeholder="Код (например, VIP20)"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                />
                <input
                    type="number"
                    placeholder="Скидка, % (1–99)"
                    value={newPercent}
                    onChange={(e) => setNewPercent(e.target.value)}
                    min="1"
                    max="99"
                />
                <input
                    type="number"
                    placeholder="Лимит (необязательно)"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    min="1"
                />
                <button
                    className="btn-primary"
                    disabled={loading || !newCode.trim() || !newPercent}
                >
                    Создать
                </button>
            </form>

            <div className="admin-table">
                <div className="admin-table-head admin-table-head-coupons">
                    <div>Код</div>
                    <div>Скидка</div>
                    <div>Использовано</div>
                    <div>Лимит</div>
                    <div>Статус</div>
                    <div>Действия</div>
                </div>

                {coupons.map(c => (
                    <div key={c.code} className="admin-table-row admin-table-row-coupons">
                        {editingCode === c.code ? (
                            <>
                                <input
                                    value={editData.code}
                                    onChange={(e) =>
                                        setEditData({ ...editData, code: e.target.value.toUpperCase() })
                                    }
                                />
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={editData.discount_percent}
                                    onChange={(e) =>
                                        setEditData({ ...editData, discount_percent: e.target.value })
                                    }
                                />
                                <div className="admin-cell-muted">{c.used_count}</div>
                                <input
                                    type="number"
                                    min="1"
                                    placeholder="без лимита"
                                    value={editData.usage_limit}
                                    onChange={(e) =>
                                        setEditData({ ...editData, usage_limit: e.target.value })
                                    }
                                />
                                <label className="admin-switch">
                                    <input
                                        type="checkbox"
                                        checked={editData.is_active}
                                        onChange={(e) =>
                                            setEditData({ ...editData, is_active: e.target.checked })
                                        }
                                    />
                                    <span>{editData.is_active ? 'Активен' : 'Выключен'}</span>
                                </label>
                                <div className="admin-row-actions">
                                    <button
                                        className="btn-save"
                                        onClick={() => handleUpdate(c.code)}
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
                                <div className="admin-cell-strong">{c.code}</div>
                                <div className="admin-cell-badge">−{c.discount_percent}%</div>
                                <div className="admin-cell-muted">{c.used_count}</div>
                                <div className="admin-cell-muted">{c.usage_limit || '∞'}</div>
                                <div>
                                    <span className={c.is_active ? 'status-pill status-active' : 'status-pill status-inactive'}>
                                        {c.is_active ? 'Активен' : 'Выключен'}
                                    </span>
                                </div>
                                <div className="admin-row-actions">
                                    <button className="btn-edit" onClick={() => startEdit(c)}>
                                        Изменить
                                    </button>
                                    <button className="btn-delete" onClick={() => handleDelete(c.code)}>
                                        Удалить
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
}
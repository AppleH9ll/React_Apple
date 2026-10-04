import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setUsers(await api.users());
        } catch (err) {
            setError(err.message);
        }
    }

    async function changeDiscount(u) {
        const value = prompt('Скидка в % (0–99):', u.discount_percent || 0);
        if (value === null) return;
        const percent = Number(value);
        if (Number.isNaN(percent) || percent < 0 || percent > 99) {
            setError('Скидка должна быть от 0 до 99%');
            return;
        }
        try {
            await api.updateUser(u.user_id, { discount_percent: percent });
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <section className="admin-section">
            <h1>Пользователи</h1>
            {error && <div className="admin-message error">{error}</div>}
            <div className="admin-table">
                {users.map(u => (
                    <div className="admin-table-row admin-table-row-user" key={u.user_id}>
                        <span className="admin-cell-strong">{u.first_name || 'Без имени'} {u.last_name || ''}</span>
                        <span className="admin-cell-muted">{u.email}</span>
                        <span>{u.role_name}</span>
                        <span>Скидка: {u.discount_percent}%</span>
                        <div className="admin-row-actions">
                            <button className="btn-edit" onClick={() => changeDiscount(u)}>Изменить скидку</button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
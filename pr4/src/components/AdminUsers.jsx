import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setLoading(true);
            setError('');
            const [usersData, rolesData] = await Promise.all([
                api.adminUsers(),
                api.roles(),
            ]);
            setUsers(usersData);
            setRoles(rolesData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function showMsg(text, isError = false) {
        if (isError) { setError(text); setMessage(''); }
        else { setMessage(text); setError(''); }
        setTimeout(() => { setMessage(''); setError(''); }, 4000);
    }

    async function changeDiscount(u) {
        const value = prompt('Скидка в % (0–99):', u.discount_percent || 0);
        if (value === null) return;
        const percent = Number(value);
        if (Number.isNaN(percent) || percent < 0 || percent > 99) {
            showMsg('Скидка должна быть от 0 до 99%', true);
            return;
        }
        try {
            await api.adminUpdateDiscount(u.email, percent);
            await load();
            showMsg('Скидка обновлена');
        } catch (err) {
            showMsg(err.message, true);
        }
    }

    async function changeRole(u) {
        if (u.role_name === 'admin') {
            showMsg('Роль администратора меняется только через БД', true);
            return;
        }

        const available = roles.filter(r => r.role_name !== 'admin' && r.role_name !== u.role_name);
        if (!available.length) {
            showMsg('Нет доступных ролей для смены', true);
            return;
        }

        const options = available.map(r => `${r.role_name} — ${r.description || ''}`).join('\n');
        const input = prompt(
            `Смена роли для ${u.email}\nТекущая: ${u.role_name}\n\nВведите новую роль:\n${options}`
        );
        if (!input) return;

        const roleName = input.trim().toLowerCase();
        if (!available.some(r => r.role_name === roleName)) {
            showMsg('Неверное имя роли', true);
            return;
        }

        try {
            await api.adminUpdateRole(u.email, roleName);
            await load();
            showMsg('Роль обновлена');
        } catch (err) {
            showMsg(err.message, true);
        }
    }

    async function removeUser(u) {
        if (u.role_name === 'admin') {
            showMsg('Администраторов можно удалять только через БД', true);
            return;
        }
        if (!confirm(
            `Удалить пользователя ${u.email}?\n\n` +
            `Все его заказы, корзина и отзывы будут удалены безвозвратно!`
        )) return;

        try {
            await api.adminDeleteUser(u.email);
            await load();
            showMsg('Пользователь удалён вместе со всеми связанными данными');
        } catch (err) {
            showMsg(err.message, true);
        }
    }

    function roleLabel(roleName) {
        if (roleName === 'admin') return 'Админ';
        if (roleName === 'employee') return 'Сотрудник';
        if (roleName === 'user') return 'Пользователь';
        return roleName;
    }

    return (
        <section className="admin-section">
            <div className="admin-section-header">
                <h1>Пользователи</h1>
            </div>

            {error && <div className="admin-message error">{error}</div>}
            {message && !error && <div className="admin-message success">{message}</div>}

            {loading && <div className="state">Загрузка...</div>}

            {!loading && (
                <div className="admin-table">
                    <div className="admin-table-head admin-table-head-users">
                        <div>Имя</div>
                        <div>Email</div>
                        <div>Роль</div>
                        <div>Скидка</div>
                        <div>Действия</div>
                    </div>

                    {users.map(u => (
                        <div className="admin-table-row admin-table-row-users" key={u.email}>
                            <span className="admin-cell-strong">
                                {u.first_name || 'Без имени'} {u.last_name || ''}
                            </span>
                            <span className="admin-cell-muted">{u.email}</span>
                            <span>
                                <span className={`role-badge role-${u.role_name}`}>
                                    {roleLabel(u.role_name)}
                                </span>
                            </span>
                            <span>Скидка: {u.discount_percent}%</span>
                            <div className="admin-row-actions">
                                <button className="btn-edit" onClick={() => changeDiscount(u)}>
                                    Скидка
                                </button>
                                {u.role_name !== 'admin' && (
                                    <>
                                        <button className="btn-edit" onClick={() => changeRole(u)}>
                                            Роль
                                        </button>
                                        <button className="btn-delete" onClick={() => removeUser(u)}>
                                            Удалить
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
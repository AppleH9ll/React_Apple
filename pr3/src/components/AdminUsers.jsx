import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Форма создания
    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        phone: '',
        role_id: '',
    });

    useEffect(() => {
        load();
    }, []);

    async function load() {
        try {
            setLoading(true);
            setError('');

            const [usersData, rolesData] = await Promise.all([
                api.users(),
                api.roles(),
            ]);
            setUsers(usersData);
            setRoles(rolesData);

            // По умолчанию для создания — первая НЕ админская роль
            const defaultRole = rolesData.find(r => r.role_name !== 'admin');
            if (defaultRole && !newUser.role_id) {
                setNewUser(prev => ({ ...prev, role_id: defaultRole.role_id }));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function showMsg(text, isError = false) {
        if (isError) {
            setError(text);
            setMessage('');
        } else {
            setMessage(text);
            setError('');
        }
        setTimeout(() => {
            setMessage('');
            setError('');
        }, 4000);
    }

    // Роли, доступные для назначения (все, кроме admin)
    const assignableRoles = roles.filter(r => r.role_name !== 'admin');

    async function changeDiscount(u) {
        const value = prompt('Скидка в % (0–99):', u.discount_percent || 0);
        if (value === null) return;

        const percent = Number(value);
        if (Number.isNaN(percent) || percent < 0 || percent > 99) {
            showMsg('Скидка должна быть от 0 до 99%', true);
            return;
        }
        try {
            await api.updateUser(u.user_id, { discount_percent: percent });
            await load();
            showMsg('Скидка обновлена');
        } catch (err) {
            showMsg(err.message, true);
        }
    }

    async function changeRole(u) {
        // Админов менять нельзя
        if (u.role_name === 'admin') {
            showMsg('Роль администратора меняется только через БД', true);
            return;
        }

        // Список доступных ролей, кроме текущей и кроме админа
        const available = assignableRoles.filter(r => r.role_id !== u.role_id);

        if (available.length === 0) {
            showMsg('Нет доступных ролей для смены', true);
            return;
        }

        // Формируем подсказку для пользователя
        const options = available
            .map(r => `${r.role_id} — ${r.role_name}`)
            .join('\n');

        const input = prompt(
            `Смена роли для ${u.email}\nТекущая роль: ${u.role_name}\n\nВведите ID новой роли:\n${options}`
        );
        if (input === null) return;

        const newRoleId = Number(input);
        if (!newRoleId || !available.some(r => r.role_id === newRoleId)) {
            showMsg('Неверный ID роли', true);
            return;
        }

        try {
            await api.updateUserRole(u.user_id, newRoleId);
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
            `ВНИМАНИЕ: все его заказы, корзина и записи будут удалены безвозвратно!`
        )) return;

        try {
            await api.deleteUser(u.user_id);
            await load();
            showMsg('Пользователь удалён вместе со всеми связанными данными');
        } catch (err) {
            showMsg(err.message, true);
        }
    }

    async function handleCreate(e) {
        e.preventDefault();

        if (!newUser.role_id) {
            showMsg('Выберите роль', true);
            return;
        }

        try {
            await api.createUser({
                ...newUser,
                role_id: Number(newUser.role_id),
            });
            setNewUser({
                email: '',
                password: '',
                first_name: '',
                last_name: '',
                phone: '',
                role_id: assignableRoles[0]?.role_id || '',
            });
            setShowCreate(false);
            await load();
            showMsg('Пользователь создан');
        } catch (err) {
            showMsg(err.message, true);
        }
    }

    // Отображаемое имя роли
    function roleLabel(roleName) {
        if (roleName === 'admin') return 'Админ';
        if (roleName === 'employee') return 'Сотрудник';
        if (roleName === 'user') return 'Пользователь';
        return roleName;
    }

    return (
        <section className="admin-section">
            <div
                className="admin-section-header"
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
                <h1>Пользователи</h1>
                <button
                    className="btn-primary"
                    onClick={() => setShowCreate(!showCreate)}
                    disabled={loading}
                >
                    {showCreate ? 'Отмена' : '+ Создать пользователя'}
                </button>
            </div>

            {error && <div className="admin-message error">{error}</div>}
            {message && !error && <div className="admin-message success">{message}</div>}

            {showCreate && (
                <form onSubmit={handleCreate} className="admin-form-grid">
                    <input
                        type="email"
                        placeholder="Email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Пароль (мин. 6)"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        required
                    />
                    <input
                        type="text"
                        placeholder="Имя"
                        value={newUser.first_name}
                        onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                    />
                    <input
                        type="text"
                        placeholder="Фамилия"
                        value={newUser.last_name}
                        onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                    />
                    <input
                        type="tel"
                        placeholder="Телефон"
                        value={newUser.phone}
                        onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    />
                    <select
                        value={newUser.role_id}
                        onChange={(e) => setNewUser({ ...newUser, role_id: e.target.value })}
                        required
                    >
                        <option value="">Выберите роль</option>
                        {assignableRoles.map(r => (
                            <option key={r.role_id} value={r.role_id}>
                                {roleLabel(r.role_name)}
                            </option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="btn-primary admin-form-wide"
                        disabled={loading}
                    >
                        Создать
                    </button>
                </form>
            )}

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
                        <div className="admin-table-row admin-table-row-users" key={u.user_id}>
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
                                <button
                                    className="btn-edit"
                                    onClick={() => changeDiscount(u)}
                                    disabled={loading}
                                >
                                    Скидка
                                </button>
                                {u.role_name !== 'admin' && (
                                    <>
                                        <button
                                            className="btn-edit"
                                            onClick={() => changeRole(u)}
                                            disabled={loading}
                                        >
                                            Роль
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => removeUser(u)}
                                            disabled={loading}
                                        >
                                            Удалить
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}

                    {users.length === 0 && (
                        <div className="admin-search-empty">
                            <h3>Пользователей нет</h3>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
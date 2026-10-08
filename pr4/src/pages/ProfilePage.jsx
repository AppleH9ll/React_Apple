import { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
    const { user, update } = useAuth();

    const [orders, setOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [ordersError, setOrdersError] = useState('');
    const [tab, setTab] = useState('orders');

    const [email, setEmail] = useState(user.email || '');
    const [firstName, setFirstName] = useState(user.first_name || '');
    const [lastName, setLastName] = useState(user.last_name || '');
    const [address, setAddress] = useState(user.address || '');
    const [phone, setPhone] = useState(user.phone || '');

    const [password, setPassword] = useState('');
    const [passwordRepeat, setPasswordRepeat] = useState('');

    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        setEmail(user.email || '');
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setAddress(user.address || '');
        setPhone(user.phone || '');
    }, [user]);

    useEffect(() => {
        loadOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadOrders() {
        try {
            setLoadingOrders(true);
            setOrdersError('');
            const data = await api.myOrders();
            setOrders(data);
        } catch (err) {
            setOrdersError(err.message);
        } finally {
            setLoadingOrders(false);
        }
    }

    function showMessage(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }

    async function handleSaveProfile(e) {
        e.preventDefault();
        if (!email.trim()) {
            showMessage('error', 'Email не может быть пустым');
            return;
        }
        try {
            setSaving(true);
            const updated = await api.updateProfile({
                email: email.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                address: address.trim(),
                phone: phone.trim(),
            });
            update(updated);
            showMessage('success', 'Профиль сохранён');
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        if (password.length < 6) {
            showMessage('error', 'Пароль должен быть от 6 символов');
            return;
        }
        if (password !== passwordRepeat) {
            showMessage('error', 'Пароли не совпадают');
            return;
        }
        try {
            setSaving(true);
            await api.updateProfile({ password });
            setPassword('');
            setPasswordRepeat('');
            showMessage('success', 'Пароль изменён');
        } catch (err) {
            showMessage('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    const userDiscount = Number(user?.discount_percent) || 0;

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar">
                    {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                </div>
                <div className="profile-header-info">
                    <h1>
                        {user.first_name || user.last_name
                            ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                            : user.email}
                    </h1>
                    <p className="profile-email">{user.email}</p>
                    {user.address && <p className="profile-address">{user.address}</p>}
                    {userDiscount > 0 && (
                        <p className="profile-discount">
                            Персональная скидка: <b>{userDiscount}%</b>
                        </p>
                    )}
                </div>
            </div>

            <div className="profile-tabs">
                <button
                    className={tab === 'orders' ? 'active' : ''}
                    onClick={() => setTab('orders')}
                >
                    Мои заказы ({orders.length})
                </button>
                <button
                    className={tab === 'settings' ? 'active' : ''}
                    onClick={() => setTab('settings')}
                >
                    Настройки профиля
                </button>
            </div>

            {message.text && (
                <div className={`profile-message ${message.type}`}>{message.text}</div>
            )}

            {tab === 'orders' && (
                <OrdersTab
                    orders={orders}
                    loading={loadingOrders}
                    error={ordersError}
                    onRetry={loadOrders}
                />
            )}

            {tab === 'settings' && (
                <div className="profile-settings">
                    <form onSubmit={handleSaveProfile} className="profile-card">
                        <h3>Личные данные</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Email (логин)</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-row two-cols">
                            <div className="form-group">
                                <label>Имя</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>Фамилия</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Телефон</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Адрес по умолчанию</label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Сохранение...' : 'Сохранить изменения'}
                        </button>
                    </form>

                    <form onSubmit={handleChangePassword} className="profile-card">
                        <h3>Смена пароля</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Новый пароль</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Минимум 6 символов"
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Повторите пароль</label>
                                <input
                                    type="password"
                                    value={passwordRepeat}
                                    onChange={(e) => setPasswordRepeat(e.target.value)}
                                    placeholder="Повторите пароль"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={saving || !password || !passwordRepeat}
                        >
                            {saving ? 'Сохранение...' : 'Изменить пароль'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

function OrdersTab({ orders, loading, error, onRetry }) {
    const [expanded, setExpanded] = useState(null);

    if (loading) {
        return <div className="profile-card">Загрузка заказов...</div>;
    }

    if (error) {
        return (
            <div className="profile-card">
                <div className="profile-message error">Ошибка загрузки: {error}</div>
                <button className="btn-primary" onClick={onRetry}>Попробовать снова</button>
            </div>
        );
    }

    if (orders.length === 0) {
        return <div className="profile-card empty-state">У вас пока нет заказов</div>;
    }

    return (
        <div className="orders-list">
            {orders.map((order, idx) => {
                const isOpen = expanded === idx;
                const totalItems = order.items.reduce((s, i) => s + i.quantity, 0);
                const totalOriginal = order.items.reduce(
                    (s, i) => s + parseFloat(i.price) * i.quantity, 0
                );
                const totalFinal = parseFloat(order.final_amount);

                return (
                    <div key={idx} className="order-card">
                        <div
                            className="order-header"
                            onClick={() => setExpanded(isOpen ? null : idx)}
                        >
                            <div className="order-header-left">
                                <span className="order-number">
                                    Заказ от {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                </span>
                                {order.delivery_date && (
                                    <span className="order-date">
                                        Доставка: {new Date(order.delivery_date).toLocaleDateString('ru-RU')}
                                    </span>
                                )}
                            </div>

                            <div className="order-header-center">
                                <span className="order-items-count">{totalItems} поз.</span>
                                <span className={`order-status status-${order.status}`}>
                                    {order.status}
                                </span>
                            </div>

                            <div className="order-header-right">
                                {parseFloat(order.discount_amount) > 0 && (
                                    <span className="order-old-sum">
                                        {totalOriginal.toFixed(0)} ₽
                                    </span>
                                )}
                                <span className="order-final-sum">
                                    {totalFinal.toFixed(0)} ₽
                                </span>
                                <span className={`order-chevron ${isOpen ? 'open' : ''}`}>▾</span>
                            </div>
                        </div>

                        {isOpen && (
                            <div className="order-details">
                                <div className="order-items-list">
                                    {order.items.map((it, i) => (
                                        <div key={i} className="order-item-row">
                                            <div className="order-item-name">{it.service_name}</div>
                                            <div className="order-item-qty">{it.quantity} шт.</div>
                                            <div className="order-item-price">
                                                {(parseFloat(it.price) * it.quantity).toFixed(0)} ₽
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="order-summary-block">
                                    <div className="order-summary-row">
                                        <span>Сумма:</span>
                                        <span>{totalOriginal.toFixed(0)} ₽</span>
                                    </div>
                                    {parseFloat(order.discount_amount) > 0 && (
                                        <div className="order-summary-row discount">
                                            <span>
                                                Скидка {order.coupon_code && `(${order.coupon_code})`}:
                                            </span>
                                            <span>
                                                −{parseFloat(order.discount_amount).toFixed(0)} ₽
                                            </span>
                                        </div>
                                    )}
                                    <div className="order-summary-row total">
                                        <span>Итого:</span>
                                        <span>{totalFinal.toFixed(0)} ₽</span>
                                    </div>
                                </div>

                                {order.address && (
                                    <div className="order-address">
                                        <strong>Адрес:</strong> {order.address}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
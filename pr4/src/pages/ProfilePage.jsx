import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { statusLabel, statusClass } from '../utils/statusLabels';

export default function ProfilePage() {
    const { user, update } = useAuth();

    if (user?.role_name === 'admin' || user?.role_name === 'employee') {
        return <Navigate to="/" replace />;
    }

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
        if (!email.trim()) { showMessage('error', 'Email не может быть пустым'); return; }

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
        if (password.length < 6) { showMessage('error', 'Пароль должен быть от 6 символов'); return; }
        if (password !== passwordRepeat) { showMessage('error', 'Пароли не совпадают'); return; }

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

    return (
        <div className="profile-page">
            <div className="profile-header">
                <div className="profile-avatar">
                    {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                </div>
                <div className="profile-header-info">
                    <h1>{user.first_name || ''} {user.last_name || ''}</h1>
                    <p className="profile-email">{user.email}</p>
                    {user.address && <p className="profile-address">{user.address}</p>}
                </div>
            </div>

            <div className="profile-tabs">
                <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
                    Мои заказы ({orders.length})
                </button>
                <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
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
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-row two-cols">
                            <div className="form-group">
                                <label>Имя</label>
                                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Фамилия</label>
                                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Телефон</label>
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Адрес по умолчанию</label>
                                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
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
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Минимум 6 символов" />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Повторите пароль</label>
                                <input type="password" value={passwordRepeat} onChange={(e) => setPasswordRepeat(e.target.value)} />
                            </div>
                        </div>

                        <button type="submit" className="btn-primary" disabled={saving || !password || !passwordRepeat}>
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
    const [payOrder, setPayOrder] = useState(null);

    if (loading) return <div className="profile-card">Загрузка заказов...</div>;

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
        <>
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
                                        Заказ №{order.user_order_number}
                                    </span>
                                    <span className="order-date">
                                        {new Date(order.created_at).toLocaleDateString('ru-RU')}
                                    </span>
                                </div>

                                <div className="order-header-center">
                                    <span className="order-items-count">{totalItems} поз.</span>
                                    <span className={`order-status status-${statusClass(order.status)}`}>
                                        {statusLabel(order.status)}
                                    </span>
                                </div>

                                <div className="order-header-right">
                                    <span className="order-final-sum">{totalFinal.toFixed(0)} ₽</span>
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

                                    {order.status === 'pending' && (
                                        <button
                                            className="btn-pay-confirm"
                                            style={{
                                                marginTop: '14px',
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '8px',
                                                fontSize: '14px',
                                                fontWeight: '600',
                                                border: 'none',
                                                cursor: 'pointer',
                                                background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                                                color: 'white',
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPayOrder({
                                                    id: order.order_id,
                                                    number: order.user_order_number,
                                                    amount: totalFinal,
                                                });
                                            }}
                                        >
                                            💳 Оплатить {totalFinal.toFixed(0)} ₽
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {payOrder && (
                <PaymentModal
                    order={payOrder}
                    onClose={() => setPayOrder(null)}
                    onSuccess={async () => {
                        setPayOrder(null);
                        await onRetry();
                    }}
                />
            )}
        </>
    );
}

function PaymentModal({ order, onClose, onSuccess }) {
    const [card, setCard] = useState({
        card_number: '',
        card_holder: '',
        expiry: '',
        cvv: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const setField = (k, v) => setCard(prev => ({ ...prev, [k]: v }));

    function handleCardNumber(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 16) v = v.slice(0, 16);
        const formatted = v.replace(/(.{4})/g, '$1 ').trim();
        setField('card_number', formatted);
    }

    function handleExpiry(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 4) v = v.slice(0, 4);
        if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
        setField('expiry', v);
    }

    function handleCvv(e) {
        const v = e.target.value.replace(/\D/g, '').slice(0, 3);
        setField('cvv', v);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.payOrder(order.id, {
                card_number: card.card_number.replace(/\s/g, ''),
                card_holder: card.card_holder,
                expiry: card.expiry,
                cvv: card.cvv,
            });
            onSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const previewNumber = card.card_number.padEnd(19, '•').slice(0, 19);
    const previewHolder = card.card_holder || 'CARDHOLDER NAME';
    const previewExpiry = card.expiry || 'MM/YY';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>Оплата заказа №{order.number}</h2>
                <p className="modal-subtitle">
                    К оплате: <strong>{order.amount.toFixed(0)} ₽</strong>
                </p>

                <div className="pay-card-preview">
                    <div className="pay-card-chip"></div>
                    <div className="pay-card-number">{previewNumber}</div>
                    <div className="pay-card-meta">
                        <div>
                            Держатель
                            <span>{previewHolder}</span>
                        </div>
                        <div>
                            Срок
                            <span>{previewExpiry}</span>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <label className="modal-label">Номер карты</label>
                    <input
                        className="modal-input"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={card.card_number}
                        onChange={handleCardNumber}
                        autoFocus
                    />

                    <label className="modal-label">Имя держателя</label>
                    <input
                        className="modal-input"
                        type="text"
                        placeholder="IVAN IVANOV"
                        value={card.card_holder}
                        onChange={(e) => setField('card_holder', e.target.value.toUpperCase())}
                        style={{ fontFamily: 'inherit', letterSpacing: 'normal' }}
                    />

                    <div className="modal-row">
                        <div>
                            <label className="modal-label">Срок действия</label>
                            <input
                                className="modal-input"
                                type="text"
                                placeholder="ММ/ГГ"
                                value={card.expiry}
                                onChange={handleExpiry}
                            />
                        </div>
                        <div>
                            <label className="modal-label">CVV</label>
                            <input
                                className="modal-input"
                                type="password"
                                placeholder="•••"
                                value={card.cvv}
                                onChange={handleCvv}
                                maxLength={3}
                            />
                        </div>
                    </div>

                    {error && <div className="modal-error">{error}</div>}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn-pay-cancel"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className="btn-pay-confirm"
                            disabled={loading || !card.card_number || !card.card_holder || !card.expiry || !card.cvv}
                        >
                            {loading ? 'Обработка...' : 'Оплатить'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getServiceImage } from '../utils/serviceImages';

export default function CartPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { cart, updateQty, remove } = useCart();

    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);
    const [couponError, setCouponError] = useState('');
    const [couponApplied, setCouponApplied] = useState(false);
    const [address, setAddress] = useState(user?.address || '');
    const [useAnotherAddress, setUseAnotherAddress] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [order, setOrder] = useState(null);

    if (cart.length === 0 && !order) {
        return (
            <div className="cart-page">
                <div className="empty-state">
                    <h2>Корзина пуста</h2>
                    <Link to="/" className="btn-primary">Перейти к каталогу</Link>
                </div>
            </div>
        );
    }

    if (order) {
        return <Receipt order={order} onBack={() => navigate('/profile')} />;
    }

    // === Расчёты ===
    const totalOriginal = cart.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);

    // Сумма со скидками на услуги
    const totalBeforeUser = cart.reduce((s, i) => {
        const p = parseFloat(i.price);
        const d = i.discount_percent || 0;
        return s + p * (1 - d / 100) * i.quantity;
    }, 0);

    const serviceDiscountAmount = totalOriginal - totalBeforeUser;

    // Персональная скидка пользователя
    const userDiscountPercent = Number(user?.discount_percent) || 0;
    const userDiscountAmount = totalBeforeUser * (userDiscountPercent / 100);
    const afterUserDiscount = totalBeforeUser - userDiscountAmount;

    // Купон применяется к остатку после персональной скидки
    const couponAmount = afterUserDiscount * (couponDiscount / 100);
    const totalAfterDiscount = afterUserDiscount - couponAmount;

    async function applyCoupon() {
        setCouponError('');
        if (!couponCode.trim()) {
            setCouponError('Введите код купона');
            return;
        }
        try {
            const data = await api.validateCoupon(couponCode);
            setCouponDiscount(data.discount_percent);
            setCouponApplied(true);
        } catch (err) {
            setCouponError(err.message);
        }
    }

    function resetCoupon() {
        setCouponApplied(false);
        setCouponDiscount(0);
        setCouponCode('');
        setCouponError('');
    }

    async function handleCheckout() {
        const finalAddress = useAnotherAddress ? address.trim() : (user?.address || '').trim();
        if (!finalAddress) {
            alert('Укажите адрес доставки');
            return;
        }
        setCheckoutLoading(true);
        try {
            const created = await api.createOrder(
                user.user_id,
                couponApplied ? couponCode : null,
                finalAddress
            );
            setOrder({
                ...created,
                items: [...cart],
                address: finalAddress,
                user_discount_percent: userDiscountPercent,
            });
        } catch (err) {
            alert(err.message);
        } finally {
            setCheckoutLoading(false);
        }
    }

    return (
        <div className="cart-page">
            <h2>Корзина ({cart.length})</h2>

            <div className="cart-page-grid">
                <div className="cart-page-items">
                    {cart.map(item => {
                        const price = parseFloat(item.price);
                        const discount = item.discount_percent || 0;
                        const finalPrice = price * (1 - discount / 100);
                        const imageSrc = getServiceImage(item);
                        return (
                            <div key={item.cart_id} className="cart-page-item">
                                <img
                                    src={imageSrc || '/placeholder.png'}
                                    alt={item.service_name}
                                    className="cart-page-item-image"
                                    onError={(e) => {
                                        e.target.src =
                                            'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Crect fill=%22%23e0e0e0%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E';
                                    }}
                                />
                                <div className="cart-page-item-info">
                                    <h3>{item.service_name}</h3>
                                    <div className="cart-page-item-details">
                                        <span>{item.duration_minutes} мин</span>
                                        {discount > 0 && <span className="discount-tag">−{discount}%</span>}
                                    </div>
                                </div>

                                <div className="cart-page-item-price">
                                    {discount > 0 ? (
                                        <>
                                            <span className="old-price-small">{(price * item.quantity).toFixed(0)} ₽</span>
                                            <span className="new-price-small">{(finalPrice * item.quantity).toFixed(0)} ₽</span>
                                        </>
                                    ) : (
                                        <span className="price-value">{(price * item.quantity).toFixed(0)} ₽</span>
                                    )}
                                </div>

                                <div className="qty-controls">
                                    <button onClick={() => updateQty(item.cart_id, item.quantity - 1)}>−</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateQty(item.cart_id, item.quantity + 1)}>+</button>
                                </div>

                                <button className="remove-btn" onClick={() => remove(item.cart_id)}>✕</button>
                            </div>
                        );
                    })}
                </div>

                <aside className="cart-page-summary">
                    <h3>Итог заказа</h3>

                    <div className="coupon-section">
                        <label>Купон на скидку:</label>
                        <div className="coupon-input-row">
                            <input
                                type="text"
                                placeholder="Введите код"
                                value={couponCode}
                                onChange={(e) => {
                                    setCouponCode(e.target.value.toUpperCase());
                                    setCouponError('');
                                    if (couponApplied) resetCoupon();
                                }}
                                disabled={couponApplied}
                            />
                            {!couponApplied ? (
                                <button onClick={applyCoupon} className="btn-apply">Применить</button>
                            ) : (
                                <button onClick={resetCoupon} className="btn-remove-coupon">Отменить</button>
                            )}
                        </div>
                        {couponError && <div className="coupon-error">{couponError}</div>}
                        {couponApplied && <div className="coupon-success">Купон применён: −{couponDiscount}%</div>}
                    </div>

                    <div className="address-section">
                        <label>Адрес доставки:</label>
                        {!useAnotherAddress ? (
                            <>
                                <div className="address-default">{user.address || '— адрес не указан —'}</div>
                                <button className="btn-link" onClick={() => setUseAnotherAddress(true)}>
                                    Указать другой адрес
                                </button>
                            </>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    placeholder="Город, улица, дом, кв."
                                />
                                <button className="btn-link" onClick={() => setUseAnotherAddress(false)}>
                                    Использовать адрес из профиля
                                </button>
                            </>
                        )}
                    </div>

                    <div className="cart-summary">
                        <div className="cart-row">
                            <span>Сумма без скидок:</span>
                            <span>{totalOriginal.toFixed(0)} ₽</span>
                        </div>
                        {serviceDiscountAmount > 0 && (
                            <div className="cart-row discount-row">
                                <span>Скидки на услуги:</span>
                                <span>−{serviceDiscountAmount.toFixed(0)} ₽</span>
                            </div>
                        )}
                        {userDiscountPercent > 0 && (
                            <>
                                <div className="cart-row">
                                    <span>Подытог:</span>
                                    <span>{totalBeforeUser.toFixed(0)} ₽</span>
                                </div>
                                <div className="cart-row discount-row">
                                    <span>Персональная скидка ({userDiscountPercent}%):</span>
                                    <span>−{userDiscountAmount.toFixed(0)} ₽</span>
                                </div>
                            </>
                        )}
                        {couponApplied && (
                            <div className="cart-row discount-row">
                                <span>Купон ({couponDiscount}%):</span>
                                <span>−{couponAmount.toFixed(0)} ₽</span>
                            </div>
                        )}
                        <div className="cart-row total-row">
                            <span>Итого к оплате:</span>
                            <span>{totalAfterDiscount.toFixed(0)} ₽</span>
                        </div>
                    </div>

                    <button className="checkout-btn" onClick={handleCheckout} disabled={checkoutLoading}>
                        {checkoutLoading ? 'Оформление...' : 'Оформить заказ'}
                    </button>
                </aside>
            </div>
        </div>
    );
}

function Receipt({ order, onBack }) {
    const totalOriginal = order.items.reduce((s, i) => s + parseFloat(i.price) * i.quantity, 0);
    const totalFinal = order.items.reduce((s, i) => {
        const p = parseFloat(i.price);
        const d = i.discount_percent || 0;
        return s + p * (1 - d / 100) * i.quantity;
    }, 0);
    const serviceDiscount = totalOriginal - totalFinal;

    const userDiscountPercent = order.user_discount_percent || 0;
    const userDiscountAmount = totalFinal * (userDiscountPercent / 100);
    const afterUser = totalFinal - userDiscountAmount;

    return (
        <div className="receipt-page">
            <div className="receipt">
                <div className="receipt-header">
                    <h2>Заказ оформлен</h2>
                    <p className="receipt-number">Заказ №{order.order_id}</p>
                    <p className="receipt-date">
                        {new Date(order.created_at || Date.now()).toLocaleString('ru-RU')}
                    </p>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-items">
                    {order.items.map((it, idx) => {
                        const p = parseFloat(it.price);
                        const d = it.discount_percent || 0;
                        const final = p * (1 - d / 100);
                        return (
                            <div key={idx} className="receipt-item">
                                <div className="receipt-item-name">{it.service_name}</div>
                                <div className="receipt-item-calc">
                                    {it.quantity} × {p.toFixed(0)} ₽
                                    {d > 0 && <span className="receipt-item-disc"> (−{d}%)</span>}
                                </div>
                                <div className="receipt-item-sum">{(final * it.quantity).toFixed(0)} ₽</div>
                            </div>
                        );
                    })}
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-summary">
                    <div className="receipt-row">
                        <span>Сумма без скидок:</span>
                        <span>{totalOriginal.toFixed(0)} ₽</span>
                    </div>
                    {serviceDiscount > 0 && (
                        <div className="receipt-row discount">
                            <span>Скидки на услуги:</span>
                            <span>−{serviceDiscount.toFixed(0)} ₽</span>
                        </div>
                    )}
                    {userDiscountPercent > 0 && (
                        <div className="receipt-row discount">
                            <span>Персональная скидка ({userDiscountPercent}%):</span>
                            <span>−{userDiscountAmount.toFixed(0)} ₽</span>
                        </div>
                    )}
                    {order.discount_amount > 0 && (
                        <div className="receipt-row discount">
                            <span>Купон {order.coupon_code}:</span>
                            <span>−{parseFloat(order.discount_amount).toFixed(0)} ₽</span>
                        </div>
                    )}
                    <div className="receipt-row total">
                        <span>ИТОГО:</span>
                        <span>{parseFloat(order.final_amount).toFixed(0)} ₽</span>
                    </div>
                </div>

                <div className="receipt-divider"></div>

                <div className="receipt-address">
                    <strong>Адрес доставки:</strong>
                    <p>{order.address || '—'}</p>
                </div>

                <div className="receipt-actions">
                    <button className="btn-primary" onClick={onBack}>К моим заказам</button>
                    <button className="btn-secondary" onClick={() => window.print()}>Распечатать</button>
                </div>
            </div>
        </div>
    );
}
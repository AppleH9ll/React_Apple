import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getServiceImage } from '../utils/serviceImages';

export default function ServicePage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { add, canShop } = useCart();

    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Отзывы
    const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [reviewSuccess, setReviewSuccess] = useState('');

    useEffect(() => {
        loadService();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    async function loadService() {
        try {
            setLoading(true);
            setError('');
            const data = await api.serviceBySlug(slug);
            setService(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd() {
        try {
            await add(service.slug);
        } catch (err) {
            alert(err.message);
        }
    }

    async function handleReviewSubmit(e) {
        e.preventDefault();
        setReviewError('');
        setReviewSuccess('');
        setSubmitting(true);
        try {
            await api.addReview(slug, reviewForm.rating, reviewForm.comment);
            setReviewSuccess('Отзыв успешно добавлен');
            setReviewForm({ rating: 5, comment: '' });
            await loadService();
        } catch (err) {
            setReviewError(err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) return <div className="state">Загрузка...</div>;
    if (error || !service) {
        return (
            <div className="empty-state">
                <h2>Товар не найден</h2>
                <Link to="/" className="btn-primary">К каталогу</Link>
            </div>
        );
    }

    const hasDiscount = service.discount_percent > 0;
    const discountedPrice = hasDiscount
        ? service.price * (1 - service.discount_percent / 100)
        : service.price;

    const imageSrc = getServiceImage(service);

    let buttonText;
    if (!canShop) {
        buttonText = user?.role_name === 'admin'
            ? 'Недоступно для админа'
            : user?.role_name === 'employee'
            ? 'Недоступно для сотрудника'
            : 'Войдите, чтобы добавить';
    } else {
        buttonText = 'Добавить в корзину';
    }

    const alreadyReviewed = false; // сервер сам вернёт 400 при повторной попытке

    return (
        <div className="service-page">
            <button className="back-link" onClick={() => navigate(-1)}>← Назад</button>

            <div className="service-page-grid">
                <div className="service-page-image">
                    <img
                        src={imageSrc || '/placeholder.png'}
                        alt={service.service_name}
                        onError={(e) => {
                            e.target.src =
                                'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23e8ecf5%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%22200%22 y=%22155%22 text-anchor=%22middle%22 fill=%22%23888%22 font-size=%2218%22%3EНет фото%3C/text%3E%3C/svg%3E';
                        }}
                    />
                </div>

                <div className="service-page-info">
                    {service.category_name && (
                        <div className="service-page-category">{service.category_name}</div>
                    )}
                    <h1>{service.service_name}</h1>
                    <p className="service-page-description">{service.description}</p>

                    <div className="service-page-meta">
                        <div className="meta-item">
                            <span className="meta-label">Объём бутылки</span>
                            <span className="meta-value">{service.duration_minutes} мл</span>
                        </div>
                        {hasDiscount && (
                            <div className="meta-item">
                                <span className="meta-label">Скидка</span>
                                <span className="meta-value discount">−{service.discount_percent}%</span>
                            </div>
                        )}
                    </div>

                    <div className="service-page-price-block">
                        {hasDiscount ? (
                            <>
                                <span className="old-price">{service.price} ₽</span>
                                <span className="new-price">{discountedPrice.toFixed(0)} ₽</span>
                            </>
                        ) : (
                            <span className="price">{service.price} ₽</span>
                        )}
                    </div>

                    <button
                        className="add-to-cart-btn large"
                        onClick={handleAdd}
                        disabled={!canShop}
                        title={!canShop ? 'Сотрудники и администраторы не могут добавлять товары' : ''}
                    >
                        {buttonText}
                    </button>
                </div>
            </div>

            {/* ==== Отзывы ==== */}
            <section className="reviews-section">
                <h2>Отзывы ({service.reviews?.length || 0})</h2>

                {/* Форма отзыва — только для роли user */}
                {canShop && (
                    <form className="review-form" onSubmit={handleReviewSubmit}>
                        <h3>Оставить отзыв</h3>

                        {reviewError && <div className="error">{reviewError}</div>}
                        {reviewSuccess && <div className="success">{reviewSuccess}</div>}

                        <label>
                            Оценка
                            <select
                                value={reviewForm.rating}
                                onChange={(e) =>
                                    setReviewForm({ ...reviewForm, rating: Number(e.target.value) })
                                }
                            >
                                {[5, 4, 3, 2, 1].map(n => (
                                    <option key={n} value={n}>{n} ★</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Комментарий (необязательно)
                            <textarea
                                rows={3}
                                value={reviewForm.comment}
                                onChange={(e) =>
                                    setReviewForm({ ...reviewForm, comment: e.target.value })
                                }
                                placeholder="Поделитесь впечатлением о товаре..."
                            />
                        </label>

                        <button type="submit" disabled={submitting}>
                            {submitting ? 'Отправка...' : 'Отправить отзыв'}
                        </button>
                    </form>
                )}

                {/* Список отзывов */}
                {service.reviews?.length === 0 && (
                    <p className="no-reviews">Пока отзывов нет — будьте первым!</p>
                )}

                <div className="reviews-list">
                    {service.reviews?.map((r, idx) => (
                        <div key={idx} className="review-card">
                            <div className="review-header">
                                <span className="review-author">
                                    {r.first_name || 'Пользователь'} {r.last_name || ''}
                                </span>
                                <span className="review-date">
                                    {new Date(r.created_at).toLocaleDateString('ru-RU')}
                                </span>
                            </div>
                            <div className="review-rating">
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                            </div>
                            {r.comment && <p className="review-text">{r.comment}</p>}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
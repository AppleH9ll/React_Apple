import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getServiceImage } from '../utils/serviceImages';

export default function ServicePage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { add } = useCart();

    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadService();
    }, [id]);

    async function loadService() {
        try {
            setLoading(true);
            const data = await api.serviceById(id);
            setService(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleAdd() {
        try {
            await add(service.service_id);
        } catch (err) {
            alert(err.message);
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
                            <span className="meta-label">Длительность</span>
                            <span className="meta-value">{service.duration_minutes} мин</span>
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
                        disabled={user.role_name === 'admin'}
                    >
                        {user.role_name === 'admin' ? 'Недоступно для админа' : 'Добавить в корзину'}
                    </button>
                </div>
            </div>
        </div>
    );
}
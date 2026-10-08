import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { getServiceImage } from '../utils/serviceImages';

function ServiceList({ services }) {
    if (services.length === 0) {
        return (
            <div className="empty-state empty-search">
                <h3>Ничего не найдено</h3>
                <p className="empty-hint">Попробуйте изменить параметры поиска</p>
            </div>
        );
    }

    return (
        <div className="service-list">
            <div className="services-grid">
                {services.map(service => (
                    <ServiceCard key={service.slug} service={service} />
                ))}
            </div>
        </div>
    );
}

function ServiceCard({ service }) {
    const { user } = useAuth();
    const { cart, add, canShop } = useCart();

    const inCart = cart.find(i => i.slug === service.slug);

    const hasDiscount = service.discount_percent > 0;
    const discountedPrice = hasDiscount
        ? service.price * (1 - service.discount_percent / 100)
        : service.price;

    const imageSrc = getServiceImage(service);

    async function handleAdd() {
        try {
            await add(service.slug);
        } catch (err) {
            alert(err.message);
        }
    }

    let buttonText;
    if (!canShop) {
        buttonText = user?.role_name === 'admin'
            ? 'Недоступно для админа'
            : user?.role_name === 'employee'
            ? 'Недоступно для сотрудника'
            : 'Войдите в аккаунт';
    } else if (inCart) {
        buttonText = `В корзине: ${inCart.quantity}`;
    } else {
        buttonText = 'В корзину';
    }

    return (
        <div className="service-card">
            <Link to={`/service/${service.slug}`} className="service-card-image-link">
                <div className="service-card-image-wrapper">
                    <img
                        src={imageSrc || '/placeholder.png'}
                        alt={service.service_name}
                        className="service-card-image"
                        onError={(e) => {
                            e.target.src =
                                'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 140%22%3E%3Crect fill=%22%23e8ecf5%22 width=%22200%22 height=%22140%22/%3E%3Ctext x=%22100%22 y=%2275%22 text-anchor=%22middle%22 fill=%22%23888%22 font-size=%2214%22%3EНет фото%3C/text%3E%3C/svg%3E';
                        }}
                    />
                    {hasDiscount && (
                        <div className="discount-badge">−{service.discount_percent}%</div>
                    )}
                </div>
            </Link>

            <div className="service-card-body">
                <h3 className="service-card-title">{service.service_name}</h3>
                <p className="service-description">{service.description}</p>

                <div className="service-details">
                    <span>{service.duration_minutes} мл</span>
                    {service.category_name && <span>{service.category_name}</span>}
                </div>

                <div className="service-price">
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
                    className="add-to-cart-btn"
                    onClick={handleAdd}
                    disabled={!canShop}
                    title={!canShop ? 'Сотрудники и администраторы не могут добавлять товары' : ''}
                >
                    {buttonText}
                </button>
            </div>
        </div>
    );
}

export default ServiceList;
const API = 'http://localhost:3001/api';

const SERVER_DOWN_MESSAGE =
    '⚠️ Сервер временно недоступен. Возможно, ведутся технические работы. Попробуйте через пару минут.';

// Токен хранится в памяти модуля. Устанавливается через setToken.
let _token = localStorage.getItem('shop_token') || null;

export function setToken(token) {
    _token = token;
    if (token) localStorage.setItem('shop_token', token);
    else localStorage.removeItem('shop_token');
}

async function request(url, options = {}) {
    const { method = 'GET', body, auth: needAuth = false } = options;

    let response;
    try {
        response = await fetch(API + url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch {
        throw new Error(SERVER_DOWN_MESSAGE);
    }

    if ([502, 503, 504].includes(response.status)) {
        throw new Error(SERVER_DOWN_MESSAGE);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Ошибка запроса');
    return data;
}

export const api = {
    // --- Авторизация ---
    login: (email, password) =>
        request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (data) =>
        request('/auth/register', { method: 'POST', body: data }),
    me: () => request('/auth/me', { auth: true }),

    // --- Каталог ---
    services: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.q) params.append('q', filters.q);
        if (filters.min_price) params.append('min_price', filters.min_price);
        if (filters.max_price) params.append('max_price', filters.max_price);
        if (filters.sort) params.append('sort', filters.sort);
        const qs = params.toString();
        return request(`/services${qs ? '?' + qs : ''}`);
    },
    serviceBySlug: (slug) => request(`/services/${slug}`),
    addService: (data) => request('/services', { method: 'POST', body: data }),
    updateService: (slug, data) => request(`/services/${slug}`, { method: 'PUT', body: data }),
    deleteService: (slug) => request(`/services/${slug}`, { method: 'DELETE' }),

    // --- Категории ---
    categories: () => request('/categories'),
    addCategory: (data) => request('/categories', { method: 'POST', body: data }),
    updateCategory: (slug, data) => request(`/categories/${slug}`, { method: 'PUT', body: data }),
    deleteCategory: (slug, cascade = false) =>
        request(`/categories/${slug}${cascade ? '?cascade=true' : ''}`, { method: 'DELETE' }),

    // --- Корзина ---
    getCart: () => request('/cart'),
    addToCart: (slug, quantity = 1) =>
        request('/cart', { method: 'POST', body: { service_slug: slug, quantity } }),
    updateCartQuantity: (slug, quantity) =>
        request(`/cart/${slug}`, { method: 'PATCH', body: { quantity } }),
    removeFromCart: (slug) => request(`/cart/${slug}`, { method: 'DELETE' }),
    clearCart: () => request('/cart', { method: 'DELETE' }),

    // --- Заказы ---
    createOrder: (coupon_code, address, delivery_date) =>
        request('/orders', { method: 'POST', body: { coupon_code, address, delivery_date } }),
    myOrders: () => request('/orders'),

    // --- Отзывы ---
    addReview: (slug, rating, comment) =>
        request(`/services/${slug}/reviews`, { method: 'POST', body: { rating, comment } }),

    // --- Купоны ---
    validateCoupon: (code) => request(`/coupons/validate?code=${encodeURIComponent(code)}`),
    coupons: () => request('/coupons'),
    addCoupon: (data) => request('/coupons', { method: 'POST', body: data }),
    updateCoupon: (code, data) => request(`/coupons/${code}`, { method: 'PUT', body: data }),
    deleteCoupon: (code) => request(`/coupons/${code}`, { method: 'DELETE' }),

    // --- Сертификаты ---
    certificates: () => request('/certificates'),
    addCertificate: (data) => request('/certificates', { method: 'POST', body: data }),
    updateCertificate: (code, data) => request(`/certificates/${code}`, { method: 'PUT', body: data }),
    deleteCertificate: (code) => request(`/certificates/${code}`, { method: 'DELETE' }),

    // --- Профиль ---
    updateProfile: (data) => request('/profile', { method: 'PUT', body: data }),

    // --- Админ ---
    adminUsers: () => request('/admin/users'),
    adminUpdateRole: (email, role_name) =>
        request(`/admin/users/${email}/role`, { method: 'PUT', body: { role_name } }),
    adminUpdateDiscount: (email, discount_percent) =>
        request(`/admin/users/${email}/discount`, { method: 'PUT', body: { discount_percent } }),
    adminDeleteUser: (email) => request(`/admin/users/${email}`, { method: 'DELETE' }),
    roles: () => request('/roles'),
    appointments: () => request('/appointments'),
    search: (type, q) => request(`/admin/search?type=${type}&q=${encodeURIComponent(q)}`),
};
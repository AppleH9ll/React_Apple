const API = 'http://localhost:3001/api';
const ADMIN_TOKEN = 'my-super-secret-admin-token-2026';

const SERVER_DOWN_MESSAGE =
    'Сервер временно недоступен. Возможно, ведутся технические работы. Попробуйте через пару минут.';

async function request(url, options = {}) {
    const isAdminRequest = options.admin === true;
    const { admin, ...fetchOptions } = options;

    let response;
    try {
        response = await fetch(API + url, {
            headers: {
                'Content-Type': 'application/json',
                ...(isAdminRequest ? { 'x-admin-token': ADMIN_TOKEN } : {}),
                ...(fetchOptions.headers || {}),
            },
            ...fetchOptions,
        });
    } catch (err) {
        // fetch выбрасывает TypeError, когда сервер недоступен
        throw new Error(SERVER_DOWN_MESSAGE);
    }

    // Проверяем "серверные" статусы — тоже показываем как "тех. работы"
    if ([502, 503, 504].includes(response.status)) {
        throw new Error(SERVER_DOWN_MESSAGE);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса к серверу');
    }
    return data;
}

export const api = {
    // --- авторизация ---
    login: (email, password) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

    // --- услуги ---
    services: (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.category_id) params.append('category_id', filters.category_id);
        if (filters.q) params.append('q', filters.q);
        if (filters.min_price) params.append('min_price', filters.min_price);
        if (filters.max_price) params.append('max_price', filters.max_price);
        if (filters.sort) params.append('sort', filters.sort);
        const qs = params.toString();
        return request(`/services${qs ? '?' + qs : ''}`);
    },
    serviceById: (id) => request(`/services/${id}`),
    addService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data), admin: true }),
    updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data), admin: true }),
    deleteService: (id) => request(`/services/${id}`, { method: 'DELETE', admin: true }),

    // --- категории ---
    categories: () => request('/categories'),
    addCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data), admin: true }),
    updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data), admin: true }),
    deleteCategory: (id, cascade = false) =>
        request(`/categories/${id}${cascade ? '?cascade=true' : ''}`, { method: 'DELETE', admin: true }),

    // --- корзина ---
    getCart: (userId) => request(`/cart/${userId}`),
    addToCart: (userId, serviceId, quantity = 1) =>
        request('/cart', { method: 'POST', body: JSON.stringify({ user_id: userId, service_id: serviceId, quantity }) }),
    updateCartQuantity: (cartId, quantity, userId) =>
        request(`/cart/${cartId}`, { method: 'PATCH', body: JSON.stringify({ quantity, user_id: userId }) }),
    removeFromCart: (cartId, userId) =>
        request(`/cart/${cartId}?user_id=${userId}`, { method: 'DELETE' }),
    clearCart: (userId) => request(`/cart/user/${userId}`, { method: 'DELETE' }),

    // --- заказы ---
    createOrder: (userId, couponCode = null, address = null) =>
        request('/orders', { method: 'POST', body: JSON.stringify({ user_id: userId, coupon_code: couponCode, address }) }),
    userOrders: (userId) => request(`/users/${userId}/orders`),

    // --- купоны ---
    coupons: () => request('/coupons'),
    validateCoupon: (code) => request(`/coupons/validate?code=${encodeURIComponent(code)}`),
    addCoupon: (data) => request('/coupons', { method: 'POST', body: JSON.stringify(data), admin: true }),
    updateCoupon: (id, data) => request(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data), admin: true }),
    deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE', admin: true }),

    // --- сертификаты ---
    certificates: () => request('/certificates'),
    addCertificate: (data) => request('/certificates', { method: 'POST', body: JSON.stringify(data), admin: true }),
    updateCertificate: (id, data) => request(`/certificates/${id}`, { method: 'PUT', body: JSON.stringify(data), admin: true }),
    deleteCertificate: (id) => request(`/certificates/${id}`, { method: 'DELETE', admin: true }),

    // --- пользователи ---
    user: (id) => request(`/users/${id}`),
    users: () => request('/users', { admin: true }),
    updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data), admin: true }),
    updateUserRole: (id, role_id) =>
        request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role_id }), admin: true }),
    deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE', admin: true }),

    // --- поиск и роли ---
    search: (type, q) => request(`/admin/search?type=${type}&q=${encodeURIComponent(q)}`, { admin: true }),
    roles: () => request('/roles', { admin: true }),

    // --- записи ---
    appointments: () => request('/appointments', { admin: true }),
    addAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE', admin: true }),
};
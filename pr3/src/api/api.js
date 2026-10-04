const API = 'http://localhost:3001/api';

async function request(url, options = {}) {
    const response = await fetch(API + url, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса к серверу');
    }
    return data;
}

export const api = {
    login: (email, password) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

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
    addService: (data) => request('/services', { method: 'POST', body: JSON.stringify(data) }),
    updateService: (id, data) => request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

    categories: () => request('/categories'),
    addCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

    getCart: (userId) => request(`/cart/${userId}`),
    addToCart: (userId, serviceId, quantity = 1) =>
        request('/cart', { method: 'POST', body: JSON.stringify({ user_id: userId, service_id: serviceId, quantity }) }),
    updateCartQuantity: (cartId, quantity) =>
        request(`/cart/${cartId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
    removeFromCart: (cartId) => request(`/cart/${cartId}`, { method: 'DELETE' }),
    clearCart: (userId) => request(`/cart/user/${userId}`, { method: 'DELETE' }),

    createOrder: (userId, couponCode = null, address = null) =>
        request('/orders', { method: 'POST', body: JSON.stringify({ user_id: userId, coupon_code: couponCode, address }) }),
    userOrders: (userId) => request(`/users/${userId}/orders`),

    coupons: () => request('/coupons'),
    validateCoupon: (code) => request(`/coupons/validate?code=${encodeURIComponent(code)}`),
    addCoupon: (data) => request('/coupons', { method: 'POST', body: JSON.stringify(data) }),
    updateCoupon: (id, data) => request(`/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCoupon: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),

    certificates: () => request('/certificates'),
    addCertificate: (data) => request('/certificates', { method: 'POST', body: JSON.stringify(data) }),
    updateCertificate: (id, data) => request(`/certificates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteCertificate: (id) => request(`/certificates/${id}`, { method: 'DELETE' }),

    user: (id) => request(`/users/${id}`),
    users: () => request('/users'),
    updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    search: (type, q) => request(`/admin/search?type=${type}&q=${encodeURIComponent(q)}`),

    roles: () => request('/roles'),

    appointments: () => request('/appointments'),
    addAppointment: (data) => request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
};
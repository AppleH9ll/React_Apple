import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    // Сотрудник и админ не имеют корзины
    const isStaff = user?.role_name === 'admin' || user?.role_name === 'employee';

    const reload = useCallback(async () => {
        if (!user || isStaff) {
            setCart([]);
            return;
        }
        try {
            setLoading(true);
            const data = await api.getCart(user.user_id);
            setCart(data);
        } catch (err) {
            console.error('Ошибка загрузки корзины:', err);
        } finally {
            setLoading(false);
        }
    }, [user, isStaff]);

    useEffect(() => {
        reload();
    }, [reload]);

    const add = async (serviceId, quantity = 1) => {
        if (!user) throw new Error('Требуется авторизация');
        if (isStaff) throw new Error('Сотрудники и администраторы не могут добавлять товары в корзину');
        await api.addToCart(user.user_id, serviceId, quantity);
        await reload();
    };

    const updateQty = async (cartId, quantity) => {
        if (!user) throw new Error('Требуется авторизация');
        if (isStaff) throw new Error('Сотрудники и администраторы не могут изменять корзину');
        await api.updateCartQuantity(cartId, quantity, user.user_id);
        await reload();
    };

    const remove = async (cartId) => {
        if (!user) throw new Error('Требуется авторизация');
        if (isStaff) throw new Error('Сотрудники и администраторы не могут изменять корзину');
        await api.removeFromCart(cartId, user.user_id);
        await reload();
    };

    const clear = async () => {
        if (!user) return;
        if (isStaff) throw new Error('Сотрудники и администраторы не могут очищать корзину');
        await api.clearCart(user.user_id);
        await reload();
    };

    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider
            value={{ cart, loading, totalCount, add, updateQty, remove, clear, reload, isStaff }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
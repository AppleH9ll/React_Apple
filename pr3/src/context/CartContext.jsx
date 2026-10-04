import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    const isAdmin = user?.role_name === 'admin';

    const reload = useCallback(async () => {
        if (!user || isAdmin) {
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
    }, [user, isAdmin]);

    useEffect(() => {
        reload();
    }, [reload]);

    const add = async (serviceId, quantity = 1) => {
        if (!user) throw new Error('Требуется авторизация');
        if (isAdmin) throw new Error('Администратор не может добавлять в корзину');
        await api.addToCart(user.user_id, serviceId, quantity);
        await reload();
    };

    const updateQty = async (cartId, quantity) => {
        await api.updateCartQuantity(cartId, quantity);
        await reload();
    };

    const remove = async (cartId) => {
        await api.removeFromCart(cartId);
        await reload();
    };

    const clear = async () => {
        if (!user) return;
        await api.clearCart(user.user_id);
        await reload();
    };

    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider
            value={{ cart, loading, totalCount, add, updateQty, remove, clear, reload }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Сотрудник и админ не имеют корзины
    const isStaff = user?.role_name === 'admin' || user?.role_name === 'employee';
    const canShop = user && !isStaff;

    const reload = useCallback(async () => {
        if (!canShop) {
            setCart([]);
            setError('');
            return;
        }
        try {
            setLoading(true);
            setError('');
            const data = await api.getCart();
            setCart(data);
        } catch (err) {
            setError(err.message);
            setCart([]);
        } finally {
            setLoading(false);
        }
    }, [canShop]);

    useEffect(() => {
        reload();
    }, [reload]);

    const add = async (slug, quantity = 1) => {
        if (!canShop) throw new Error('Сотрудники и администраторы не могут добавлять товары');
        setError('');
        try {
            await api.addToCart(slug, quantity);
            await reload();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateQty = async (slug, quantity) => {
        if (!canShop) throw new Error('Нет доступа к корзине');
        setError('');
        try {
            await api.updateCartQuantity(slug, quantity);
            await reload();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const remove = async (slug) => {
        if (!canShop) throw new Error('Нет доступа к корзине');
        setError('');
        try {
            await api.removeFromCart(slug);
            await reload();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const clear = async () => {
        if (!canShop) throw new Error('Нет доступа к корзине');
        setError('');
        try {
            await api.clearCart();
            await reload();
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cart, loading, error,
                totalCount,
                add, updateQty, remove, clear, reload,
                isStaff, canShop,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
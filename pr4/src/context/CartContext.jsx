import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const { user } = useAuth();
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);

    const isStaff = user?.role_name === 'admin' || user?.role_name === 'employee';
    const canShop = user && !isStaff;

    const reload = useCallback(async () => {
        if (!canShop) { setCart([]); return; }
        try {
            setLoading(true);
            setCart(await api.getCart());
        } catch (err) {
            console.error('Ошибка загрузки корзины:', err);
        } finally {
            setLoading(false);
        }
    }, [canShop]);

    useEffect(() => { reload(); }, [reload]);

    const add = async (slug, quantity = 1) => {
        if (!canShop) throw new Error('Сотрудники и администраторы не могут добавлять товары');
        await api.addToCart(slug, quantity);
        await reload();
    };
    const updateQty = async (slug, quantity) => {
        await api.updateCartQuantity(slug, quantity);
        await reload();
    };
    const remove = async (slug) => {
        await api.removeFromCart(slug);
        await reload();
    };
    const clear = async () => {
        await api.clearCart();
        await reload();
    };

    const totalCount = cart.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider
            value={{ cart, loading, totalCount, add, updateQty, remove, clear, reload, isStaff, canShop }}
        >
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
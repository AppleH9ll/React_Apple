import { NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useCart } from './context/CartContext';
import { useTheme } from './context/ThemeContext';

export default function Menu() {
    const { user, logout } = useAuth();
    const { totalCount } = useCart();
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="navbar">
            <NavLink to="/" className="logo">WaterShop</NavLink>

            <nav>
                <NavLink to="/" end>Каталог</NavLink>
                <NavLink to="/cart">Корзина {totalCount > 0 && `(${totalCount})`}</NavLink>
                <NavLink to="/profile">Профиль</NavLink>
            </nav>

            <div className="user-box">
                <button className="theme-toggle" onClick={toggleTheme} title="Сменить тему">
                    {theme === 'light' ? 'Тёмная' : 'Светлая'}
                </button>
                <span>{user.first_name || user.email}</span>
                {Number(user.discount_percent) > 0 && (
                    <small>Скидка {user.discount_percent}%</small>
                )}
                <button onClick={logout}>Выйти</button>
            </div>
        </header>
    );
}
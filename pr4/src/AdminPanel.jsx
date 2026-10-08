import { NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';

export default function AdminPanel() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const isAdmin = user.role_name === 'admin';
    const isEmployee = user.role_name === 'employee';

    return (
        <header className="navbar admin-navbar">
            <NavLink to="/" className="logo">
                WaterShop {isAdmin ? '— Админ' : isEmployee ? '— Сотрудник' : ''}
            </NavLink>

            <nav>
                <NavLink to="/" end>Каталог</NavLink>
                <NavLink to="/admin/categories">Категории</NavLink>
                <NavLink to="/admin/services">Товары</NavLink>
                <NavLink to="/admin/appointments">Заказы</NavLink>
                <NavLink to="/admin/search">Поиск</NavLink>

                {isAdmin && (
                    <>
                        <NavLink to="/admin/users">Пользователи</NavLink>
                        <NavLink to="/admin/roles">Роли</NavLink>
                        <NavLink to="/admin/coupons">Купоны</NavLink>
                        <NavLink to="/admin/certificates">Сертификаты</NavLink>
                    </>
                )}
            </nav>

            <div className="user-box">
                <button className="theme-toggle" onClick={toggleTheme} title="Сменить тему">
                    {theme === 'light' ? 'Тёмная' : 'Светлая'}
                </button>
                <span>{user.email}</span>
                <b>{isAdmin ? 'Админ' : 'Сотрудник'}</b>
                <button onClick={logout}>Выйти</button>
            </div>
        </header>
    );
}
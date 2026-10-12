import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Menu from './Menu';
import AdminPanel from './AdminPanel';
import Login from './login';

import Catalog from './components/Catalog';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import ServicePage from './pages/ServicePage';
import MyReviews from './pages/MyReviews';

import AdminCategories from './components/AdminCategories';
import AdminServices from './components/AdminServices';
import AdminUsers from './components/AdminUsers';
import AdminAppointments from './components/AdminAppointments';
import AdminRoles from './components/AdminRoles';
import AdminCoupons from './components/AdminCoupons';
import AdminCertificates from './components/AdminCertificates';
import AdminSearch from './components/AdminSearch';

import './App.css';

function ProtectedRoute({ children }) {
    const { user } = useAuth();
    const location = useLocation();
    if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
    return children;
}

function AdminRoute({ children, allowEmployee = false }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    if (user.role_name === 'admin') return children;
    if (allowEmployee && user.role_name === 'employee') return children;
    return <ForbiddenPage />;
}

function ForbiddenPage() {
    return (
        <div className="empty-state" style={{ marginTop: '60px' }}>
            <h1 style={{ fontSize: '80px', margin: '0 0 10px' }}>🚫 403</h1>
            <h2>Доступ запрещён</h2>
            <p>У вас нет прав для просмотра этой страницы.</p>
            <Link
                to="/"
                className="btn-primary"
                style={{ display: 'inline-block', marginTop: '10px' }}
            >
                На главную
            </Link>
        </div>
    );
}

export default function App() {
    const { user, loading } = useAuth();

    // Пока проверяется сессия — показываем заглушку, чтобы не выкидывать на логин
    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '100vh',
                    fontSize: '18px',
                    color: '#6b7280',
                }}
            >
                Загрузка...
            </div>
        );
    }

    const isAdmin = user?.role_name === 'admin';
    const isEmployee = user?.role_name === 'employee';
    const hasAdminAccess = isAdmin || isEmployee;

    return (
        <div className="app">
            {!user ? (
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            ) : (
                <>
                    {hasAdminAccess ? <AdminPanel /> : <Menu />}

                    <main className="content">
                        <Routes>
                            <Route path="/" element={<ProtectedRoute><Catalog /></ProtectedRoute>} />
                            <Route path="/service/:slug" element={<ProtectedRoute><ServicePage /></ProtectedRoute>} />

                            {!hasAdminAccess && (
                                <>
                                    <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                                    <Route path="/my-reviews" element={<ProtectedRoute><MyReviews /></ProtectedRoute>} />
                                </>
                            )}

                            {/* /admin — редирект для staff, 403 для остальных */}
                            <Route
                                path="/admin"
                                element={
                                    hasAdminAccess
                                        ? <Navigate to="/admin/services" replace />
                                        : <ForbiddenPage />
                                }
                            />

                            {hasAdminAccess && (
                                <>
                                    <Route path="/admin/services" element={<AdminRoute allowEmployee><AdminServices /></AdminRoute>} />
                                    <Route path="/admin/categories" element={<AdminRoute allowEmployee><AdminCategories /></AdminRoute>} />
                                    <Route path="/admin/appointments" element={<AdminRoute allowEmployee><AdminAppointments /></AdminRoute>} />
                                    <Route path="/admin/search" element={<AdminRoute allowEmployee><AdminSearch /></AdminRoute>} />
                                </>
                            )}

                            {isAdmin && (
                                <>
                                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                                    <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />
                                    <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
                                    <Route path="/admin/certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
                                </>
                            )}

                            {!hasAdminAccess && (
                                <Route path="/admin/*" element={<ForbiddenPage />} />
                            )}

                            <Route path="/login" element={<Navigate to="/" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </main>
                </>
            )}
        </div>
    );
}
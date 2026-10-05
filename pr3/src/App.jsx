import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Menu from './Menu';
import AdminPanel from './AdminPanel';
import Login from './login';

import Catalog from './components/Catalog';
import CartPage from './pages/CartPage';
import ProfilePage from './pages/ProfilePage';
import ServicePage from './pages/ServicePage';

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
    return <Navigate to="/" replace />;
}

export default function App() {
    const { user } = useAuth();
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
                            <Route path="/service/:id" element={<ProtectedRoute><ServicePage /></ProtectedRoute>} />

                            {!hasAdminAccess && (
                                <>
                                    <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
                                    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                                </>
                            )}

                            {/* Доступно админу и сотруднику */}
                            {hasAdminAccess && (
                                <>
                                    <Route path="/admin/services" element={<AdminRoute allowEmployee><AdminServices /></AdminRoute>} />
                                    <Route path="/admin/appointments" element={<AdminRoute allowEmployee><AdminAppointments /></AdminRoute>} />
                                    <Route path="/admin/search" element={<AdminRoute allowEmployee><AdminSearch /></AdminRoute>} />
                                    <Route path="/admin/categories" element={<AdminRoute allowEmployee><AdminCategories /></AdminRoute>} />
                                </>
                            )}

                            {/* Только админ */}
                            {isAdmin && (
                                <>
                                    <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                                    <Route path="/admin/roles" element={<AdminRoute><AdminRoles /></AdminRoute>} />
                                    <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
                                    <Route path="/admin/certificates" element={<AdminRoute><AdminCertificates /></AdminRoute>} />
                                </>
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
import { Navigate, Route, Routes } from 'react-router-dom';
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

export default function App() {
    const { user } = useAuth();

    if (!user) return <Login />;

    const admin = user.role_name === 'admin';

    return (
        <div className="app">
            {admin ? <AdminPanel /> : <Menu />}

            <main className="content">
                <Routes>
                    <Route path="/" element={<Catalog />} />
                    <Route path="/service/:id" element={<ServicePage />} />

                    {!admin && (
                        <>
                            <Route path="/cart" element={<CartPage />} />
                            <Route path="/profile" element={<ProfilePage />} />
                        </>
                    )}

                    {admin && (
                        <>
                            <Route path="/admin/categories" element={<AdminCategories />} />
                            <Route path="/admin/services" element={<AdminServices />} />
                            <Route path="/admin/users" element={<AdminUsers />} />
                            <Route path="/admin/appointments" element={<AdminAppointments />} />
                            <Route path="/admin/roles" element={<AdminRoles />} />
                            <Route path="/admin/coupons" element={<AdminCoupons />} />
                            <Route path="/admin/certificates" element={<AdminCertificates />} />
                            <Route path="/admin/search" element={<AdminSearch />} />
                        </>
                    )}

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    );
}
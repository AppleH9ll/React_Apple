import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Восстановление сессии по токену из localStorage
    useEffect(() => {
        const token = localStorage.getItem('shop_token');
        if (!token) { setLoading(false); return; }

        setToken(token);
        api.me()
            .then(setUser)
            .catch(() => { setToken(null); setUser(null); })
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const data = await api.login(email, password);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const register = async (formData) => {
        const data = await api.register(formData);
        setToken(data.token);
        setUser(data.user);
        return data.user;
    };

    const update = (data) => setUser(prev => ({ ...prev, ...data }));

    const logout = () => {
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, update, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
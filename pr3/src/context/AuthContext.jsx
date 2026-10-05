import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('shop_user')) || null;
        } catch {
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('shop_token') || null);

    const login = (data) => {
        // data = { user, token } из нового формата API
        // либо просто объект пользователя (совместимость)
        const userData = data.user ?? data;
        setUser(userData);
        localStorage.setItem('shop_user', JSON.stringify(userData));

        if (data.token) {
            setToken(data.token);
            localStorage.setItem('shop_token', data.token);
        }
    };

    const update = (data) => {
        setUser(data);
        localStorage.setItem('shop_user', JSON.stringify(data));
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('shop_user');
        localStorage.removeItem('shop_token');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, update, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
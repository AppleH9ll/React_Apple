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

    const login = (data) => {
        setUser(data);
        localStorage.setItem('shop_user', JSON.stringify(data));
    };

    const update = (data) => {
        setUser(data);
        localStorage.setItem('shop_user', JSON.stringify(data));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('shop_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, update, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
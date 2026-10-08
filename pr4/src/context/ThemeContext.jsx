import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

function getInitialTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
}

const initialTheme = getInitialTheme();
document.documentElement.setAttribute('data-theme', initialTheme);

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(initialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () =>
        setTheme(t => (t === 'light' ? 'dark' : 'light'));

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
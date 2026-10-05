import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './api/api';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit(e) {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Заполните email и пароль');
            return;
        }
        if (password.length < 6) {
            setError('Пароль от 6 символов');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'register') {
                await api.register({
                    email,
                    password,
                    first_name: firstName,
                    last_name: lastName,
                });
            }
            const result = await api.login(email, password);
            // result = { user, token }
            login(result);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            <form className="login-card" onSubmit={submit}>
                <h1>AirShop</h1>
                <p>{mode === 'login' ? 'Вход в личный кабинет' : 'Регистрация'}</p>

                <div className="auth-tabs">
                    <button
                        type="button"
                        className={mode === 'login' ? 'active' : ''}
                        onClick={() => { setMode('login'); setError(''); }}
                    >
                        Вход
                    </button>
                    <button
                        type="button"
                        className={mode === 'register' ? 'active' : ''}
                        onClick={() => { setMode('register'); setError(''); }}
                    >
                        Регистрация
                    </button>
                </div>

                {error && <div className="error">{error}</div>}

                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user1@shop.local"
                />

                <label>Пароль</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Пароль"
                />

                {mode === 'register' && (
                    <>
                        <label>Имя</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Иван"
                        />
                        <label>Фамилия</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Иванов"
                        />
                    </>
                )}

                <button disabled={loading}>
                    {loading ? 'Загрузка...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
                </button>

                <div className="test-login">
                    <p>Тестовые аккаунты:</p>
                    <button type="button" onClick={() => {
                        setEmail('admin@shop.local');
                        setPassword('admin123');
                    }}>Администратор</button>
                    <button type="button" onClick={() => {
                        setEmail('user3@shop.local');
                        setPassword('wqwqwq');
                    }}>Пользователь</button>
                </div>
            </form>
        </div>
    );
}
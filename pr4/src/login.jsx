import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const [mode, setMode] = useState('login');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
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
        if (mode === 'register' && !fullName.trim()) {
            setError('Укажите полное имя');
            return;
        }

        setLoading(true);
        try {
            if (mode === 'register') {
                await register({
                    full_name: fullName.trim(),
                    email,
                    password,
                    phone: phone.trim(),
                });
            } else {
                await login(email, password);
            }
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
                <h1>WaterShop</h1>
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

                {mode === 'register' && (
                    <>
                        <label>Полное имя</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Иванов Иван Иванович"
                        />
                    </>
                )}

                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                />

                <label>Пароль</label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                />

                {mode === 'register' && (
                    <>
                        <label>Телефон</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+7 (999) 123-45-67"
                        />
                    </>
                )}

                <button disabled={loading}>
                    {loading ? 'Загрузка...' : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
                </button>
            </form>
        </div>
    );
}
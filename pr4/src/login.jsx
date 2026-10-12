import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api } from './api/api';

export default function Login() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    const [mode, setMode] = useState('login'); // login | register | forgot | reset
    const [form, setForm] = useState({
        full_name: '',
        email: '',
        password: '',
        phone: '',
        code: '',
        new_password: '',
    });
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);

    const setField = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    // Форматирование телефона: +7 (999) 123-45-67
    function handlePhoneChange(e) {
        let v = e.target.value.replace(/\D/g, '');
        if (v.length > 11) v = v.slice(0, 11);
        if (v.length > 0 && v[0] === '8') v = '7' + v.slice(1);

        let formatted = '';
        if (v.length > 0) formatted = '+' + v[0];
        if (v.length > 1) formatted += ' (' + v.slice(1, 4);
        if (v.length > 4) formatted += ') ' + v.slice(4, 7);
        if (v.length > 7) formatted += '-' + v.slice(7, 9);
        if (v.length > 9) formatted += '-' + v.slice(9, 11);
        setField('phone', formatted);
    }

    async function submit(e) {
        e.preventDefault();
        setError('');
        setInfo('');
        setLoading(true);

        try {
            if (mode === 'register') {
                if (!form.full_name.trim()) throw new Error('Укажите ФИО');
                if (form.phone && form.phone.replace(/\D/g, '').length !== 11) {
                    throw new Error('Телефон должен быть в формате +7 (999) 123-45-67');
                }
                await register({
                    full_name: form.full_name.trim(),
                    email: form.email,
                    password: form.password,
                    phone: form.phone,
                });
                navigate(from, { replace: true });
            } else if (mode === 'login') {
                await login(form.email, form.password);
                navigate(from, { replace: true });
            } else if (mode === 'forgot') {
                const res = await api.forgotPassword(form.email);
                setInfo((res.message || 'Код отправлен') + ' Проверьте почту.');
                setMode('reset');
            } else if (mode === 'reset') {
                await api.resetPassword(form.email, form.code, form.new_password);
                setInfo('Пароль успешно изменён. Войдите с новым паролем.');
                setMode('login');
                setField('password', '');
                setField('code', '');
                setField('new_password', '');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const titles = {
        login: 'Вход в личный кабинет',
        register: 'Регистрация',
        forgot: 'Восстановление пароля',
        reset: 'Введите код из письма',
    };

    const linkBtnStyle = {
        background: 'none',
        border: 'none',
        color: '#667eea',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontSize: '13px',
        padding: 0,
        marginTop: '4px',
        alignSelf: 'flex-start',
    };

    const backBtnStyle = {
        marginTop: '8px',
        background: 'transparent',
        border: '1px solid #ccc',
        color: '#333',
        width: '100%',
        padding: '10px',
        borderRadius: '8px',
        cursor: 'pointer',
    };

    return (
        <div className="login-page">
            <form className="login-card" onSubmit={submit}>
                <h1>WaterShop</h1>
                <p>{titles[mode]}</p>

                {(mode === 'login' || mode === 'register') && (
                    <div className="auth-tabs">
                        <button
                            type="button"
                            className={mode === 'login' ? 'active' : ''}
                            onClick={() => { setMode('login'); setError(''); setInfo(''); }}
                        >
                            Вход
                        </button>
                        <button
                            type="button"
                            className={mode === 'register' ? 'active' : ''}
                            onClick={() => { setMode('register'); setError(''); setInfo(''); }}
                        >
                            Регистрация
                        </button>
                    </div>
                )}

                {error && <div className="error">{error}</div>}
                {info && (
                    <div style={{
                        background: '#d4edda',
                        color: '#155724',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        marginBottom: '10px',
                        fontSize: '14px',
                    }}>
                        {info}
                    </div>
                )}

                {mode === 'register' && (
                    <>
                        <label>Полное имя (только буквы)</label>
                        <input
                            type="text"
                            value={form.full_name}
                            onChange={e => setField('full_name', e.target.value)}
                            placeholder="Иванов Иван"
                        />
                    </>
                )}

                <label>Email</label>
                <input
                    type="email"
                    value={form.email}
                    onChange={e => setField('email', e.target.value)}
                    placeholder="user@example.com"
                    readOnly={mode === 'reset'}
                />

                {/* ==== ЛОГИН: пароль + кнопка + ссылка "Забыли пароль" ==== */}
                {mode === 'login' && (
                    <>
                        <label>Пароль</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setField('password', e.target.value)}
                            placeholder="Минимум 6 символов"
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? 'Загрузка...' : 'Войти'}
                        </button>

                        <button
                            type="button"
                            style={linkBtnStyle}
                            onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                        >
                            Забыли пароль?
                        </button>
                    </>
                )}

                {/* ==== РЕГИСТРАЦИЯ: пароль + телефон + кнопка ==== */}
                {mode === 'register' && (
                    <>
                        <label>Пароль</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={e => setField('password', e.target.value)}
                            placeholder="Минимум 6 символов"
                        />
                        <label>Телефон</label>
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={handlePhoneChange}
                            placeholder="+7 (999) 123-45-67"
                        />

                        <button type="submit" disabled={loading}>
                            {loading ? 'Загрузка...' : 'Зарегистрироваться'}
                        </button>
                    </>
                )}

                {/* ==== ЗАБЫЛИ ПАРОЛЬ: запрос кода ==== */}
                {mode === 'forgot' && (
                    <>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                            Введите email — мы отправим код для сброса пароля.
                        </p>
                        <button type="submit" disabled={loading || !form.email}>
                            {loading ? 'Отправка...' : 'Отправить код'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            style={backBtnStyle}
                        >
                            Назад ко входу
                        </button>
                    </>
                )}

                {/* ==== СБРОС: код + новый пароль ==== */}
                {mode === 'reset' && (
                    <>
                        <label>Код из письма</label>
                        <input
                            type="text"
                            value={form.code}
                            onChange={e => setField('code', e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="6 цифр"
                        />
                        <label>Новый пароль</label>
                        <input
                            type="password"
                            value={form.new_password}
                            onChange={e => setField('new_password', e.target.value)}
                            placeholder="Минимум 6 символов"
                        />
                        <button
                            type="submit"
                            disabled={loading || !form.code || !form.new_password}
                        >
                            {loading ? 'Сохранение...' : 'Сбросить пароль'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('login')}
                            style={backBtnStyle}
                        >
                            Назад ко входу
                        </button>
                    </>
                )}
            </form>
        </div>
    );
}
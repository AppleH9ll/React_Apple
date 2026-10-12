import { useEffect, useState } from 'react';
import { api } from '../api/api';

const TYPES = [
    { value: 'user', label: 'Пользователи' },
    { value: 'service', label: 'Товары' },
    { value: 'coupon', label: 'Купоны' },
    { value: 'certificate', label: 'Сертификаты' },
];

// Какие поля показывать для каждого типа
const FIELD_LABELS = {
    user: { email: 'Email', first_name: 'Имя', last_name: 'Фамилия' },
    service: { service_name: 'Название', price: 'Цена, ₽' },
    coupon: { code: 'Код', discount_percent: 'Скидка, %' },
    certificate: { code: 'Код', title: 'Название' },
};

export default function AdminSearch() {
    const [type, setType] = useState('user');
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const t = setTimeout(() => {
            if (q.trim()) runSearch();
            else { setResults([]); setSearched(false); }
        }, 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line
    }, [q, type]);

    async function runSearch() {
        try {
            setLoading(true);
            setError('');
            const data = await api.search(type, q);
            setResults(data);
            setSearched(true);
        } catch (err) {
            setError(err.message);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }

    const labels = FIELD_LABELS[type] || {};

    return (
        <section className="admin-section">
            <div className="admin-section-header">
                <h2>Поиск по базе</h2>
            </div>

            <div className="admin-search-bar">
                <select value={type} onChange={(e) => setType(e.target.value)}>
                    {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                    type="text"
                    placeholder="Введите запрос..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                />
            </div>

            {error && <div className="admin-message error">{error}</div>}
            {loading && <div className="admin-search-loading">Поиск...</div>}

            {!loading && searched && results.length === 0 && (
                <div className="admin-search-empty">
                    <h3>Ничего не найдено</h3>
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="admin-search-results">
                    {results.map((item, idx) => (
                        <div key={idx} className="admin-search-result">
                            {Object.entries(labels).map(([key, label]) => (
                                <div key={key} className="admin-search-field">
                                    <span className="admin-search-key">{label}:</span>
                                    <span className="admin-search-value">
                                        {String(item[key] ?? '—')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
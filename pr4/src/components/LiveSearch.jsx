import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';

export default function LiveSearch({ onNavigate }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const boxRef = useRef(null);

    // Дебаунс: запрос отправляется через 250 мс после последнего нажатия
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const data = await api.services({ q: query });
                setResults(data.slice(0, 6));
                setOpen(true);
            } catch (err) {
                setError(err.message);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [query]);

    // Закрытие по клику вне
    useEffect(() => {
        function onClickOutside(e) {
            if (boxRef.current && !boxRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', onClickOutside);
        return () => document.removeEventListener('mousedown', onClickOutside);
    }, []);

    function handleSelect() {
        setQuery('');
        setOpen(false);
        setResults([]);
        if (onNavigate) onNavigate();
    }

    return (
        <div className="live-search" ref={boxRef}>
            <input
                type="text"
                placeholder="Поиск воды... (например, Боржоми)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim() && setOpen(true)}
            />

            {open && (
                <div className="live-search-dropdown">
                    {loading && <div className="live-search-loading">Поиск...</div>}

                    {!loading && error && (
                        <div className="live-search-empty" style={{ color: 'var(--danger)' }}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && results.length === 0 && (
                        <div className="live-search-empty">
                            Ничего не найдено по запросу «{query}»
                        </div>
                    )}

                    {!loading && results.map((r) => {
                        const hasDiscount = r.discount_percent > 0;
                        const finalPrice = hasDiscount
                            ? r.price * (1 - r.discount_percent / 100)
                            : r.price;

                        return (
                            <Link
                                key={r.slug}
                                to={`/service/${r.slug}`}
                                className="live-search-item"
                                onClick={handleSelect}
                            >
                                <img
                                    src={r.image_url || 'https://placehold.co/100x100?text=' + encodeURIComponent(r.service_name)}
                                    alt={r.service_name}
                                    onError={(e) => {
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 48 48%22%3E%3Crect fill=%22%23e0e0e0%22 width=%2248%22 height=%2248%22/%3E%3C/svg%3E';
                                    }}
                                />
                                <div className="live-search-info">
                                    <div className="live-search-name">{r.service_name}</div>
                                    <div className="live-search-meta">
                                        <span>{r.duration_minutes} мл</span>
                                        {r.category_name && <span>{r.category_name}</span>}
                                    </div>
                                </div>
                                <div className={`live-search-price ${hasDiscount ? 'old' : ''}`}>
                                    {hasDiscount ? (
                                        <>
                                            <span style={{ textDecoration: 'line-through', color: '#999', fontSize: '12px', marginRight: '4px' }}>
                                                {r.price} ₽
                                            </span>
                                            {finalPrice.toFixed(0)} ₽
                                        </>
                                    ) : (
                                        <>{r.price} ₽</>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
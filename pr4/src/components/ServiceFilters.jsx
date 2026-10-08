import { useEffect, useState } from 'react';

function ServiceFilters({ filters, onChange }) {
    const [local, setLocal] = useState(filters);

    useEffect(() => {
        const t = setTimeout(() => onChange(local), 350);
        return () => clearTimeout(t);
    }, [local.q, local.min_price, local.max_price, local.sort]);

    function update(field, value) {
        setLocal(prev => ({ ...prev, [field]: value }));
    }

    function reset() {
        const empty = { q: '', min_price: '', max_price: '', sort: '' };
        setLocal(empty);
        onChange(empty);
    }

    const hasAny = local.q || local.min_price || local.max_price || local.sort;

    return (
        <div className="service-filters">
            <input
                type="text"
                placeholder="Поиск по названию или описанию..."
                value={local.q}
                onChange={(e) => update('q', e.target.value)}
            />
            <input
                type="number"
                placeholder="Цена от"
                value={local.min_price}
                onChange={(e) => update('min_price', e.target.value)}
                min="0"
            />
            <input
                type="number"
                placeholder="до"
                value={local.max_price}
                onChange={(e) => update('max_price', e.target.value)}
                min="0"
            />
            <select
                value={local.sort}
                onChange={(e) => update('sort', e.target.value)}
            >
                <option value="">Сортировка</option>
                <option value="price_asc">Цена ↑</option>
                <option value="price_desc">Цена ↓</option>
                <option value="name">Название</option>
            </select>
            {hasAny && (
                <button className="filter-reset" onClick={reset}>Сбросить</button>
            )}
        </div>
    );
}

export default ServiceFilters;
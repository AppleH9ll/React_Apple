import { useEffect, useState } from 'react';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';
import CategoryFilter from './CategoryFilter';
import ServiceFilters from './ServiceFilters';
import ServiceList from './ServiceList';

export default function Catalog() {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [filters, setFilters] = useState({
        q: '',
        min_price: '',
        max_price: '',
        sort: '',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    async function load() {
        try {
            setLoading(true);
            setError('');
            const query = { ...filters };
            if (selectedCategories.length === 1) {
                query.category_id = selectedCategories[0];
            }
            const [servicesData, categoriesData] = await Promise.all([
                api.services(query),
                api.categories(),
            ]);

            if (selectedCategories.length > 1) {
                setServices(servicesData.filter(s => selectedCategories.includes(s.category_id)));
            } else {
                setServices(servicesData);
            }
            setCategories(categoriesData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, [filters, selectedCategories]);

    return (
        <section>
            <div className="page-title">
                <div>
                    <h1>Каталог воздуха</h1>
                    <p>Свежий воздух со всего мира — в банке, с доставкой</p>
                </div>
                {Number(user?.discount_percent) > 0 && (
                    <div className="discount-info">
                        Ваша скидка: <b>{user.discount_percent}%</b>
                    </div>
                )}
            </div>

            <div className="catalog">
                <aside className="categories">
                    <CategoryFilter
                        categories={categories}
                        selectedCategories={selectedCategories}
                        onCategoryChange={setSelectedCategories}
                    />
                </aside>

                <div>
                    <ServiceFilters filters={filters} onChange={setFilters} />

                    {loading && <div className="state">Загрузка каталога...</div>}
                    {error && <div className="state error">Ошибка: {error}</div>}
                    {!loading && !error && <ServiceList services={services} />}
                </div>
            </div>
        </section>
    );
}
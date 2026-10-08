import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminAppointments() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setLoading(true);
            setItems(await api.appointments());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="admin-section">
            <h1>Заказы</h1>

            {error && <div className="admin-message error">{error}</div>}
            {loading && <div className="state">Загрузка...</div>}

            {!loading && (
                <div className="admin-table">
                    {items.map((a, idx) => (
                        <div className="admin-table-row admin-table-row-appt" key={idx}>
                            <span className="admin-cell-strong">{a.email}</span>
                            <span>{a.service_name}</span>
                            <span>
                                {new Date(a.appointment_date).toLocaleDateString('ru-RU')}
                                {a.appointment_time && ` ${a.appointment_time}`}
                            </span>
                            <span className={`status-pill status-${a.status}`}>
                                {a.status}
                            </span>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="admin-search-empty">
                            <h3>Записей нет</h3>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
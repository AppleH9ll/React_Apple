import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminAppointments() {
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setItems(await api.appointments());
        } catch (err) {
            setError(err.message);
        }
    }

    async function remove(id) {
        if (!confirm('Удалить запись?')) return;
        try {
            await api.deleteAppointment(id);
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    return (
        <section className="admin-section">
            <h1>Заказы</h1>
            {error && <div className="admin-message error">{error}</div>}
            <div className="admin-table">
                {items.map(a => (
                    <div className="admin-table-row admin-table-row-appt" key={a.appointment_id}>
                        <span className="admin-cell-strong">{a.email}</span>
                        <span>{a.service_name}</span>
                        <span>{new Date(a.appointment_date).toLocaleString('ru-RU')}</span>
                        <div className="admin-row-actions">
                            <button className="btn-delete" onClick={() => remove(a.appointment_id)}>Удалить</button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
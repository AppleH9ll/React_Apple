import { useEffect, useState } from 'react';
import { api } from '../api/api';

export default function AdminRoles() {
    const [roles, setRoles] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.roles().then(setRoles).catch(err => setError(err.message));
    }, []);

    return (
        <section className="admin-section">
            <h1>Роли пользователей</h1>
            {error && <div className="admin-message error">{error}</div>}
            <div className="admin-table">
                {roles.map(r => (
                    <div key={r.role_name} className="admin-table-row">
                        <span className="admin-cell-strong">{r.role_name}</span>
                        <span className="admin-cell-muted">{r.description || '—'}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
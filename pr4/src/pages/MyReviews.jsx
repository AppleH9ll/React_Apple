import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/api';
import { getServiceImage } from '../utils/serviceImages';

export default function MyReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ rating: 5, comment: '' });
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            setLoading(true);
            setError('');
            setReviews(await api.myReviews());
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    function showMsg(type, text) {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    }

    function startEdit(r) {
        setEditingId(r.review_id);
        setEditForm({ rating: r.rating, comment: r.comment });
    }

    function cancelEdit() {
        setEditingId(null);
        setEditForm({ rating: 5, comment: '' });
    }

    async function handleSave(reviewId) {
        if (editForm.comment.trim().length < 5) {
            showMsg('error', 'Комментарий слишком короткий');
            return;
        }
        try {
            setSaving(true);
            await api.updateReview(reviewId, editForm.rating, editForm.comment.trim());
            await load();
            setEditingId(null);
            showMsg('success', 'Отзыв обновлён');
        } catch (err) {
            showMsg('error', err.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="state">Загрузка отзывов...</div>;

    if (error) {
        return (
            <div className="empty-state">
                <h2>Не удалось загрузить отзывы</h2>
                <p>{error}</p>
                <button className="btn-primary" onClick={load}>Попробовать снова</button>
            </div>
        );
    }

    return (
        <div className="my-reviews-page">
            <div className="page-title">
                <div>
                    <h1>Мои отзывы</h1>
                    <p>Все отзывы, которые вы оставили на товары</p>
                </div>
            </div>

            {message.text && (
                <div className={`admin-message ${message.type}`}>{message.text}</div>
            )}

            {reviews.length === 0 && (
                <div className="empty-state">
                    <h3>У вас пока нет отзывов</h3>
                    <p className="empty-hint">Перейдите в каталог и поделитесь впечатлением о товаре</p>
                    <Link to="/" className="btn-primary">В каталог</Link>
                </div>
            )}

            <div className="my-reviews-list">
                {reviews.map(r => {
                    const isEditing = editingId === r.review_id;
                    const imgSrc = r.image_url || `https://placehold.co/100x100?text=${encodeURIComponent(r.service_name)}`;

                    return (
                        <div key={r.review_id} className="my-review-card">
                            <Link to={`/service/${r.service_slug}`} className="my-review-product">
                                <img
                                    src={imgSrc}
                                    alt={r.service_name}
                                    onError={(e) => {
                                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 80 80%22%3E%3Crect fill=%22%23e0e0e0%22 width=%2280%22 height=%2280%22/%3E%3C/svg%3E';
                                    }}
                                />
                                <div>
                                    <div className="my-review-product-name">{r.service_name}</div>
                                    <div className="my-review-date">
                                        {new Date(r.created_at).toLocaleDateString('ru-RU')}
                                        {r.updated_at && ' · изменён'}
                                    </div>
                                </div>
                            </Link>

                            {r.deleted_by_admin ? (
                                <div className="my-review-deleted">
                                    <strong>Отзыв удалён администратором</strong>
                                    {r.deleted_reason && <p>Причина: {r.deleted_reason}</p>}
                                </div>
                            ) : isEditing ? (
                                <div className="my-review-edit">
                                    <label>Оценка</label>
                                    <select
                                        value={editForm.rating}
                                        onChange={(e) => setEditForm({ ...editForm, rating: Number(e.target.value) })}
                                    >
                                        {[5, 4, 3, 2, 1].map(n => (
                                            <option key={n} value={n}>{n} ★</option>
                                        ))}
                                    </select>

                                    <label>Комментарий</label>
                                    <textarea
                                        rows={3}
                                        value={editForm.comment}
                                        onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                                    />

                                    <div className="my-review-edit-actions">
                                        <button
                                            className="btn-save"
                                            onClick={() => handleSave(r.review_id)}
                                            disabled={saving}
                                        >
                                            {saving ? 'Сохранение...' : 'Сохранить'}
                                        </button>
                                        <button className="btn-cancel" onClick={cancelEdit}>
                                            Отмена
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="my-review-rating">
                                        {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                                    </div>
                                    <p className="my-review-text">{r.comment}</p>
                                    <div className="my-review-actions">
                                        <button className="btn-edit" onClick={() => startEdit(r)}>
                                            Редактировать
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
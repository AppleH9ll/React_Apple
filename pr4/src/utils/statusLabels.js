// Перевод статусов заказа на русский язык
export function statusLabel(status) {
    const map = {
        pending:   'Ожидает оплаты',
        paid:      'Оплачен',
        shipped:   'Отправлен',
        done:      'Доставлен',
        cancelled: 'Отменён',
    };
    return map[status] || status;
}

// Цветовая схема для каждого статуса (опционально)
export function statusClass(status) {
    const map = {
        pending:   'pending',
        paid:      'paid',
        shipped:   'shipped',
        done:      'done',
        cancelled: 'cancelled',
    };
    return map[status] || 'pending';
}
/**
 * Возвращает URL картинки для товара.
 * 1. Если в БД задан image_url — используем его.
 * 2. Иначе — генерируем заглушку с названием товара.
 */
export function getServiceImage(service) {
    if (service?.image_url && service.image_url.trim() !== '') {
        return service.image_url;
    }
    const name = service?.service_name || 'Товар';
    return `https://placehold.co/400x300/1E3C72/FFFFFF?text=${encodeURIComponent(name)}`;
}
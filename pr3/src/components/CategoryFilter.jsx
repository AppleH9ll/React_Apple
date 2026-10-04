function CategoryFilter({ categories, selectedCategories, onCategoryChange }) {
    function toggle(id) {
        if (selectedCategories.includes(id)) {
            onCategoryChange(selectedCategories.filter(x => x !== id));
        } else {
            onCategoryChange([...selectedCategories, id]);
        }
    }

    return (
        <div className="category-filter">
            <h3>Категории</h3>
            <label className="check-row">
                <input
                    type="checkbox"
                    checked={selectedCategories.length === 0}
                    onChange={() => onCategoryChange([])}
                />
                Все категории
            </label>
            {categories.map(c => (
                <label className="check-row" key={c.category_id}>
                    <input
                        type="checkbox"
                        checked={selectedCategories.includes(c.category_id)}
                        onChange={() => toggle(c.category_id)}
                    />
                    {c.category_name}
                </label>
            ))}
        </div>
    );
}

export default CategoryFilter;
function CategoryFilter({ categories, selectedCategories, onCategoryChange }) {
    function toggle(slug) {
        if (selectedCategories.includes(slug)) {
            onCategoryChange(selectedCategories.filter(x => x !== slug));
        } else {
            onCategoryChange([...selectedCategories, slug]);
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
                <label className="check-row" key={c.slug}>
                    <input
                        type="checkbox"
                        checked={selectedCategories.includes(c.slug)}
                        onChange={() => toggle(c.slug)}
                    />
                    {c.category_name}
                </label>
            ))}
        </div>
    );
}

export default CategoryFilter;
export function useRevisionSelection(items = [], onChangeItems) {
    const isSelected = (key) => items.some((item) => item.key === key);

    const getNote = (key) => items.find((item) => item.key === key)?.note || '';

    const toggleItem = (key, label) => {
        if (!onChangeItems || !key) return;
        if (isSelected(key)) {
            onChangeItems(items.filter((item) => item.key !== key));
        } else {
            onChangeItems([...items, { key, label: label || key, note: '' }]);
        }
    };

    const updateItemNote = (key, note) => {
        if (!onChangeItems) return;
        onChangeItems(
            items.map((item) => (item.key === key ? { ...item, note } : item))
        );
    };

    const addCustomItem = (rawLabel) => {
        const trimmed = String(rawLabel || '').trim();
        if (!trimmed || !onChangeItems) return false;

        const slug = trimmed
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 32);

        const uniqueKey = `custom_${slug || 'item'}_${Date.now().toString(36).slice(-4)}`;
        onChangeItems([...items, { key: uniqueKey, label: trimmed, note: '' }]);
        return true;
    };

    const removeItem = (key) => {
        if (!onChangeItems) return;
        onChangeItems(items.filter((item) => item.key !== key));
    };

    return {
        isSelected,
        getNote,
        toggleItem,
        updateItemNote,
        addCustomItem,
        removeItem,
    };
}

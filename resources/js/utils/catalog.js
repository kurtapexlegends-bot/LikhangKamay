export const STANDARD_PRODUCT_CATEGORIES = [
    "Tableware",
    "Drinkware",
    "Vases & Jars",
    "Planters & Pots",
    "Home Decor",
    "Kitchenware",
    "Artisan Sets",
];

export const PRODUCT_MANAGER_VIEW_KEY = "seller-product-manager-view";

export function readStoredProductManagerView() {
    if (typeof window === "undefined") {
        return null;
    }
    try {
        const parsed = JSON.parse(
            window.localStorage.getItem(PRODUCT_MANAGER_VIEW_KEY) || "null",
        );
        if (!parsed || typeof parsed !== "object") {
            return null;
        }
        return {
            activeTab: typeof parsed.activeTab === "string" ? parsed.activeTab : "All",
            searchQuery: typeof parsed.searchQuery === "string" ? parsed.searchQuery : "",
            quickFilter: typeof parsed.quickFilter === "string" ? parsed.quickFilter : "all",
            sortConfig: {
                key: typeof parsed?.sortConfig?.key === "string" ? parsed.sortConfig.key : "name",
                direction: parsed?.sortConfig?.direction === "desc" ? "desc" : "asc",
            },
        };
    } catch {
        return null;
    }
}

/**
 * Format product sold count to a compact string (e.g. 1.2k).
 * 
 * @param {number|string} sold
 * @returns {string}
 */
export const formatSold = (sold) => {
    const soldNum = typeof sold === 'string' ? parseInt(sold, 10) : sold;
    if (soldNum >= 1000) return `${(soldNum / 1000).toFixed(1)}k`;
    return soldNum?.toString() || '0';
};


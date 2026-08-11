import { useState, useMemo, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import { PRODUCT_MANAGER_VIEW_KEY } from "@/utils/catalog";

export default function useProductFiltersState({
    dbProducts = {},
    urlFilters = {},
    storedView = {},
} = {}) {
    const safeUrlFilters = urlFilters || {};
    const safeDbProducts = dbProducts || {};
    const safeStoredView = storedView || {};

    const [activeTab, setActiveTab] = useState(safeStoredView.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(safeUrlFilters.search || safeStoredView.searchQuery || "");
    const [quickFilter, setQuickFilter] = useState(safeStoredView.quickFilter || "all");
    const [sortConfig, setSortConfig] = useState(
        safeStoredView.sortConfig || { key: "name", direction: "asc" },
    );
    const [currentPage, setCurrentPage] = useState(1);

    // Sync search from URL
    useEffect(() => {
        if (safeUrlFilters.search && safeUrlFilters.search !== searchQuery) {
            setSearchQuery(safeUrlFilters.search);
        }
    }, [safeUrlFilters.search]);

    const totalPages = safeDbProducts.last_page || 1;
    const totalItems = safeDbProducts.total || 0;
    const itemsPerPage = safeDbProducts.per_page || 20;

    useEffect(() => {
        if (safeDbProducts.current_page) {
            setCurrentPage(safeDbProducts.current_page);
        }
    }, [safeDbProducts.current_page]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(
            PRODUCT_MANAGER_VIEW_KEY,
            JSON.stringify({ activeTab, searchQuery, quickFilter, sortConfig }),
        );
    }, [activeTab, searchQuery, quickFilter, sortConfig]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    const searchTimeoutRef = useRef(null);

    const updateFilters = (newFilters) => {
        const queryParams = {
            search: newFilters.hasOwnProperty('search') ? newFilters.search : searchQuery,
            status: activeTab,
            sort_key: sortConfig.key,
            sort_dir: sortConfig.direction,
            page: 1,
            ...newFilters,
        };
        router.get(route("products.index"), queryParams, {
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            only: ["products", "filters"],
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        updateFilters({ status: tab });
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (!query || query.trim() === "") {
            updateFilters({ search: "" });
        } else {
            searchTimeoutRef.current = setTimeout(() => {
                updateFilters({ search: query });
            }, 300);
        }
    };

    const requestSort = (key) => {
        let direction = "asc";
        if (sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        const newSort = { key, direction };
        setSortConfig(newSort);
        updateFilters({ sort_key: key, sort_dir: direction });
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        router.get(route("products.index"), {
            search: searchQuery,
            status: activeTab,
            sort_key: sortConfig.key,
            sort_dir: sortConfig.direction,
            page: page
        }, {
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            only: ["products", "filters"],
        });
    };

    const applyQuickFilter = (filterKey, nextTab = activeTab) => {
        setQuickFilter(filterKey);
        setActiveTab(nextTab);
        setSearchQuery("");
        setCurrentPage(1);
    };

    const resetSavedView = () => {
        setActiveTab("All");
        setSearchQuery("");
        setQuickFilter("all");
        setSortConfig({ key: "name", direction: "asc" });
        setCurrentPage(1);

        router.get(route("products.index"), {}, {
            preserveState: false,
            preserveScroll: true,
        });
    };

    return {
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        quickFilter,
        setQuickFilter,
        sortConfig,
        setSortConfig,
        currentPage,
        setCurrentPage,
        totalPages,
        totalItems,
        itemsPerPage,
        handleTabChange,
        handleSearch,
        requestSort,
        handlePageChange,
        applyQuickFilter,
        resetSavedView,
    };
}

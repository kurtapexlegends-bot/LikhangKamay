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

    const initialStatus = safeUrlFilters.status ?? safeStoredView.activeTab ?? "All";
    const initialSearch = safeUrlFilters.search ?? safeStoredView.searchQuery ?? "";
    const initialQuickFilter = safeUrlFilters.quick_filter ?? safeStoredView.quickFilter ?? "all";
    const initialSort = safeUrlFilters.sort_key
        ? { key: safeUrlFilters.sort_key, direction: safeUrlFilters.sort_dir || "asc" }
        : (safeStoredView.sortConfig || { key: "name", direction: "asc" });

    const [activeTab, setActiveTab] = useState(initialStatus);
    const [searchQuery, setSearchQuery] = useState(initialSearch);
    const [quickFilter, setQuickFilter] = useState(initialQuickFilter);
    const [sortConfig, setSortConfig] = useState(initialSort);
    const [currentPage, setCurrentPage] = useState(1);

    // Sync state from URL filters
    useEffect(() => {
        if (safeUrlFilters.status && safeUrlFilters.status !== activeTab) {
            setActiveTab(safeUrlFilters.status);
        }
        if (safeUrlFilters.quick_filter && safeUrlFilters.quick_filter !== quickFilter) {
            setQuickFilter(safeUrlFilters.quick_filter);
        }
        if (safeUrlFilters.search !== undefined && safeUrlFilters.search !== searchQuery) {
            setSearchQuery(safeUrlFilters.search);
        }
        if (safeUrlFilters.sort_key && (safeUrlFilters.sort_key !== sortConfig.key || safeUrlFilters.sort_dir !== sortConfig.direction)) {
            setSortConfig({
                key: safeUrlFilters.sort_key,
                direction: safeUrlFilters.sort_dir || "asc",
            });
        }
    }, [safeUrlFilters.status, safeUrlFilters.quick_filter, safeUrlFilters.search, safeUrlFilters.sort_key, safeUrlFilters.sort_dir]);

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
            search: Object.prototype.hasOwnProperty.call(newFilters, 'search') ? newFilters.search : searchQuery,
            status: Object.prototype.hasOwnProperty.call(newFilters, 'status') ? newFilters.status : activeTab,
            quick_filter: Object.prototype.hasOwnProperty.call(newFilters, 'quick_filter') ? newFilters.quick_filter : quickFilter,
            sort_key: Object.prototype.hasOwnProperty.call(newFilters, 'sort_key') ? newFilters.sort_key : sortConfig.key,
            sort_dir: Object.prototype.hasOwnProperty.call(newFilters, 'sort_dir') ? newFilters.sort_dir : sortConfig.direction,
            page: 1,
            ...newFilters,
        };
        router.get(route("products.index"), queryParams, {
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            only: ["products", "filters", "metrics", "subscription"],
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setQuickFilter("all");
        updateFilters({ status: tab, quick_filter: "all", page: 1 });
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
            quick_filter: quickFilter,
            sort_key: sortConfig.key,
            sort_dir: sortConfig.direction,
            page: page
        }, {
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            only: ["products", "filters", "metrics", "subscription"],
        });
    };

    const applyQuickFilter = (filterKey, nextTab = activeTab) => {
        setQuickFilter(filterKey);
        setActiveTab(nextTab);
        setSearchQuery("");
        setCurrentPage(1);
        updateFilters({ status: nextTab, quick_filter: filterKey, search: "", page: 1 });
    };

    const resetSavedView = () => {
        setActiveTab("All");
        setSearchQuery("");
        setQuickFilter("all");
        setSortConfig({ key: "name", direction: "asc" });
        setCurrentPage(1);

        router.get(route("products.index"), {
            status: "All",
            quick_filter: "all",
            page: 1,
        }, {
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

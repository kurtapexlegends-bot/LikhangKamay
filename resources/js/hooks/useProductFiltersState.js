import { useState, useMemo, useEffect } from "react";
import { router } from "@inertiajs/react";
import { PRODUCT_MANAGER_VIEW_KEY } from "@/utils/catalog";

export default function useProductFiltersState({
    dbProducts,
    urlFilters,
    storedView,
}) {
    const [activeTab, setActiveTab] = useState(storedView?.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(urlFilters.search || storedView?.searchQuery || "");
    const [quickFilter, setQuickFilter] = useState(storedView?.quickFilter || "all");
    const [sortConfig, setSortConfig] = useState(
        storedView?.sortConfig || { key: "name", direction: "asc" },
    );
    const [currentPage, setCurrentPage] = useState(1);

    // Sync search from URL
    useEffect(() => {
        if (urlFilters.search && urlFilters.search !== searchQuery) {
            setSearchQuery(urlFilters.search);
        }
    }, [urlFilters.search]);

    const totalPages = dbProducts.last_page || 1;
    const totalItems = dbProducts.total || 0;
    const itemsPerPage = dbProducts.per_page || 20;

    useEffect(() => {
        if (dbProducts.current_page) {
            setCurrentPage(dbProducts.current_page);
        }
    }, [dbProducts.current_page]);

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

    const updateFilters = (newFilters) => {
        const queryParams = {
            search: searchQuery,
            status: activeTab,
            sort_key: sortConfig.key,
            sort_dir: sortConfig.direction,
            page: 1,
            ...newFilters,
        };
        router.get(route("products.index"), queryParams, {
            preserveState: true,
            preserveScroll: true,
            only: ["products"],
        });
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        updateFilters({ status: tab });
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        updateFilters({ search: query });
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
            only: ["products"],
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

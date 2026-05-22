import { useState, useEffect } from "react";
import { router } from "@inertiajs/react";

const ORDER_MANAGER_VIEW_KEY = "seller-order-manager-view";

const readStoredOrderManagerView = () => {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const parsed = JSON.parse(
            window.localStorage.getItem(ORDER_MANAGER_VIEW_KEY) || "null",
        );

        if (!parsed || typeof parsed !== "object") {
            return null;
        }

        return {
            activeTab:
                typeof parsed.activeTab === "string" ? parsed.activeTab : "All",
            searchQuery:
                typeof parsed.searchQuery === "string"
                    ? parsed.searchQuery
                    : "",
            quickFilter:
                typeof parsed.quickFilter === "string"
                    ? parsed.quickFilter
                    : "all",
            dateRange: {
                start:
                    typeof parsed?.dateRange?.start === "string"
                        ? parsed.dateRange.start
                        : "",
                end:
                    typeof parsed?.dateRange?.end === "string"
                        ? parsed.dateRange.end
                        : "",
            },
        };
    } catch {
        return null;
    }
};

export default function useOrderFilters(filters = {}) {
    const storedView = readStoredOrderManagerView();

    const [activeTab, setActiveTab] = useState(storedView?.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(
        filters.search || storedView?.searchQuery || "",
    );
    const [quickFilter, setQuickFilter] = useState(
        storedView?.quickFilter || "all",
    );
    const [dateRange, setDateRange] = useState(
        storedView?.dateRange || { start: "", end: "" },
    );
    const [currentPage, setCurrentPage] = useState(1);

    // Sync search from URL (for Global Search support)
    useEffect(() => {
        if (filters.search && filters.search !== searchQuery) {
            setSearchQuery(filters.search);
        }
    }, [filters.search]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        window.localStorage.setItem(
            ORDER_MANAGER_VIEW_KEY,
            JSON.stringify({ activeTab, searchQuery, quickFilter, dateRange }),
        );
    }, [activeTab, searchQuery, quickFilter, dateRange]);

    const updateFilters = (newFilters) => {
        const queryParams = {
            search: searchQuery,
            status: activeTab,
            page: 1, // Reset to page 1 on filter change
            ...newFilters,
        };

        router.get(route("orders.index"), queryParams, {
            preserveState: true,
            preserveScroll: true,
            only: ["orders"],
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

    const applyQuickFilter = (qf, tab = "All") => {
        setQuickFilter(qf);
        setActiveTab(tab);
        updateFilters({ status: tab, quick_filter: qf });
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        router.get(route("orders.index"), {
            search: searchQuery,
            status: activeTab,
            page: page
        }, {
            preserveState: true,
            preserveScroll: true,
            only: ["orders"],
        });
    };

    return {
        activeTab,
        searchQuery,
        quickFilter,
        dateRange,
        currentPage,
        setCurrentPage,
        handleTabChange,
        handleSearch,
        applyQuickFilter,
        handlePageChange,
    };
}

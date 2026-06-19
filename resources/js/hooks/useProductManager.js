import { useState, useMemo, useEffect } from "react";
import { router, usePage } from "@inertiajs/react";
import { useToast } from "@/Components/ToastContext";
import useSellerModuleAccess from "@/hooks/useSellerModuleAccess";
import {
    STANDARD_PRODUCT_CATEGORIES,
    readStoredProductManagerView,
} from "@/utils/catalog";

// Modular state hooks
import useProductModalsState from "@/hooks/useProductModalsState";
import useProductFiltersState from "@/hooks/useProductFiltersState";
import useProductFormState from "@/hooks/useProductFormState";

export default function useProductManager({
    products: dbProducts = [],
    categories: serverCategories = [],
    supplies = [],
    subscription,
    metrics = {},
}) {
    const { canEdit: canEditProducts, isReadOnly: isProductsReadOnly } =
        useSellerModuleAccess("products");
    
    const paginatedProducts = dbProducts?.data || (Array.isArray(dbProducts) ? dbProducts : []);
    const [products, setProducts] = useState(paginatedProducts);

    useEffect(() => {
        setProducts(paginatedProducts);
    }, [dbProducts]);

    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const storedView = readStoredProductManagerView();

    const categories = useMemo(
        () =>
            Array.isArray(serverCategories) && serverCategories.length > 0
                ? serverCategories
                : STANDARD_PRODUCT_CATEGORIES,
        [serverCategories],
    );
    const defaultCategory = categories[0] || STANDARD_PRODUCT_CATEGORIES[0];

    const { flash, filters = {} } = usePage().props;
    const { addToast } = useToast();

    // Flash Messages
    useEffect(() => {
        if (flash.success) addToast(flash.success, "success");
        if (flash.error) addToast(flash.error, "error");
    }, [flash]);

    // Monitor screen width for mobile/tablet responsive behaviors
    const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const checkScreen = () => setIsMobileOrTablet(window.innerWidth < 768);
        checkScreen();
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);
    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // 1. Modal State Hook
    const modalsState = useProductModalsState({
        canEditProducts,
        subscription,
        addToast,
        resetForm: () => formState.reset(),
        clearFormErrors: () => formState.clearErrors(),
        resetDeductForm: () => formState.deductForm.reset(),
        resetResubmitForm: () => formState.resubmitForm.reset(),
        clearResubmitFormErrors: () => formState.resubmitForm.clearErrors(),
    });

    const {
        productModalOpen,
        setProductModalOpen,
        activeFormTab,
        setActiveFormTab,
        restockModalOpen,
        setRestockModalOpen,
        archiveModalOpen,
        setArchiveModalOpen,
        limitModalOpen,
        setLimitModalOpen,
        deductModalOpen,
        setDeductModalOpen,
        resubmitModalOpen,
        setResubmitModalOpen,
        selectedProduct,
        setSelectedProduct,
        selectedResubmitProduct,
        setSelectedResubmitProduct,
        restockAmount,
        setRestockAmount,
        openRestockModal,
        openArchiveModal,
        openDeductModal,
        openResubmitModal,
        closeResubmitModal,
        confirmRestock,
        confirmArchive,
    } = modalsState;

    // 2. Filters State Hook
    const filtersState = useProductFiltersState({
        dbProducts,
        urlFilters: filters,
        storedView,
    });

    const {
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
    } = filtersState;

    // 3. Form State Hook
    const formState = useProductFormState({
        canEditProducts,
        defaultCategory,
        categories,
        subscription,
        addToast,
        setLimitModalOpen,
        setProductModalOpen,
        setDeductModalOpen,
        setResubmitModalOpen,
        selectedProduct,
        setSelectedProduct,
        selectedResubmitProduct,
        setSelectedResubmitProduct,
        setActiveFormTab,
    });

    const {
        productForm,
        deductForm,
        resubmitForm,
        data,
        setData,
        processing,
        errors,
        reset,
        clearErrors,
        previews,
        skuValidation,
        activationReadiness,
        openAddModal,
        openEditModal,
        closeProductModal,
        handleFileChange,
        handleModelAssetFolderChange,
        handleRemoveGalleryImage,
        submitProduct,
        handleStatusChange,
        addRecipeItem,
        removeRecipeItem,
        updateRecipeItem,
        handleDeduct,
        submitResubmission,
        shouldValidateSku,
        hasThreeDReady,
    } = formState;

    const visibleProductIds = useMemo(
        () => paginatedProducts.map((product) => product.id),
        [paginatedProducts],
    );

    const allVisibleSelected =
        visibleProductIds.length > 0 &&
        visibleProductIds.every((id) => selectedProductIds.includes(id));

    const incompleteDraftCount = metrics.incompleteDraftCount || 0;
    const lowStockCount = metrics.lowStockCount || 0;

    const remainingActivationSlots = useMemo(() => {
        return Math.max(0, (subscription?.limit || 0) - (subscription?.activeCount || 0));
    }, [subscription?.limit, subscription?.activeCount]);

    useEffect(() => {
        const validIds = new Set((products || []).map((product) => product.id));
        setSelectedProductIds((current) => current.filter((id) => validIds.has(id)));
    }, [products]);

    const toggleProductSelection = (productId) => {
        setSelectedProductIds((current) =>
            current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId],
        );
    };

    const toggleVisibleSelection = () => {
        setSelectedProductIds((current) => {
            if (allVisibleSelected) {
                return current.filter((id) => !visibleProductIds.includes(id));
            }
            return Array.from(new Set([...current, ...visibleProductIds]));
        });
    };

    const selectVisibleProducts = () => {
        if (!visibleProductIds.length) return;
        setSelectedProductIds((current) => Array.from(new Set([...current, ...visibleProductIds])));
    };

    const runBulkStatusUpdate = (status) => {
        if (!canEditProducts) return;
        if (!selectedProductIds.length) {
            addToast("Select at least one product first.", "info");
            return;
        }
        router.post(
            route("products.bulk-status"),
            { ids: selectedProductIds, status },
            {
                preserveScroll: true,
                onSuccess: () => setSelectedProductIds([]),
            },
        );
    };

    const handleQuickRestock = (product, amount) => {
        if (!canEditProducts) return;
        router.post(
            route("products.restock", product.id),
            { amount },
            {
                preserveScroll: true,
                onSuccess: () => {
                    addToast(`Restocked ${amount} units for ${product.name}`, "success");
                },
            }
        );
    };

    return {
        products,
        selectedProductIds,
        setSelectedProductIds,
        categories,
        defaultCategory,
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
        productModalOpen,
        setProductModalOpen,
        activeFormTab,
        setActiveFormTab,
        restockModalOpen,
        setRestockModalOpen,
        archiveModalOpen,
        setArchiveModalOpen,
        limitModalOpen,
        setLimitModalOpen,
        deductModalOpen,
        setDeductModalOpen,
        selectedProduct,
        setSelectedProduct,
        restockAmount,
        setRestockAmount,
        shouldAnimateKPI,
        isMobileOrTablet,
        data,
        setData,
        processing,
        errors,
        reset,
        clearErrors,
        deductForm,
        shouldValidateSku,
        skuValidation,
        previews,
        hasThreeDReady,
        activationReadiness,
        totalPages,
        totalItems,
        itemsPerPage,
        visibleProductIds,
        allVisibleSelected,
        incompleteDraftCount,
        lowStockCount,
        remainingActivationSlots,
        openAddModal,
        openEditModal,
        closeProductModal,
        handleFileChange,
        handleModelAssetFolderChange,
        handleRemoveGalleryImage,
        submitProduct,
        handleStatusChange,
        confirmRestock,
        addRecipeItem,
        removeRecipeItem,
        updateRecipeItem,
        confirmArchive,
        openRestockModal,
        openArchiveModal,
        openDeductModal,
        toggleProductSelection,
        toggleVisibleSelection,
        applyQuickFilter,
        resetSavedView,
        selectVisibleProducts,
        runBulkStatusUpdate,
        handleDeduct,
        handleQuickRestock,
        handleTabChange,
        handleSearch,
        requestSort,
        handlePageChange,
        canEditProducts,
        isProductsReadOnly,
        resubmitModalOpen,
        setResubmitModalOpen,
        selectedResubmitProduct,
        resubmitForm,
        openResubmitModal,
        closeResubmitModal,
        submitResubmission,
    };
}

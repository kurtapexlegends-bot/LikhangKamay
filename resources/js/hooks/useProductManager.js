import { useState, useMemo, useEffect } from "react";
import { useForm, router, usePage } from "@inertiajs/react";
import { useToast } from "@/Components/ToastContext";
import useSellerModuleAccess from "@/hooks/useSellerModuleAccess";
import useConstraintValidation from "@/hooks/useConstraintValidation";
import {
    STANDARD_PRODUCT_CATEGORIES,
    PRODUCT_MANAGER_VIEW_KEY,
    readStoredProductManagerView,
} from "@/utils/catalog";

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
    const [activeTab, setActiveTab] = useState(storedView?.activeTab || "All");
    const [searchQuery, setSearchQuery] = useState(filters.search || storedView?.searchQuery || "");
    const [quickFilter, setQuickFilter] = useState(storedView?.quickFilter || "all");
    const [sortConfig, setSortConfig] = useState(
        storedView?.sortConfig || { key: "name", direction: "asc" },
    );
    const [currentPage, setCurrentPage] = useState(1);
    const { addToast } = useToast();

    // Sync search from URL (for Global Search support)
    useEffect(() => {
        if (filters.search && filters.search !== searchQuery) {
            setSearchQuery(filters.search);
        }
    }, [filters.search]);

    // Flash Messages
    useEffect(() => {
        if (flash.success) addToast(flash.success, "success");
        if (flash.error) addToast(flash.error, "error");
    }, [flash]);

    // Modals & Selection States
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [activeFormTab, setActiveFormTab] = useState("Essentials");
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [deductModalOpen, setDeductModalOpen] = useState(false);
    const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedResubmitProduct, setSelectedResubmitProduct] = useState(null);
    const [restockAmount, setRestockAmount] = useState("");
    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);

    // Monitor screen width for mobile/tablet responsive behaviors
    const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        const checkScreen = () => setIsMobileOrTablet(window.innerWidth < 768);
        checkScreen();
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    // Form setup for products
    const productForm = useForm({
        id: null,
        sku: "",
        name: "",
        description: "",
        category: defaultCategory,
        clay_type: "Stoneware",
        glaze_type: "Matte",
        firing_method: "Electric Kiln",
        food_safe: true,
        height: "",
        width: "",
        weight: "",
        price: "",
        cost_price: "",
        stock: "",
        lead_time: 3,
        status: "Active",
        cover_photo: null,
        gallery: [],
        model_3d: null,
        model_3d_assets: [],
        model_3d_asset_paths: [],
        model_3d_path: null,
        production_method: "resell",
        recipes: [],
        track_as_supply: false,
    });

    const deductForm = useForm({
        quantity: "",
        reason: "Physical Store Sale",
    });

    const resubmitForm = useForm({
        notes: "",
    });

    const { data, setData, post, processing, errors, reset, clearErrors } = productForm;

    const shouldValidateSku = !data.id || (selectedProduct && data.sku !== selectedProduct.sku);
    const skuValidation = useConstraintValidation(
        'sku_uniqueness', 
        data.sku, 
        { product_id: data.id }, 
        shouldValidateSku
    );

    const [previews, setPreviews] = useState({ cover: null, gallery: [] });
    const hasThreeDReady = Boolean(data.model_3d || data.model_3d_path);

    const activationReadiness = useMemo(() => {
        const galleryImageCount = previews.gallery.length;
        const items = [
            {
                key: "cover",
                label: "Cover image",
                detail: "Required main product photo",
                complete: Boolean(previews.cover),
            },
            {
                key: "gallery",
                label: "Gallery images",
                detail: `${galleryImageCount}/3-5 selected`,
                complete: galleryImageCount >= 3 && galleryImageCount <= 5,
            },
            {
                key: "model",
                label: "3D model",
                detail: hasThreeDReady ? "3D file ready" : "Upload .glb or .gltf",
                complete: hasThreeDReady,
            },
            {
                key: "cost",
                label: "Cost price",
                detail: data.cost_price ? "Cost recorded" : "Missing cost data",
                complete: Boolean(data.cost_price) && !isNaN(parseFloat(data.cost_price)),
            },
        ];

        return {
            canActivate: items.every((item) => item.complete),
            items,
            missingLabels: items.filter((item) => !item.complete).map((item) => item.label.toLowerCase()),
        };
    }, [previews.cover, previews.gallery.length, hasThreeDReady, data.cost_price]);

    const revokeBlobUrl = (url) => {
        if (typeof url === "string" && url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
        }
    };

    const cleanupPreviews = () => {
        revokeBlobUrl(previews.cover);
        (previews.gallery || []).forEach(revokeBlobUrl);
    };

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

    const totalPages = dbProducts.last_page || 1;
    const totalItems = dbProducts.total || 0;
    const itemsPerPage = dbProducts.per_page || 20;

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

    useEffect(() => {
        const validIds = new Set((products || []).map((product) => product.id));
        setSelectedProductIds((current) => current.filter((id) => validIds.has(id)));
    }, [products]);

    const generateSKU = () =>
        "LK-" +
        Math.floor(Math.random() * 0xffff)
            .toString(16)
            .toUpperCase()
            .padStart(4, "0");

    const openAddModal = () => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(null);
        reset();
        clearErrors();

        setPreviews({ cover: null, gallery: [] });
        setData({
            ...data,
            id: null,
            sku: generateSKU(),
            cost_price: "",
            category: defaultCategory,
            clay_type: "Stoneware",
            glaze_type: "Matte",
            firing_method: "Electric Kiln",
            status: "Draft",
            lead_time: 3,
            retained_gallery: [],
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            model_3d_path: null,
            track_as_supply: false,
            recipes: [],
        });
        setActiveFormTab("Essentials");
        setProductModalOpen(true);
    };

    const openEditModal = (product) => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(product);
        clearErrors();

        setData({
            ...product,
            category: categories.includes(product.category) ? product.category : defaultCategory,
            cost_price: product.cost_price || "",
            description: product.description || "",
            retained_gallery: product.gallery_paths || [],
            cover_photo: null,
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            status: product.model_3d_path || product.status !== "Active" ? product.status : "Draft",
            track_as_supply: product.track_as_supply || false,
            production_method: product.production_method || "resell",
            recipes: product.recipes || [],
        });
        setPreviews({
            cover: product.img,
            gallery: product.gallery_paths ? product.gallery_paths.map((path) => `/storage/${path}`) : [],
        });
        setActiveFormTab("Essentials");
        setProductModalOpen(true);
    };

    const closeProductModal = () => {
        cleanupPreviews();
        setProductModalOpen(false);
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (field === "gallery") {
            const files = Array.from(e.target.files);
            setData("gallery", [...(data.gallery || []), ...files]);
            setPreviews((prev) => ({
                ...prev,
                gallery: [...(prev.gallery || []), ...files.map((f) => URL.createObjectURL(f))],
            }));
        } else if (field === "cover_photo") {
            setData("cover_photo", file);
            if (previews.cover) revokeBlobUrl(previews.cover);
            setPreviews((prev) => ({
                ...prev,
                cover: file ? URL.createObjectURL(file) : null,
            }));
        } else if (field === "model_3d") {
            setData("model_3d", file);
            setData("model_3d_assets", []);
            setData("model_3d_asset_paths", []);
        } else {
            setData(field, file);
        }
    };

    const handleModelAssetFolderChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        const mainModelName = data.model_3d?.name || "";
        const normalizedFiles = selectedFiles
            .filter((file) => file.name !== mainModelName)
            .map((file) => ({
                file,
                relativePath: file.webkitRelativePath
                    ? file.webkitRelativePath.split(/[\\/]/).filter(Boolean).join("/")
                    : file.name,
            }))
            .filter(({ relativePath }) => Boolean(relativePath));

        setData("model_3d_assets", normalizedFiles.map(({ file }) => file));
        setData("model_3d_asset_paths", normalizedFiles.map(({ relativePath }) => relativePath));
        event.target.value = "";
    };

    const handleRemoveGalleryImage = (indexToRemove) => {
        const retainedCount = (data.retained_gallery || []).length;
        if (indexToRemove < retainedCount) {
            const updatedRetained = [...data.retained_gallery];
            updatedRetained.splice(indexToRemove, 1);
            setData("retained_gallery", updatedRetained);
        } else {
            const newFileIndex = indexToRemove - retainedCount;
            const updatedFiles = [...(data.gallery || [])];
            updatedFiles.splice(newFileIndex, 1);
            setData("gallery", updatedFiles);
        }
        setPreviews((prev) => {
            const updatedPreviews = [...prev.gallery];
            revokeBlobUrl(updatedPreviews[indexToRemove]);
            updatedPreviews.splice(indexToRemove, 1);
            return { ...prev, gallery: updatedPreviews };
        });
    };

    useEffect(() => {
        if (!activationReadiness.canActivate && data.status === "Active") {
            setData("status", "Draft");
        }
    }, [data.status, activationReadiness.canActivate]);

    useEffect(() => {
        return () => cleanupPreviews();
    }, []);

    const submitProduct = (e) => {
        e.preventDefault();
        if (!canEditProducts) return;

        if (data.status === "Active" && !activationReadiness.canActivate) {
            setActiveFormTab("Media");
            addToast(`Active products require ${activationReadiness.missingLabels.join(", ")}.`, "error");
            return;
        }

        const isAddingNewActive = !data.id && data.status === "Active";
        const isActivatingExisting = data.id && selectedProduct?.status !== "Active" && data.status === "Active";

        if ((isAddingNewActive || isActivatingExisting) && subscription?.activeCount >= subscription?.limit) {
            setLimitModalOpen(true);
            return;
        }

        const options = {
            onSuccess: () => {
                closeProductModal();
                reset();
            },
            onError: (err) => {
                console.error("Validation Failed:", err);
                if (err.limit) {
                    setLimitModalOpen(true);
                } else {
                    addToast("Failed to save product. Please check the form for errors.", "error");
                }
                const essentialsKeys = ["name", "category", "price", "stock"];
                const detailsKeys = ["clay_type", "glaze_type"];
                const mediaKeys = ["cover_photo", "model_3d"];

                if (essentialsKeys.some((k) => err[k])) setActiveFormTab("Essentials");
                else if (detailsKeys.some((k) => err[k])) setActiveFormTab("Details");
                else if (mediaKeys.some((k) => err[k])) setActiveFormTab("Media");
            },
            forceFormData: true,
        };

        if (data.id) {
            post(route("products.update", data.id), options);
        } else {
            post(route("products.store"), options);
        }
    };

    const handleStatusChange = (nextStatus) => {
        if (nextStatus === "Active" && !activationReadiness.canActivate) {
            addToast(`Add ${activationReadiness.missingLabels.join(", ")} before listing this product as Active.`, "info");
            return;
        }
        setData("status", nextStatus);
    };

    const confirmRestock = () => {
        if (!canEditProducts) return;
        if (restockAmount > 0) {
            router.post(
                route("products.restock", selectedProduct.id),
                { amount: restockAmount },
                {
                    onSuccess: () => {
                        setRestockModalOpen(false);
                    },
                },
            );
        }
    };

    const addRecipeItem = () => {
        setData("recipes", [
            ...data.recipes,
            { supply_id: "", quantity_required: 1 },
        ]);
    };

    const removeRecipeItem = (index) => {
        const updated = [...data.recipes];
        updated.splice(index, 1);
        setData("recipes", updated);
    };

    const updateRecipeItem = (index, field, value) => {
        const updated = [...data.recipes];
        updated[index][field] = value;
        setData("recipes", updated);
    };

    const confirmArchive = () => {
        if (!canEditProducts) return;
        if (selectedProduct.status === "Archived") {
            if (subscription?.activeCount >= subscription?.limit) {
                setArchiveModalOpen(false);
                setLimitModalOpen(true);
                return;
            }
            router.post(
                route("products.activate", selectedProduct.id),
                {},
                {
                    onSuccess: () => setArchiveModalOpen(false),
                },
            );
        } else {
            router.post(
                route("products.archive", selectedProduct.id),
                {},
                {
                    onSuccess: () => setArchiveModalOpen(false),
                },
            );
        }
    };

    const openRestockModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        setRestockAmount("");
        setRestockModalOpen(true);
    };

    const openArchiveModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        setArchiveModalOpen(true);
    };

    const openDeductModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        deductForm.reset();
        setDeductModalOpen(true);
    };

    const openResubmitModal = (p) => {
        if (!canEditProducts) return;
        setSelectedResubmitProduct(p);
        resubmitForm.setData("notes", "");
        resubmitForm.clearErrors();
        setResubmitModalOpen(true);
    };

    const closeResubmitModal = () => {
        setResubmitModalOpen(false);
        resubmitForm.reset();
    };

    const submitResubmission = (e) => {
        e?.preventDefault();
        resubmitForm.post(route("products.resubmit", selectedResubmitProduct.id), {
            preserveScroll: true,
            onSuccess: () => {
                setResubmitModalOpen(false);
                resubmitForm.reset();
            },
        });
    };

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

    const handleDeduct = (e) => {
        e.preventDefault();
        if (!canEditProducts) return;
        deductForm.post(route("products.deduct", selectedProduct.id), {
            onSuccess: () => {
                setDeductModalOpen(false);
                deductForm.reset();
            },
            onError: (err) => {
                console.error("Deduction Failed:", err);
                addToast("Failed to deduct stock", "error");
            },
        });
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

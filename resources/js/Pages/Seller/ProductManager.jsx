import React, { useState, useMemo, useEffect } from 'react';
import { Head, useForm, router, usePage, Link } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import Checkbox from '@/Components/Checkbox';
import CompactPagination from '@/Components/CompactPagination';
import External3DToolLink from '@/Components/External3DToolLink';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import ReadOnlyCapabilityNotice from '@/Components/ReadOnlyCapabilityNotice';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Components/SellerHeader';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import { 
    Package, Search, AlertCircle, Cuboid, 
    TrendingUp, X, Tag, Image as ImageIcon,
    AlertTriangle, ChevronUp, ChevronDown,
    MoreVertical, RotateCcw,
    Check, CheckCircle, Plus, Edit3, RefreshCw, Archive, Crown
} from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, color, bg }) => (
    <div className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-colors hover:border-stone-300">
        <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-stone-400">{title}</p>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h3>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color}`}>
            <Icon size={20} />
        </div>
    </div>
);

// --- HELPER: SORTABLE HEADER ---
const SortableHeader = ({ label, sortKey, currentSort, onSort }) => {
    const isSorted = currentSort.key === sortKey;
    const isAsc = currentSort.direction === 'asc';
    
    return (
        <th 
            className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition group select-none" 
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-2 text-gray-600 font-bold text-xs uppercase tracking-wider">
                <span>{label}</span>
                <div className="flex flex-col -space-y-1.5">
                    <ChevronUp 
                        size={12} 
                        strokeWidth={4}
                        className={`transition-all ${isSorted && isAsc ? 'text-clay-600 opacity-100' : 'text-gray-300 opacity-50 group-hover:opacity-100'}`} 
                    />
                    <ChevronDown 
                        size={12} 
                        strokeWidth={4}
                        className={`transition-all ${isSorted && !isAsc ? 'text-clay-600 opacity-100' : 'text-gray-300 opacity-50 group-hover:opacity-100'}`} 
                    />
                </div>
            </div>
        </th>
    );
};

const STANDARD_PRODUCT_CATEGORIES = [
    'Tableware',
    'Drinkware',
    'Vases & Jars',
    'Planters & Pots',
    'Home Decor',
    'Kitchenware',
    'Artisan Sets',
];

const modalFieldClass = 'w-full mt-1 rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500';
const modalTextareaClass = `${modalFieldClass} min-h-[110px]`;
const modalCloseButtonClass = 'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:text-gray-700';
const PRODUCT_MANAGER_VIEW_KEY = 'seller-product-manager-view';

const readStoredProductManagerView = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const parsed = JSON.parse(window.localStorage.getItem(PRODUCT_MANAGER_VIEW_KEY) || 'null');

        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        return {
            activeTab: typeof parsed.activeTab === 'string' ? parsed.activeTab : 'All',
            searchQuery: typeof parsed.searchQuery === 'string' ? parsed.searchQuery : '',
            quickFilter: typeof parsed.quickFilter === 'string' ? parsed.quickFilter : 'all',
            sortConfig: {
                key: typeof parsed?.sortConfig?.key === 'string' ? parsed.sortConfig.key : 'name',
                direction: parsed?.sortConfig?.direction === 'desc' ? 'desc' : 'asc',
            },
        };
    } catch {
        return null;
    }
};

export default function ProductManager({ auth, products: dbProducts = [], categories: serverCategories = [], subscription }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const { canEdit: canEditProducts, isReadOnly: isProductsReadOnly } = useSellerModuleAccess('products');
    const [products, setProducts] = useState(dbProducts);
    useEffect(() => { setProducts(dbProducts); }, [dbProducts]);
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const storedView = readStoredProductManagerView();

    const categories = useMemo(() => (
        Array.isArray(serverCategories) && serverCategories.length > 0
            ? serverCategories
            : STANDARD_PRODUCT_CATEGORIES
    ), [serverCategories]);
    const defaultCategory = categories[0] || STANDARD_PRODUCT_CATEGORIES[0];

    const [activeTab, setActiveTab] = useState(storedView?.activeTab || 'All');
    const [searchQuery, setSearchQuery] = useState(storedView?.searchQuery || '');
    const [quickFilter, setQuickFilter] = useState(storedView?.quickFilter || 'all');
    const [sortConfig, setSortConfig] = useState(storedView?.sortConfig || { key: 'name', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    const { addToast } = useToast();

    // --- FLASH MESSAGE HANDLING ---
    const { flash } = usePage().props;

    useEffect(() => {
        if (flash.success) {
            addToast(flash.success, 'success');
        }
        if (flash.error) {
            addToast(flash.error, 'error');
        }
    }, [flash]);

    // --- MODAL STATES ---
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [restockModalOpen, setRestockModalOpen] = useState(false);
    const [archiveModalOpen, setArchiveModalOpen] = useState(false);
    const [limitModalOpen, setLimitModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [restockAmount, setRestockAmount] = useState('');
    const [activeFormTab, setActiveFormTab] = useState('Essentials');

    // --- FORM SETUP ---
    const { data, setData, post, processing, progress, errors, reset, clearErrors, hasErrors } = useForm({
        id: null,
        sku: '',
        name: '',
        description: '',
        category: defaultCategory,
        clay_type: 'Stoneware',
        glaze_type: 'Matte',
        firing_method: 'Electric Kiln',
        food_safe: true,
        height: '',
        width: '',
        weight: '',
        price: '',
        cost_price: '',
        stock: '',
        lead_time: 3,
        status: 'Active',
        cover_photo: null,
        gallery: [],
        model_3d: null,
        model_3d_assets: [],
        model_3d_asset_paths: [],
        model_3d_path: null,
    });

    // Deduction Form (Phase 1)
    const [deductModalOpen, setDeductModalOpen] = useState(false);
    const deductForm = useForm({
        quantity: '',
        reason: 'Physical Store Sale',
    });

    const [previews, setPreviews] = useState({ cover: null, gallery: [] });
    const hasThreeDReady = Boolean(data.model_3d || data.model_3d_path);
    const activationReadiness = useMemo(() => {
        const galleryImageCount = previews.gallery.length;
        const items = [
            {
                key: 'cover',
                label: 'Cover image',
                detail: 'Required main product photo',
                complete: Boolean(previews.cover),
            },
            {
                key: 'gallery',
                label: 'Gallery images',
                detail: `${galleryImageCount}/3-5 selected`,
                complete: galleryImageCount >= 3 && galleryImageCount <= 5,
            },
            {
                key: 'model',
                label: '3D model',
                detail: hasThreeDReady ? '3D file ready' : 'Upload .glb or .gltf',
                complete: hasThreeDReady,
            },
        ];

        return {
            canActivate: items.every((item) => item.complete),
            items,
            missingLabels: items.filter((item) => !item.complete).map((item) => item.label.toLowerCase()),
        };
    }, [previews.cover, previews.gallery.length, hasThreeDReady]);

    const revokeBlobUrl = (url) => {
        if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    };

    const cleanupPreviews = () => {
        revokeBlobUrl(previews.cover);
        (previews.gallery || []).forEach(revokeBlobUrl);
    };

    // --- SORT LOGIC ---
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const processedProducts = useMemo(() => {
        let result = [...products];

        // 1. Filter
        if (activeTab !== 'All') {
            if (activeTab === 'Low Stock') result = result.filter(p => p.stock < 10 && p.status !== 'Archived');
            else result = result.filter(p => p.status === activeTab);
        }

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p => 
                p.name.toLowerCase().includes(lowerQuery) || 
                p.category.toLowerCase().includes(lowerQuery) ||
                p.sku.toLowerCase().includes(lowerQuery)
            );
        }

        if (quickFilter !== 'all') {
            result = result.filter((product) => {
                const galleryCount = Array.isArray(product.gallery_paths) ? product.gallery_paths.length : 0;
                const isReady = Boolean(product.cover_photo_path)
                    && galleryCount >= 3
                    && galleryCount <= 5
                    && Boolean(product.model_3d_path);

                if (quickFilter === 'needs_readiness') {
                    return product.status !== 'Active' && !isReady;
                }

                if (quickFilter === 'ready_drafts') {
                    return product.status !== 'Active' && isReady;
                }

                return true;
            });
        }

        // 2. Sort
        if (sortConfig.key) {
            result.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();
                
                if (['price', 'stock', 'sold'].includes(sortConfig.key)) {
                    valA = parseFloat(valA) || 0;
                    valB = parseFloat(valB) || 0;
                }

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [products, activeTab, searchQuery, quickFilter, sortConfig]);

    const itemsPerPage = 8;
    const totalPages = Math.max(1, Math.ceil(processedProducts.length / itemsPerPage));
    const paginatedProducts = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return processedProducts.slice(startIndex, startIndex + itemsPerPage);
    }, [currentPage, processedProducts]);
    const visibleProductIds = useMemo(() => paginatedProducts.map((product) => product.id), [paginatedProducts]);
    const allVisibleSelected = visibleProductIds.length > 0 && visibleProductIds.every((id) => selectedProductIds.includes(id));
    const remainingActivationSlots = Math.max(0, Number(subscription?.limit || 0) - Number(subscription?.activeCount || 0));
    const incompleteDraftCount = useMemo(() => (
        products.filter((product) => {
            if (product.status === 'Active') {
                return false;
            }

            const galleryCount = Array.isArray(product.gallery_paths) ? product.gallery_paths.length : 0;

            return !product.cover_photo_path || galleryCount < 3 || galleryCount > 5 || !product.model_3d_path;
        }).length
    ), [products]);
    const lowStockCount = useMemo(() => products.filter((product) => product.stock < 10 && product.status !== 'Archived').length, [products]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, quickFilter, sortConfig]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(PRODUCT_MANAGER_VIEW_KEY, JSON.stringify({
            activeTab,
            searchQuery,
            quickFilter,
            sortConfig,
        }));
    }, [activeTab, searchQuery, quickFilter, sortConfig]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    useEffect(() => {
        const validIds = new Set(products.map((product) => product.id));
        setSelectedProductIds((current) => current.filter((id) => validIds.has(id)));
    }, [products]);

    // --- HANDLERS ---
    const generateSKU = () => 'LK-' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0');

    const openAddModal = () => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(null);
        reset(); 
        clearErrors();
        setActiveFormTab('Essentials');
        setPreviews({ cover: null, gallery: [] });
        setData({
            ...data,
            id: null,
            sku: generateSKU(),
            cost_price: '',
            category: defaultCategory,
            clay_type: 'Stoneware',
            glaze_type: 'Matte',
            firing_method: 'Electric Kiln',
            status: 'Draft',
            lead_time: 3,
            retained_gallery: [],
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            model_3d_path: null,
            track_as_supply: false,
        });
        setProductModalOpen(true);
    };

    const openEditModal = (product) => {
        if (!canEditProducts) return;
        cleanupPreviews();
        setSelectedProduct(product);
        clearErrors();
        setActiveFormTab('Essentials');
        setData({
            ...product,
            category: categories.includes(product.category) ? product.category : defaultCategory,
            cost_price: product.cost_price || '',
            description: product.description || '',
            retained_gallery: product.gallery_paths || [],
            cover_photo: null, 
            gallery: [],
            model_3d: null,
            model_3d_assets: [],
            model_3d_asset_paths: [],
            status: product.model_3d_path || product.status !== 'Active' ? product.status : 'Draft',
            track_as_supply: product.track_as_supply || false,
        });
        setPreviews({
            cover: product.img, 
            gallery: product.gallery_paths ? product.gallery_paths.map(path => `/storage/${path}`) : [] 
        });
        setProductModalOpen(true);
    };

    const closeProductModal = () => {
        cleanupPreviews();
        setProductModalOpen(false);
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (field === 'gallery') {
            const files = Array.from(e.target.files);
            // Append new files instead of replacing
            setData('gallery', [...(data.gallery || []), ...files]);
            // Append previews (can be blob URLs or existing string paths)
            setPreviews(prev => ({ 
                ...prev, 
                gallery: [...(prev.gallery || []), ...files.map(f => URL.createObjectURL(f))] 
            }));
        } else if (field === 'cover_photo') {
            setData('cover_photo', file);
            if (previews.cover) {
                revokeBlobUrl(previews.cover);
            }
            setPreviews(prev => ({ ...prev, cover: file ? URL.createObjectURL(file) : null }));
        } else if (field === 'model_3d') {
            setData('model_3d', file);
            setData('model_3d_assets', []);
            setData('model_3d_asset_paths', []);
        } else {
            setData(field, file);
        }
    };

    const handleModelAssetFolderChange = (event) => {
        const selectedFiles = Array.from(event.target.files || []);
        const mainModelName = data.model_3d?.name || '';
        const normalizedFiles = selectedFiles
            .filter((file) => file.name !== mainModelName)
            .map((file) => ({
                file,
                relativePath: (
                    file.webkitRelativePath
                        ? file.webkitRelativePath.split(/[\\/]/).filter(Boolean).join('/')
                        : file.name
                ) || file.name,
            }))
            .filter(({ relativePath }) => Boolean(relativePath));

        setData('model_3d_assets', normalizedFiles.map(({ file }) => file));
        setData('model_3d_asset_paths', normalizedFiles.map(({ relativePath }) => relativePath));
        event.target.value = '';
    };

    const handleRemoveGalleryImage = (indexToRemove) => {
        const retainedCount = (data.retained_gallery || []).length;
        
        if (indexToRemove < retainedCount) {
            // Remove from existing/retained images
            const updatedRetained = [...data.retained_gallery];
            updatedRetained.splice(indexToRemove, 1);
            setData('retained_gallery', updatedRetained);
        } else {
            // Remove from newly uploaded files
            const newFileIndex = indexToRemove - retainedCount;
            const updatedFiles = [...(data.gallery || [])];
            updatedFiles.splice(newFileIndex, 1);
            setData('gallery', updatedFiles);
        }

        // Remove from previews
        setPreviews(prev => {
            const updatedPreviews = [...prev.gallery];
            revokeBlobUrl(updatedPreviews[indexToRemove]);
            updatedPreviews.splice(indexToRemove, 1);
            return { ...prev, gallery: updatedPreviews };
        });
    };

    useEffect(() => {
        if (!activationReadiness.canActivate && data.status === 'Active') {
            setData('status', 'Draft');
        }
    }, [data.status, activationReadiness.canActivate]);

    useEffect(() => {
        return () => cleanupPreviews();
    }, []);

    // --- SUBMIT LOGIC ---
    const submitProduct = (e) => {
        e.preventDefault();
        if (!canEditProducts) return;

        if (data.status === 'Active' && !activationReadiness.canActivate) {
            setActiveFormTab('Media');
            addToast(`Active products require ${activationReadiness.missingLabels.join(', ')}.`, 'error');
            return;
        }
        
        // Frontend Limit Check
        const isAddingNewActive = !data.id && data.status === 'Active';
        const isActivatingExisting = data.id && selectedProduct?.status !== 'Active' && data.status === 'Active';

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
                    addToast('Failed to save product. Please check the form for errors.', 'error');
                }
                // Auto-switch to tab with error
                const essentialsKeys = ['name', 'category', 'price', 'stock'];
                const detailsKeys = ['clay_type', 'glaze_type'];
                const mediaKeys = ['cover_photo', 'model_3d'];

                if (essentialsKeys.some(k => err[k])) setActiveFormTab('Essentials');
                else if (detailsKeys.some(k => err[k])) setActiveFormTab('Details');
                else if (mediaKeys.some(k => err[k])) setActiveFormTab('Media');
            },
            forceFormData: true,
        };

        if (data.id) {
            post(route('products.update', data.id), options);
        } else {
            post(route('products.store'), options);
        }
    };

    const handleStatusChange = (nextStatus) => {
        if (nextStatus === 'Active' && !activationReadiness.canActivate) {
            setActiveFormTab('Media');
            addToast(`Add ${activationReadiness.missingLabels.join(', ')} before listing this product as Active.`, 'info');
            return;
        }

        setData('status', nextStatus);
    };

    const confirmRestock = () => { 
        if (!canEditProducts) return;
        if (restockAmount > 0) {
            router.post(route('products.restock', selectedProduct.id), { amount: restockAmount }, { 
                onSuccess: () => {
                    setRestockModalOpen(false);
                } 
            }); 
        }
    };
    
    const confirmArchive = () => { 
        if (!canEditProducts) return;
        if (selectedProduct.status === 'Archived') {
            if (subscription?.activeCount >= subscription?.limit) {
                setArchiveModalOpen(false);
                setLimitModalOpen(true);
                return;
            }
            router.post(route('products.activate', selectedProduct.id), {}, { 
                onSuccess: () => {
                    setArchiveModalOpen(false);
                } 
            });
        } else {
            router.post(route('products.archive', selectedProduct.id), {}, { 
                onSuccess: () => {
                    setArchiveModalOpen(false);
                }
            }); 
        }
    };
    
    const openRestockModal = (p) => { if (!canEditProducts) return; setSelectedProduct(p); setRestockAmount(''); setRestockModalOpen(true); };
    const openArchiveModal = (p) => { if (!canEditProducts) return; setSelectedProduct(p); setArchiveModalOpen(true); };
    
    // Phase 1: Open Deduct Modal
    const openDeductModal = (p) => {
        if (!canEditProducts) return;
        setSelectedProduct(p);
        deductForm.reset();
        setDeductModalOpen(true);
    };

    const toggleProductSelection = (productId) => {
        setSelectedProductIds((current) => (
            current.includes(productId)
                ? current.filter((id) => id !== productId)
                : [...current, productId]
        ));
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
        setSearchQuery('');
        setCurrentPage(1);
    };

    const resetSavedView = () => {
        setActiveTab('All');
        setSearchQuery('');
        setQuickFilter('all');
        setSortConfig({ key: 'name', direction: 'asc' });
        setCurrentPage(1);
    };

    const selectVisibleProducts = () => {
        if (!visibleProductIds.length) {
            return;
        }

        setSelectedProductIds((current) => Array.from(new Set([...current, ...visibleProductIds])));
    };

    const runBulkStatusUpdate = (status) => {
        if (!canEditProducts) return;
        if (!selectedProductIds.length) {
            addToast('Select at least one product first.', 'info');
            return;
        }

        router.post(route('products.bulk-status'), {
            ids: selectedProductIds,
            status,
        }, {
            preserveScroll: true,
            onSuccess: () => setSelectedProductIds([]),
        });
    };

    const handleDeduct = (e) => {
        e.preventDefault();
        if (!canEditProducts) return;
        deductForm.post(route('products.deduct', selectedProduct.id), {
            onSuccess: () => {
                setDeductModalOpen(false);
                deductForm.reset();
            },
            onError: (err) => {
                console.error("Deduction Failed:", err);
                addToast('Failed to deduct stock', 'error');
            }
        });
    };

    return (
        <>
            <Head title="Product Manager" />
            <SellerHeader
                title="Products"
                subtitle="Manage inventory, publishing readiness, and catalog actions."
                auth={auth}
                onMenuClick={openSidebar}
                actions={(
                    <button
                        onClick={openAddModal}
                        disabled={!canEditProducts}
                        className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-clay-500/20 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Plus size={16} />
                        <span className="hidden sm:inline">Add Product</span>
                    </button>
                )}
            />

                <main className="mx-auto flex-1 w-full max-w-[1400px] overflow-y-auto p-4 sm:p-6 space-y-6">
                    {isProductsReadOnly && (
                        <ReadOnlyCapabilityNotice label="Products is read only for your account. Add, edit, stock, and bulk actions are disabled." />
                    )}

                    {/* METRICS */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
                        <KPICard title="Total Products" value={products.length} icon={Package} color="text-blue-600" bg="bg-blue-50" />
                        <KPICard title="Total Sold Units" value={products.reduce((acc, curr) => acc + (parseInt(curr.sold) || 0), 0)} icon={TrendingUp} color="text-green-600" bg="bg-green-50" />
                        <KPICard title="Low Stock Alerts" value={products.filter(p => p.stock < 10).length} icon={AlertCircle} color="text-red-600" bg="bg-red-50" />
                    </div>

                    {(incompleteDraftCount > 0 || remainingActivationSlots === 0 || lowStockCount > 0) && (
                        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                            {incompleteDraftCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => applyQuickFilter('needs_readiness', 'Draft')}
                                    className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-bold transition-colors ${
                                        quickFilter === 'needs_readiness'
                                            ? 'border-amber-300 bg-amber-50 text-amber-800'
                                            : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                    }`}
                                >
                                    <AlertCircle size={13} />
                                    {incompleteDraftCount} {incompleteDraftCount === 1 ? 'draft needs media' : 'drafts need media'}
                                </button>
                            )}
                            {remainingActivationSlots === 0 ? (
                                <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-bold text-red-700">
                                    <Archive size={13} />
                                    Active product limit reached
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold text-emerald-700">
                                    <CheckCircle size={13} />
                                    {remainingActivationSlots} activation {remainingActivationSlots === 1 ? 'slot' : 'slots'} left
                                </span>
                            )}
                            {lowStockCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => applyQuickFilter('all', 'Low Stock')}
                                    className={`inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-[11px] font-bold transition-colors ${
                                        activeTab === 'Low Stock' && quickFilter === 'all'
                                            ? 'border-stone-300 bg-stone-100 text-stone-700'
                                            : 'border-stone-200 text-stone-600 hover:bg-stone-100'
                                    }`}
                                >
                                    <AlertTriangle size={13} />
                                    {lowStockCount} low-stock {lowStockCount === 1 ? 'item' : 'items'}
                                </button>
                            )}
                            {quickFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => applyQuickFilter('all', 'All')}
                                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-100"
                                >
                                    <X size={12} />
                                    Clear quick view
                                </button>
                            )}
                        </div>
                    )}

                    {/* TABLE AREA */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[500px]">
                        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:flex-row sm:justify-between">
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg w-full overflow-x-auto sm:w-fit">
                                {['All', 'Active', 'Draft', 'Archived', 'Low Stock'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => { setActiveTab(tab); setSortConfig({ key: 'name', direction: 'asc' }); }}
                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${activeTab === tab ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            <div className="relative flex-1 sm:w-64">
                                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                                <input type="text" placeholder="Search product, category, or SKU" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border-none bg-gray-50 py-2 pl-9 pr-6 text-xs focus:ring-2 focus:ring-clay-500/20" />
                                {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-2.5 rounded text-gray-400 transition-colors hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"><X size={12} /></button>}
                            </div>
                            <button
                                type="button"
                                onClick={resetSavedView}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-600 transition-colors hover:bg-stone-50 sm:w-auto"
                            >
                                <RefreshCw size={13} />
                                Reset saved view
                            </button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-3">
                            <button
                                type="button"
                                onClick={() => applyQuickFilter('all', activeTab)}
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === 'all'
                                        ? 'border-clay-200 bg-clay-50 text-clay-700'
                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                All visible
                            </button>
                            {incompleteDraftCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => applyQuickFilter('needs_readiness', 'Draft')}
                                    className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                        quickFilter === 'needs_readiness'
                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                            : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                    }`}
                                >
                                    Needs media
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => applyQuickFilter('ready_drafts', 'Draft')}
                                className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
                                    quickFilter === 'ready_drafts'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                Ready drafts
                            </button>
                            {visibleProductIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={selectVisibleProducts}
                                    className="rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-500 transition-colors hover:bg-stone-50"
                                >
                                    Select all
                                </button>
                            )}
                        </div>

                        {selectedProductIds.length > 0 && (
                            <div className="flex flex-col gap-3 border-b border-gray-100 bg-[#FCF7F2] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex rounded-full bg-clay-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-clay-700">
                                        {selectedProductIds.length} selected
                                    </span>
                                    <button onClick={() => setSelectedProductIds([])} className="rounded px-1 py-0.5 text-[11px] font-bold text-stone-500 transition-colors hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20">
                                        Clear
                                    </button>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                    <button disabled={!canEditProducts} onClick={() => runBulkStatusUpdate('Active')} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                                        <CheckCircle size={13} /> Activate
                                    </button>
                                    <button disabled={!canEditProducts} onClick={() => runBulkStatusUpdate('Draft')} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                                        <RotateCcw size={13} /> Save as Draft
                                    </button>
                                    <button disabled={!canEditProducts} onClick={() => runBulkStatusUpdate('Archived')} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                                        <Archive size={13} /> Archive
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- DESKTOP TABLE --- */}
                        <div className="overflow-x-auto hidden md:block">
                            <table className="w-full min-w-[900px] text-left">
                                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-5 py-4 w-12">
                                            <Checkbox checked={allVisibleSelected} onChange={toggleVisibleSelection} />
                                        </th>
                                        <SortableHeader label="Product" sortKey="name" currentSort={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Price" sortKey="price" currentSort={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Stock" sortKey="stock" currentSort={sortConfig} onSort={requestSort} />
                                        <SortableHeader label="Sold" sortKey="sold" currentSort={sortConfig} onSort={requestSort} />
                                        
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {paginatedProducts.length > 0 ? (
                                        paginatedProducts.map((product) => (
                                            <tr key={product.id} className="hover:bg-gray-50/50 transition">
                                                <td className="px-5 py-3 align-top">
                                                    <Checkbox checked={selectedProductIds.includes(product.id)} onChange={() => toggleProductSelection(product.id)} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <img src={product.img || '/images/no-image.png'} alt={product.name} className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200" />
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-sm">{product.name}</p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <Tag size={10} className="text-gray-400" />
                                                                <p className="text-[10px] text-gray-400 font-mono tracking-wide">{product.sku}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 font-bold text-gray-700 text-sm">₱{product.price}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${product.stock < 10 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                                            {product.stock} units
                                                        </span>
                                                        {product.stock < 10 && <AlertCircle size={12} className="text-red-500" />}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-sm font-medium text-gray-600">{product.sold}</td>
                                                <td className="px-5 py-3">
                                                    <div className="flex flex-col items-start gap-1">
                                                        {product.stock < 10 && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600 border border-red-200 uppercase tracking-wide">Low Stock</span>}
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${product.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : product.status === 'Archived' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>{product.status}</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button disabled={!canEditProducts} onClick={() => openRestockModal(product)} className="rounded-md p-1.5 text-green-600 transition-colors hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/20 disabled:cursor-not-allowed disabled:opacity-40" title={canEditProducts ? 'Restock' : 'Read only'}><RefreshCw size={14} /></button>
                                                        <button disabled={!canEditProducts} onClick={() => openDeductModal(product)} className="rounded-md p-1.5 text-orange-600 transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40" title={canEditProducts ? 'Manual Deduct' : 'Read only'}><TrendingUp size={14} className="rotate-180" /></button>
                                                        <button disabled={!canEditProducts} onClick={() => openEditModal(product)} className="rounded-md p-1.5 text-blue-600 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40" title={canEditProducts ? 'Edit' : 'Read only'}><Edit3 size={14} /></button>
                                                        {product.status === 'Archived' ? (
                                                            <button disabled={!canEditProducts} onClick={() => openArchiveModal(product)} className="rounded-md p-1.5 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40" title={canEditProducts ? 'Unarchive' : 'Read only'}><RotateCcw size={14} /></button>
                                                        ) : (
                                                            <button disabled={!canEditProducts} onClick={() => openArchiveModal(product)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 disabled:cursor-not-allowed disabled:opacity-40" title={canEditProducts ? 'Archive' : 'Read only'}><Archive size={14} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center">
                                                <WorkspaceEmptyState
                                                    compact
                                                    icon={Package}
                                                    title="No products found"
                                                    description="Create your first product or adjust the current filters."
                                                    actionLabel="Create Product"
                                                    onAction={openAddModal}
                                                />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* --- MOBILE CARD VIEW --- */}
                        <div className="space-y-3 p-3 md:hidden">
                             {paginatedProducts.length > 0 ? (
                                paginatedProducts.map((product) => (
                                    <div key={product.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
                                        <div className="flex gap-4">
                                        <div className="pt-1">
                                            <Checkbox checked={selectedProductIds.includes(product.id)} onChange={() => toggleProductSelection(product.id)} />
                                        </div>
                                        <img src={product.img || '/images/no-image.png'} alt={product.name} className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 bg-gray-100 object-cover" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate pr-2 text-sm font-bold text-gray-900">{product.name}</h3>
                                                    <p className="text-[10px] font-mono tracking-wide text-gray-400">{product.sku}</p>
                                                </div>
                                                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${product.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : product.status === 'Archived' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                                    {product.status}
                                                </span>
                                            </div>
                                            
                                            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                                <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Price</p>
                                                    <p className="mt-1 font-bold text-stone-900">PHP {product.price}</p>
                                                </div>
                                                <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                                                    <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Stock</p>
                                                    <p className="mt-1 font-bold text-stone-900">{product.stock}</p>
                                                </div>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                                <span>Sold: {product.sold}</span>
                                                {product.stock < 10 && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600">
                                                        <AlertCircle size={10} /> Low Stock
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        </div>
                                        <div className="mt-3 flex flex-col gap-2">
                                            <button disabled={!canEditProducts} onClick={() => openEditModal(product)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] font-bold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                                                <Edit3 size={14} /> Edit Product
                                            </button>
                                        </div>
                                    </div>
                                ))
                             ) : (
                                <div className="px-4 py-8">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={Package}
                                        title="No products found"
                                        description="Create your first product or adjust the current filters."
                                        actionLabel="Create Product"
                                        onAction={openAddModal}
                                    />
                                </div>
                             )}
                        </div>

                        <CompactPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={processedProducts.length}
                            itemsPerPage={itemsPerPage}
                            itemLabel="products"
                            onPageChange={setCurrentPage}
                        />
                    </div>
                </main>

            {/* --- DEDUCTION MODAL (Phase 1) --- */}
            <Modal show={deductModalOpen} onClose={() => setDeductModalOpen(false)} maxWidth="sm">
                <form onSubmit={handleDeduct} className="flex max-h-[85vh] flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Update Stock (Deduct)</h2>
                        <button type="button" onClick={() => setDeductModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-4">
                        Manually remove items from inventory (e.g., physical store sales, breakage).
                    </p>

                    <div className="space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                        <div>
                            <InputLabel value="Quantity to Remove" />
                            <TextInput 
                                type="number" 
                                className="w-full mt-1" 
                                value={deductForm.data.quantity} 
                                onChange={e => deductForm.setData('quantity', e.target.value)}
                                autoFocus
                                min="1"
                                max={selectedProduct?.stock}
                            />
                            <InputError message={deductForm.errors.quantity} className="mt-2" />
                        </div>
                        
                        <div>
                            <InputLabel value="Reason" />
                            <select 
                                className={modalFieldClass}
                                value={deductForm.data.reason}
                                onChange={e => deductForm.setData('reason', e.target.value)}
                            >
                                <option value="Physical Store Sale">Physical Store Sale</option>
                                <option value="Damaged/Breakage">Damaged / Breakage</option>
                                <option value="Lost/Stolen">Lost / Stolen</option>
                                <option value="Other">Other</option>
                            </select>
                            <InputError message={deductForm.errors.reason} className="mt-2" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-gray-100 px-5 py-4 sm:px-6">
                        <button type="button" onClick={() => setDeductModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50">Cancel</button>
                        <PrimaryButton disabled={!canEditProducts || deductForm.processing} className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50">
                            Confirm Deduction
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>

            {/* --- ADD/EDIT MODAL --- */}
            <Modal show={productModalOpen} onClose={closeProductModal} maxWidth="2xl">
                <form onSubmit={submitProduct} className="flex max-h-[85vh] flex-col">
                    <div className="shrink-0 border-b border-gray-100 px-5 py-5 sm:px-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-gray-900">{data.id ? 'Edit Product' : 'New Product'}</h2>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400">SKU:</span>
                                    <span className="rounded border border-gray-200 bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">{data.sku}</span>
                                </div>
                            </div>
                            <button type="button" onClick={closeProductModal} className={modalCloseButtonClass}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
                            {['Essentials', 'Details', 'Media'].map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveFormTab(tab)}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeFormTab === tab ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="min-h-[400px] flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                        {/* TAB 1: ESSENTIALS */}
                        {activeFormTab === 'Essentials' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <InputLabel value="Product Name *" />
                                        <TextInput 
                                            className={`${modalFieldClass} text-lg font-bold`} 
                                            value={data.name} 
                                            onChange={(e) => setData('name', e.target.value)} 
                                            placeholder="e.g. Handcrafted Stoneware Vase"
                                            autoFocus
                                        />
                                        <InputError message={errors.name} className="mt-2" />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <InputLabel value="Description" />
                                        <textarea 
                                            className={modalTextareaClass}
                                            rows="4" 
                                            value={data.description} 
                                            onChange={(e) => setData('description', e.target.value)} 
                                            placeholder="Describe the texture, story, and details..."
                                        />
                                    </div>

                                    <div>
                                        <InputLabel value="Category *" />
                                        <select 
                                            className={modalFieldClass}
                                            value={data.category} 
                                            onChange={(e) => setData('category', e.target.value)}
                                        >
                                            <option value="" disabled>Select Category</option>
                                            {categories.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.category} className="mt-2" />
                                    </div>

                                    <div>
                                        <InputLabel value="Status" />
                                        <select 
                                            className={modalFieldClass}
                                            value={data.status} 
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                        >
                                            <option value="Active" disabled={!activationReadiness.canActivate}>Active</option>
                                            <option value="Draft">Draft</option>
                                            <option value="Archived">Archived</option>
                                        </select>
                                        <div className={`mt-2 rounded-xl border px-3 py-2 ${activationReadiness.canActivate ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                                            <p className={`text-[11px] font-bold ${activationReadiness.canActivate ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                {activationReadiness.canActivate
                                                    ? 'Ready for Active listing'
                                                    : `Still needed for Active: ${activationReadiness.missingLabels.join(', ')}`}
                                            </p>
                                            <p className={`mt-1 text-[10px] ${activationReadiness.canActivate ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {activationReadiness.canActivate
                                                    ? 'Activation requirements are complete.'
                                                    : 'Active stays locked until the required media is uploaded.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Inventory & Pricing</h3>
                                            

                                        </div>

                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                                            <div>
                                                <InputLabel value="Price (₱) *" />
                                                <div className="relative mt-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                                                    <TextInput 
                                                        type="number" 
                                                        className="w-full pl-7" 
                                                        value={data.price} 
                                                        onChange={(e) => setData('price', e.target.value)} 
                                                    />
                                                </div>
                                                <InputError message={errors.price} className="mt-2" />
                                            </div>
                                            <div>
                                                <InputLabel value="Cost Price (₱)" />
                                                <div className="relative mt-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₱</span>
                                                    <TextInput 
                                                        type="number" 
                                                        className={`${modalFieldClass} border-gray-200 bg-gray-50 pl-7`} 
                                                        value={data.cost_price} 
                                                        onChange={(e) => setData('cost_price', e.target.value)} 
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <p className="mt-1 text-[10px] text-gray-400">Internal use only.</p>
                                            </div>
                                            <div>
                                                <InputLabel value="Stock *" />
                                                <TextInput type="number" className="w-full mt-1" value={data.stock} onChange={(e) => setData('stock', e.target.value)} />
                                                <InputError message={errors.stock} className="mt-2" />
                                            </div>
                                            <div>
                                                <InputLabel value="Lead Time (Days)" />
                                                <TextInput type="number" className="w-full mt-1" value={data.lead_time} onChange={(e) => setData('lead_time', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: DETAILS */}
                        {activeFormTab === 'Details' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <InputLabel value="Clay Type" />
                                        <select className={modalFieldClass} value={data.clay_type} onChange={(e) => setData('clay_type', e.target.value)}>
                                            {['Earthenware', 'Stoneware', 'Porcelain'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <InputLabel value="Firing Method" />
                                        <select className={modalFieldClass} value={data.firing_method} onChange={(e) => setData('firing_method', e.target.value)}>
                                            {['Electric Kiln', 'Wood-fired', 'Gas Kiln', 'Raku'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <InputLabel value="Glaze Type" />
                                        <select className={modalFieldClass} value={data.glaze_type} onChange={(e) => setData('glaze_type', e.target.value)}>
                                            {['Matte', 'Glossy', 'Satin', 'Crackle', 'Unglazes'].map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="flex items-center pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <Checkbox name="food_safe" checked={data.food_safe} onChange={(e) => setData('food_safe', e.target.checked)} />
                                            <div>
                                                <span className="text-sm font-bold text-gray-700 group-hover:text-clay-600 transition">Food Safe</span>
                                                <p className="text-xs text-gray-500">Safe for eating / Lead-free</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Dimensions</h3>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <div><InputLabel value="Height (cm)" /><TextInput type="number" className="w-full mt-1" value={data.height} onChange={(e) => setData('height', e.target.value)} /></div>
                                        <div><InputLabel value="Width (cm)" /><TextInput type="number" className="w-full mt-1" value={data.width} onChange={(e) => setData('width', e.target.value)} /></div>
                                        <div><InputLabel value="Weight (g)" /><TextInput type="number" className="w-full mt-1" value={data.weight} onChange={(e) => setData('weight', e.target.value)} /></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: MEDIA */}
                        {activeFormTab === 'Media' && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className={`rounded-2xl border px-4 py-4 ${activationReadiness.canActivate ? 'border-emerald-200 bg-emerald-50/70' : 'border-amber-200 bg-amber-50/80'}`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className={`text-xs font-bold uppercase tracking-wider ${activationReadiness.canActivate ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                Activation Checklist
                                            </p>
                                            <p className={`mt-1 text-sm font-bold ${activationReadiness.canActivate ? 'text-emerald-900' : 'text-amber-900'}`}>
                                                {activationReadiness.canActivate
                                                    ? 'This product is ready to be listed as Active.'
                                                    : 'Complete the media requirements before listing this product as Active.'}
                                            </p>
                                        </div>
                                        <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${activationReadiness.canActivate ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {activationReadiness.canActivate ? 'Ready' : 'Draft only'}
                                        </div>
                                    </div>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                        {activationReadiness.items.map((item) => (
                                            <div
                                                key={item.key}
                                                className={`rounded-xl border px-3 py-3 ${item.complete ? 'border-emerald-200 bg-white/80' : 'border-amber-200 bg-white/70'}`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {item.complete ? (
                                                        <CheckCircle size={16} className="text-emerald-600" />
                                                    ) : (
                                                        <AlertCircle size={16} className="text-amber-600" />
                                                    )}
                                                    <p className="text-sm font-bold text-gray-900">{item.label}</p>
                                                </div>
                                                <p className={`mt-1 text-[11px] ${item.complete ? 'text-emerald-700' : 'text-amber-700'}`}>
                                                    {item.complete ? 'Ready' : item.detail}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                    <ImageIcon className="text-blue-500 shrink-0" size={20} />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Use clear, well-lit photos with a simple background.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Cover Photo */}
                                    <div>
                                        <InputLabel value="Cover Photo (Main)" className="mb-2" />
                                        <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-clay-400 transition group bg-gray-50">
                                            {previews.cover ? (
                                                <>
                                                    <img src={previews.cover} alt="Cover" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => {
                                                                revokeBlobUrl(previews.cover);
                                                                setData('cover_photo', null);
                                                                setPreviews(prev => ({ ...prev, cover: null }));
                                                            }} 
                                                            className="bg-white text-red-600 px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-red-50 transition"
                                                        >
                                                            Remove Photo
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer">
                                                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                                                        <Plus className="text-clay-600" />
                                                    </div>
                                                    <span className="text-sm font-bold text-gray-600">Upload Cover</span>
                                                    <span className="text-[10px] text-gray-400 mt-1">JPG/PNG, Max 5MB</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'cover_photo')} />
                                                </label>
                                            )}
                                        </div>
                                        <InputError message={errors.cover_photo} className="mt-2" />
                                    </div>

                                    {/* Gallery & 3D */}
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <InputLabel value="Gallery Images" />
                                                <span className={`text-[10px] font-bold ${previews.gallery.length < 3 ? 'text-orange-500' : previews.gallery.length > 5 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {previews.gallery.length < 3 
                                                        ? `Add ${3 - previews.gallery.length} more (Min 3)`
                                                        : previews.gallery.length > 5 
                                                        ? `Exceeds max (Max 5)`
                                                        : 'Perfect (3-5 images)'}
                                                </span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                                {previews.gallery.map((preview, idx) => (
                                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                        <img src={preview} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                            <button 
                                                                type="button" 
                                                                onClick={() => handleRemoveGalleryImage(idx)}
                                                                className="w-8 h-8 flex items-center justify-center bg-white text-red-600 rounded-full shadow-lg hover:bg-red-50 transition drop-shadow"
                                                                title="Remove image"
                                                            >
                                                                <X size={16} strokeWidth={3} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {previews.gallery.length < 5 && (
                                                    <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-clay-400 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">
                                                        <Plus size={20} className="text-gray-400 mb-1" />
                                                        <span className="text-[10px] font-bold text-gray-500">Add</span>
                                                        <input type="file" multiple className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'gallery')} />
                                                    </label>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 text-right">{previews.gallery.length} images selected</p>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100">
                                            <InputLabel value="3D Model" className="mb-2" />
                                            
                                            {/* Case 1: New File Selected */}
                                            {data.model_3d ? (
                                                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg text-green-600 shadow-sm"><Check size={16} /></div>
                                                        <div>
                                                            <p className="text-sm font-bold text-green-800 truncate max-w-[150px]">{data.model_3d.name}</p>
                                                            <p className="text-[10px] text-green-600">Ready to upload</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setData('model_3d', null);
                                                            setData('model_3d_assets', []);
                                                            setData('model_3d_asset_paths', []);
                                                        }}
                                                        className="text-green-600 hover:text-green-800"
                                                    >
                                                        <X size={16}/>
                                                    </button>
                                                </div>
                                            ) : (
                                                // Case 2: Existing Model (Edit Mode)
                                                data.model_3d_path ? (
                                                    <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><Cuboid size={16} /></div>
                                                            <div>
                                                                <p className="text-sm font-bold text-blue-800">Current Model</p>
                                                                <p className="text-[10px] text-blue-600">Keep it or replace it with a new file.</p>
                                                            </div>
                                                        </div>
                                                        <label className="cursor-pointer text-xs font-bold text-blue-600 hover:underline">
                                                            Replace
                                                            <input type="file" className="hidden" accept=".glb,.gltf" onChange={(e) => handleFileChange(e, 'model_3d')} />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    // Case 3: No Model (Show Upload)
                                                    <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-clay-400 hover:bg-gray-50 transition group">
                                                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition"><Cuboid size={20} className="text-gray-400 group-hover:text-clay-600" /></div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-gray-700">Upload .glb / .gltf</p>
                                                            <p className="text-[10px] text-gray-400 group-hover:text-clay-500">Required before the product can be listed as Active.</p>
                                                        </div>
                                                        <input type="file" className="hidden" accept=".glb,.gltf" onChange={(e) => handleFileChange(e, 'model_3d')} />
                                                    </label>
                                                )
                                            )}
                                            {data.model_3d?.name?.toLowerCase().endsWith('.gltf') && (
                                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-bold text-amber-800">GLTF companion files</p>
                                                            <p className="mt-1 text-[11px] text-amber-700">
                                                                Upload the matching asset folder too if this file uses external <code>.bin</code> files or textures.
                                                            </p>
                                                        </div>
                                                        <label className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition">
                                                            Upload Asset Folder
                                                            <input
                                                                type="file"
                                                                className="hidden"
                                                                multiple
                                                                webkitdirectory=""
                                                                directory=""
                                                                onChange={handleModelAssetFolderChange}
                                                            />
                                                        </label>
                                                    </div>
                                                    <p className="mt-2 text-[11px] font-medium text-amber-800">
                                                        {data.model_3d_assets?.length
                                                            ? `${data.model_3d_assets.length} companion file${data.model_3d_assets.length > 1 ? 's' : ''} ready for upload.`
                                                            : 'Skip this only if the .gltf is fully embedded.'}
                                                    </p>
                                                    <InputError message={errors.model_3d_assets} className="mt-2" />
                                                </div>
                                            )}
                                            <External3DToolLink />
                                            <InputError message={errors.model_3d} className="mt-2" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER ACTIONS */}
                    <div className="flex shrink-0 flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                          <button type="button" onClick={closeProductModal} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50">Cancel</button>
                          
                          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                              {activeFormTab === 'Media' && processing && progress && (
                                  <div className="hidden min-w-[180px] items-center gap-2 sm:flex">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-clay-100">
                                        <div
                                            className="h-full rounded-full bg-clay-600 transition-all"
                                            style={{ width: `${progress.percentage ?? 0}%` }}
                                        />
                                    </div>
                                    <span className="text-[11px] font-bold text-clay-700">
                                        {progress.percentage ?? 0}%
                                    </span>
                                </div>
                            )}
                            {activeFormTab !== 'Essentials' && (
                                <button 
                                    type="button" 
                                    onClick={() => setActiveFormTab(activeFormTab === 'Media' ? 'Details' : 'Essentials')}
                                    className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Previous
                                </button>
                            )}
                            
                            {activeFormTab === 'Media' ? (
                                <PrimaryButton type="submit" className="px-8 py-2.5 rounded-xl" disabled={!canEditProducts || processing}>
                                    {processing
                                        ? (progress ? `Uploading ${progress.percentage ?? 0}%` : 'Saving...')
                                        : (data.id ? 'Save Changes' : 'Publish Product')}
                                </PrimaryButton>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={() => setActiveFormTab(activeFormTab === 'Essentials' ? 'Details' : 'Media')}
                                    className="px-6 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition"
                                >
                                    Next Step
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>
            
            {/* RESTOCK & ARCHIVE MODALS */}
            <Modal show={restockModalOpen} onClose={() => setRestockModalOpen(false)} maxWidth="sm">
                <div className="p-5 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Restock {selectedProduct?.name}</h2>
                            <p className="mt-1 text-[13px] text-gray-500">Add new inventory to the current stock count.</p>
                        </div>
                        <button type="button" onClick={() => setRestockModalOpen(false)} className={modalCloseButtonClass}>
                            <X size={18} />
                        </button>
                    </div>
                    <div className="mb-6"><InputLabel value="Quantity to Add" /><TextInput disabled={!canEditProducts} type="number" className="w-full mt-1" value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)} autoFocus /></div>
                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-4"><button onClick={() => setRestockModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50">Cancel</button><PrimaryButton disabled={!canEditProducts} onClick={confirmRestock}>Confirm</PrimaryButton></div>
                </div>
            </Modal>
            <Modal show={archiveModalOpen} onClose={() => setArchiveModalOpen(false)} maxWidth="sm">
                <div className="p-5 sm:p-6 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${selectedProduct?.status === 'Archived' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                        {selectedProduct?.status === 'Archived' ? <RotateCcw size={24} /> : <Archive size={24} />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                        {selectedProduct?.status === 'Archived' ? 'Unarchive Product?' : 'Archive Product?'}
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">
                        {selectedProduct?.status === 'Archived' 
                            ? 'This will make the product visible in your dashboard again.' 
                            : 'This will hide the product from your shop. You can unarchive it later.'}
                    </p>
                    <div className="flex justify-center gap-3 border-t border-gray-100 pt-4">
                        <button onClick={() => setArchiveModalOpen(false)} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 transition hover:bg-gray-50">Cancel</button>
                        <button
                            onClick={confirmArchive}
                            disabled={!canEditProducts}
                            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${selectedProduct?.status === 'Archived' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {selectedProduct?.status === 'Archived' ? 'Yes, Unarchive' : 'Yes, Archive'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* LIMIT INTERCEPT MODAL */}
            <Modal show={limitModalOpen} onClose={() => setLimitModalOpen(false)} maxWidth="sm">
                <div className="p-5 sm:p-6 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-amber-50 shadow-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-200 to-transparent opacity-50"></div>
                        <Crown size={28} className="text-amber-500 relative z-10" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Upgrade to Add More</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        You have reached your {subscription?.plan === 'free' ? 'Standard' : 'Premium'} plan limit of <span className="font-bold text-gray-900">{subscription?.limit} active products</span>. Upgrade your plan to activate more products and boost your sales!
                    </p>
                    <div className="flex flex-col gap-3">
                        <Link 
                            href={route('seller.subscription')}
                            className="w-full inline-flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-stone-900 to-clay-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-stone-900/20 hover:scale-[1.02] transition-transform"
                        >
                            View Subscription Plans
                        </Link>
                        <button 
                            type="button" 
                            onClick={() => {
                                setLimitModalOpen(false);
                                setData('status', 'Draft');
                            }} 
                            className="w-full px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition"
                        >
                            Save as Draft for Now
                        </button>
                    </div>
                </div>
            </Modal>

        </>
    );
}

ProductManager.layout = (page) => <SellerWorkspaceLayout active="products">{page}</SellerWorkspaceLayout>;

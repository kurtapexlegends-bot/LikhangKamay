import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import FloatingModuleActions from '@/Components/FloatingModuleActions';
import ConfirmationModal from '@/Components/ConfirmationModal';
import CompactPagination from '@/Components/CompactPagination';
import { useToast } from '@/Components/ToastContext';
import axios from 'axios';
import {
    FolderTree, Plus, Edit2, Trash2, Tag, AlertTriangle, Save, X, ChevronDown,
    Settings, Loader2, CheckCircle2, XCircle, Award, Search, Clock, Package,
    TrendingUp, Store, ShieldAlert, Check
} from 'lucide-react';

const MetricCard = ({ title, value, subtitle, icon: Icon, tone = 'amber' }) => {
    const tones = {
        amber: 'bg-amber-50 text-amber-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        stone: 'bg-stone-100 text-stone-600',
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow">
            <div>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">{value}</h3>
                <p className="text-[10px] font-medium text-stone-400 mt-1">{subtitle}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tones[tone] || tones.amber}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function CatalogManager({ categories, requests, products, filters }) {
    const { addToast } = useToast();

    // Tab switcher state
    const [activeTab, setActiveTab] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'taxonomy';
        }
        return 'taxonomy';
    });

    // ==========================================
    // PRODUCT MODERATION STATE & LOGIC
    // ==========================================
    const [selectedProductIds, setSelectedProductIds] = useState([]);
    const [currentStatusFilter, setCurrentStatusFilter] = useState(filters?.product_status || 'pending_review');
    const [isModifyingProduct, setIsModifyingProduct] = useState(false);
    const [moderationModal, setModerationModal] = useState({ isOpen: false, type: null, ids: [] });
    const [moderationFeedback, setModerationFeedback] = useState('');
    const [lastType, setLastType] = useState('reject');

    const handleProductStatusFilterChange = (status) => {
        setCurrentStatusFilter(status);
        setSelectedProductIds([]);
        router.get(route('admin.catalog.index'), { tab: 'moderation', product_status: status }, { preserveScroll: true, preserveState: true });
    };

    const handleSelectAllProducts = (e) => {
        if (e.target.checked) {
            setSelectedProductIds(products?.data?.map(p => p.id) || []);
        } else {
            setSelectedProductIds([]);
        }
    };

    const handleSelectProduct = (productId) => {
        setSelectedProductIds(prev => 
            prev.includes(productId) 
                ? prev.filter(id => id !== productId)
                : [...prev, productId]
        );
    };

    const triggerModeration = (ids, type) => {
        setModerationFeedback('');
        setModerationModal({ isOpen: true, type, ids: Array.isArray(ids) ? ids : [ids] });
        if (type === 'reject' || type === 'flag') {
            setLastType(type);
        }
    };

    const confirmModerationAction = () => {
        const { type, ids } = moderationModal;
        
        if (type !== 'approve' && !moderationFeedback.trim()) {
            addToast('Feedback/reason is required.', 'error');
            return;
        }

        setIsModifyingProduct(true);
        router.post(route('admin.catalog.moderate'), {
            ids,
            action: type,
            feedback: moderationFeedback.trim()
        }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSelectedProductIds([]);
                setModerationModal({ isOpen: false, type: null, ids: [] });
                setModerationFeedback('');
                addToast(`Product(s) successfully ${type}d.`, 'success');
            },
            onError: (err) => {
                addToast(err.feedback || 'Failed to moderate product(s).', 'error');
            },
            onFinish: () => {
                setIsModifyingProduct(false);
            }
        });
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tabId);
            window.history.pushState({}, '', url.toString());
        }
    };

    // ==========================================
    // TAXONOMY ENGINE STATE & LOGIC
    // ==========================================
    const isTaxonomyLoading = !categories;
    const [localCategories, setLocalCategories] = useState(categories || []);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isProcessingAdd, setIsProcessingAdd] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    // State for Edit
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);

    // Real-time Validation
    const [isNameTaken, setIsNameTaken] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Confirmation State for Rename
    const [confirmingUpdate, setConfirmingUpdate] = useState(null);

    // Debounce API Validation Check for Category Name
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (newCategoryName.trim().length > 2) {
                setIsValidating(true);
                try {
                    const response = await axios.post(route('api.validate-constraint'), {
                        type: 'category_name_availability',
                        value: newCategoryName
                    });
                    setIsNameTaken(!response.data.valid);
                } catch (e) {
                    console.error("Validation failed", e);
                } finally {
                    setIsValidating(false);
                }
            } else {
                setIsNameTaken(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [newCategoryName]);

    const pendingDeletes = useRef({});

    useEffect(() => {
        if (categories) {
            setLocalCategories(categories);
        }
    }, [categories]);

    useEffect(() => {
        return () => {
            Object.values(pendingDeletes.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim() || isNameTaken) return;

        setIsProcessingAdd(true);
        router.post(route('admin.taxonomy.store'), { name: newCategoryName }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewCategoryName('');
                setIsAddOpen(false);
                addToast('Category added successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingAdd(false)
        });
    };

    const handleUpdateCategory = (category) => {
        if (!editName.trim() || editName === category.name) {
            setEditingCategory(null);
            return;
        }

        setConfirmingUpdate(category);
    };

    const submitUpdateCategory = () => {
        const category = confirmingUpdate;
        setConfirmingUpdate(null);
        setIsProcessingEdit(true);
        router.patch(route('admin.taxonomy.update', category.id), { name: editName }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCategory(null);
                addToast('Category renamed successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingEdit(false)
        });
    };

    const handleDeleteCategory = (category) => {
        if (category.products_count > 0) {
            addToast('Cannot delete category because it contains active products.', 'error');
            return;
        }

        const categoryId = category.id;
        const originalCategories = [...localCategories];

        try {
            addToast(`Deleting "${category.name}"...`, 'info', 5000, () => {
                if (pendingDeletes.current[categoryId]) {
                    clearTimeout(pendingDeletes.current[categoryId]);
                    setLocalCategories(originalCategories);
                    delete pendingDeletes.current[categoryId];
                }
            });

            // Optimistic deletion
            setLocalCategories(prev => prev.filter(c => c.id !== categoryId));

            const timerId = setTimeout(() => {
                router.delete(route('admin.taxonomy.destroy', categoryId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        addToast(`Category "${category.name}" permanently deleted.`, 'success');
                        delete pendingDeletes.current[categoryId];
                    },
                    onError: () => {
                        setLocalCategories(originalCategories);
                        addToast('Deletion failed. Reverting...', 'error');
                    }
                });
            }, 5000);

            pendingDeletes.current[categoryId] = timerId;
        } catch (e) {
            console.error("Undo System Error: Deletion aborted to prevent data loss.", e);
            setLocalCategories(originalCategories);
        }
    };

    // ==========================================
    // SPONSORSHIP REQUESTS STATE & LOGIC
    // ==========================================
    const [searchTerm, setSearchTerm] = useState('');
    const [processingSponsorship, setProcessingSponsorship] = useState(false);
    const [pendingActionId, setPendingActionId] = useState(null);
    const [recentlyUpdatedId, setRecentlyUpdatedId] = useState(null);
    const [modalData, setModalData] = useState({ isOpen: false, type: null, request: null });
    const [requestRows, setRequestRows] = useState(requests?.data || []);
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        if (requests?.data) {
            setRequestRows(requests.data);
        }
    }, [requests?.data]);

    useEffect(() => {
        if (!recentlyUpdatedId) return undefined;
        const timeout = setTimeout(() => setRecentlyUpdatedId(null), 2200);
        return () => clearTimeout(timeout);
    }, [recentlyUpdatedId]);

    const handleSponsorshipAction = (request, type) => {
        setRejectionReason('');
        setModalData({ isOpen: true, type, request });
    };

    const confirmSponsorshipAction = () => {
        const { type, request } = modalData;
        const routeName = type === 'approve' ? 'admin.sponsorships.approve' : 'admin.sponsorships.reject';

        if (type === 'reject' && !rejectionReason.trim()) {
            addToast('A rejection reason is required.', 'error');
            return;
        }

        setProcessingSponsorship(true);
        setPendingActionId(request.id);
        router.post(route(routeName, request.id), type === 'reject' ? { rejection_reason: rejectionReason.trim() } : {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const processedAt = new Date().toISOString();

                setRequestRows((currentRows) => currentRows.map((row) => (
                    row.id === request.id
                        ? {
                            ...row,
                            status: type === 'approve' ? 'approved' : 'rejected',
                            approved_at: type === 'approve' ? processedAt : null,
                            rejection_reason: type === 'reject' ? rejectionReason.trim() : null,
                            updated_at: processedAt,
                        }
                        : row
                )));
                setRecentlyUpdatedId(request.id);
                setRejectionReason('');
                setModalData({ isOpen: false, type: null, request: null });
                addToast(`Sponsorship ${type}d successfully.`, 'success');
            },
            onError: (err) => {
                if (type === 'approve') {
                    setModalData({ isOpen: false, type: null, request: null });
                }
                addToast(err.error || `Failed to ${type} sponsorship.`, 'error');
            },
            onFinish: () => {
                setProcessingSponsorship(false);
                setPendingActionId(null);
            }
        });
    };

    const filteredRequests = useMemo(() => {
        return requestRows.filter(r =>
            r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.user?.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.user?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [requestRows, searchTerm]);

    const totalRequests = requestRows.length;
    const pendingRequests = useMemo(() => requestRows.filter(r => r.status === 'pending').length, [requestRows]);
    const approvedRequests = useMemo(() => requestRows.filter(r => r.status === 'approved').length, [requestRows]);
    const uniqueShops = useMemo(() => new Set(requestRows.map(r => r.user?.id).filter(Boolean)).size, [requestRows]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> Approved</span>;
            case 'rejected':
                return <span className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><XCircle size={12}/> Rejected</span>;
            default:
                return <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><Clock size={12}/> Pending</span>;
        }
    };

    const mainTabs = [
        { id: 'taxonomy', name: 'Taxonomy Engine', icon: FolderTree },
        { id: 'sponsorships', name: 'Sponsorship Requests', icon: Award },
        { id: 'moderation', name: 'Product Moderation', icon: Package },
    ];

    return (
        <>
            <Head title="Catalog Manager" />

            <div className="max-w-6xl mx-auto space-y-6">

                {/* --- TABS NAVIGATION --- */}
                <div className="border-b border-stone-200 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                        {mainTabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 pb-4 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap outline-none ${
                                        activeTab === tab.id
                                            ? 'border-clay-600 text-clay-700 font-bold'
                                            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Switchable Views */}
                <AnimatePresence mode="wait">
                    {activeTab === 'taxonomy' && (
                        <motion.div
                            key="taxonomy-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            <div className="max-w-5xl pt-4">
                                <FloatingModuleActions actions={(
                                    <button
                                        onClick={() => setIsAddOpen(true)}
                                        className="flex items-center gap-1.5 bg-clay-600 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-clay-700 active:scale-95 transition-all shadow-lg shadow-clay-600/20 whitespace-nowrap"
                                    >
                                        <Plus size={14} strokeWidth={3} /> Add Category
                                    </button>
                                )} />

                                {/* Categories Table */}
                                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left table-card-mobile">
                                            <thead className="bg-stone-50 border-b border-stone-100">
                                                <tr>
                                                    <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-widest w-1/2">Category Name</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-widest w-1/4">Products Linked</th>
                                                    <th className="px-6 py-3 text-xs font-bold text-stone-500 uppercase tracking-widest w-1/4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-100">
                                                {isTaxonomyLoading ? (
                                                    [1, 2, 3, 4, 5].map(i => (
                                                        <tr key={i} className="animate-pulse">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="h-8 w-8 bg-stone-100 rounded-lg" />
                                                                    <div className="h-4 w-32 bg-stone-100 rounded" />
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="h-5 w-24 bg-stone-100 rounded-md" />
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <div className="h-8 w-8 bg-stone-100 rounded-lg" />
                                                                    <div className="h-8 w-8 bg-stone-100 rounded-lg" />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : localCategories.length > 0 ? (
                                                    localCategories.map((category) => (
                                                        <tr key={category.id} className="hover:bg-stone-50/50 transition-all group opacity-100">
                                                            <td className="px-6 py-4" data-label="Category Name">
                                                                {editingCategory === category.id ? (
                                                                    <input
                                                                        type="text"
                                                                        value={editName}
                                                                        onChange={(e) => setEditName(e.target.value)}
                                                                        className="w-full px-3 py-1.5 bg-white border border-clay-300 rounded-lg text-sm focus:ring-2 focus:ring-clay-500/20 outline-none"
                                                                        autoFocus
                                                                    />
                                                                ) : (
                                                                    <div className="flex items-center gap-2.5">
                                                                        <div className="p-1.5 bg-stone-100 rounded-lg text-stone-500">
                                                                            <FolderTree size={16} strokeWidth={2} />
                                                                        </div>
                                                                        <span className="font-bold text-stone-900">{category.name}</span>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4" data-label="Products Linked">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${category.products_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                                                    <Tag size={12} />
                                                                    {category.products_count} product{category.products_count !== 1 ? 's' : ''}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right" data-label="Actions">
                                                                {editingCategory === category.id ? (
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            onClick={() => setEditingCategory(null)}
                                                                            className="p-1.5 text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg transition"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUpdateCategory(category)}
                                                                            disabled={isProcessingEdit}
                                                                            className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition disabled:opacity-50"
                                                                        >
                                                                            <Save size={16} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button
                                                                            onClick={() => {
                                                                                setEditingCategory(category.id);
                                                                                setEditName(category.name);
                                                                            }}
                                                                            className="p-1.5 text-stone-500 hover:text-clay-700 bg-white hover:bg-clay-50 border border-stone-200 hover:border-clay-200 rounded-lg shadow-sm transition-all hover:scale-110 active:scale-95"
                                                                            title="Rename Category"
                                                                        >
                                                                            <Edit2 size={14} strokeWidth={2.5} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteCategory(category)}
                                                                            disabled={category.products_count > 0}
                                                                            className={`p-1.5 rounded-lg border shadow-sm transition-all ${category.products_count > 0 ? 'text-stone-300 bg-stone-50 border-stone-100 cursor-not-allowed' : 'text-stone-500 hover:text-red-700 bg-white hover:bg-red-50 border-stone-200 hover:border-red-200 hover:scale-110 active:scale-95'}`}
                                                                            title={category.products_count > 0 ? "Cannot delete category with active products" : "Delete Category"}
                                                                        >
                                                                            <Trash2 size={14} strokeWidth={2.5} />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="3" className="px-6 py-16 text-center bg-stone-50/50">
                                                            <div className="inline-flex p-4 bg-white shadow-sm border border-stone-100 rounded-full mb-3">
                                                                <FolderTree size={24} className="text-stone-400" />
                                                            </div>
                                                            <p className="text-sm font-medium text-stone-500">No categories found.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* ADD MODAL */}
                            <Modal show={isAddOpen} onClose={() => setIsAddOpen(false)} maxWidth="sm">
                                <div className="p-6">
                                    <h2 className="text-lg font-bold text-stone-900 mb-1">Add New Category</h2>
                                    <p className="text-xs text-stone-500 mb-5">Create a new global category for the marketplace.</p>

                                    <form onSubmit={handleAddCategory}>
                                        <div className="mb-6">
                                            <label className="block text-xs font-bold text-stone-700 uppercase tracking-widest mb-2">
                                                Category Name
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={newCategoryName}
                                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                                    placeholder="e.g., Ceramic Mugs"
                                                    className={`w-full px-4 py-2.5 bg-stone-50 border ${isNameTaken ? 'border-rose-300 ring-rose-500/10' : 'border-stone-200 ring-clay-500/10'} rounded-xl text-sm focus:ring-4 focus:bg-white outline-none transition-all pr-10`}
                                                    autoFocus
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {isValidating ? (
                                                        <Loader2 size={16} className="text-stone-400 animate-spin" />
                                                    ) : newCategoryName.trim().length > 2 ? (
                                                        isNameTaken ? (
                                                            <XCircle size={16} className="text-rose-500" />
                                                        ) : (
                                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                                        )
                                                    ) : null}
                                                </div>
                                            </div>
                                            {isNameTaken && (
                                                <p className="mt-1.5 text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> This name is already taken.
                                                </p>
                                            )}
                                        </div>

                                        {/* ADVANCED PARAMETERS (Progressive Disclosure) */}
                                        <div className="mb-6">
                                            <button
                                                type="button"
                                                onClick={() => setShowAdvanced(!showAdvanced)}
                                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 hover:text-stone-600 transition-colors focus:outline-none"
                                            >
                                                <Settings size={12} className={showAdvanced ? 'text-clay-500' : ''} />
                                                Advanced Parameters
                                                <ChevronDown size={12} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
                                            </button>

                                            <AnimatePresence>
                                                {showAdvanced && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pt-4 space-y-4">
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">
                                                                    URL Slug (Optional)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    placeholder="ceramic-mugs"
                                                                    className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs outline-none focus:border-clay-300 transition-colors"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">
                                                                    Internal Priority
                                                                </label>
                                                                <select className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs outline-none focus:border-clay-300 transition-colors">
                                                                    <option>Standard</option>
                                                                    <option>High (Featured)</option>
                                                                    <option>Low (Archive)</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        <div className="flex items-center justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setIsAddOpen(false)}
                                                className="px-4 py-2 text-sm font-bold text-stone-500 hover:text-stone-700 transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isProcessingAdd || !newCategoryName.trim() || isNameTaken}
                                                className="bg-clay-600 hover:bg-clay-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2"
                                            >
                                                {isProcessingAdd && <Loader2 size={16} className="animate-spin" />}
                                                {isProcessingAdd ? 'Saving...' : 'Add Category'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </Modal>

                            <ConfirmationModal
                                isOpen={!!confirmingUpdate}
                                onClose={() => setConfirmingUpdate(null)}
                                onConfirm={submitUpdateCategory}
                                title="Rename Category"
                                message={`Are you sure you want to rename "${confirmingUpdate?.name}" to "${editName}"? This will instantly update ${confirmingUpdate?.products_count || 0} existing products across the marketplace.`}
                                icon={Edit2}
                                iconBg="bg-clay-50 text-clay-600"
                                confirmText="Rename Category"
                                confirmColor="bg-clay-600 hover:bg-clay-700 focus-visible:ring-clay-600/30"
                            />
                        </motion.div>
                    )}

                    {activeTab === 'sponsorships' && (
                        <motion.div
                            key="sponsorships-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                                <MetricCard
                                    title="Total Requests"
                                    value={totalRequests}
                                    subtitle="Across the current listing"
                                    icon={Award}
                                    tone="amber"
                                />
                                <MetricCard
                                    title="Pending Review"
                                    value={pendingRequests}
                                    subtitle="Need admin action"
                                    icon={Clock}
                                    tone="stone"
                                />
                                <MetricCard
                                    title="Approved"
                                    value={approvedRequests}
                                    subtitle="Already boosted"
                                    icon={TrendingUp}
                                    tone="emerald"
                                />
                                <MetricCard
                                    title="Active Sellers"
                                    value={uniqueShops}
                                    subtitle="Unique shops requesting"
                                    icon={Store}
                                    tone="blue"
                                />
                            </div>

                            {/* Sponsorship Requests Console */}
                            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                                
                                {/* Header & Search */}
                                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-stone-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
                                            <Award size={20} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-stone-900">All Requests</h2>
                                            <p className="text-sm text-stone-500 mt-1">Manage 7-day product sponsorship approvals from artisan shops.</p>
                                        </div>
                                    </div>
                                    <div className="relative w-full lg:w-80">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Search by product or seller..."
                                            className="w-full pl-9 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:bg-white focus:border-clay-300 focus:ring-1 focus:ring-clay-300 transition"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-full lg:min-w-[940px] text-left border-collapse table-card-mobile">
                                        <thead>
                                            <tr className="bg-stone-50/80 border-b border-stone-200">
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Product</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Seller</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Requested</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-wider">Status</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-wider text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {filteredRequests.length > 0 ? (
                                                filteredRequests.map((req) => (
                                                    <tr
                                                        key={req.id}
                                                        className={`transition duration-300 ${
                                                            recentlyUpdatedId === req.id
                                                                ? 'bg-emerald-50/60'
                                                                : 'hover:bg-stone-50/50'
                                                        }`}
                                                    >
                                                        <td className="py-4 px-6 align-middle" data-label="Product">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl border border-stone-250 bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                                    {req.product?.cover_photo_path ? (
                                                                        <img
                                                                            src={`/storage/${req.product.cover_photo_path}`}
                                                                            alt=""
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                                        />
                                                                    ) : (
                                                                        <Package size={16} className="text-stone-300" />
                                                                    )}
                                                                </div>
                                                                <div className="max-w-[220px]">
                                                                    <p className="text-sm font-bold text-stone-900 truncate">{req.product?.name || 'Unknown Product'}</p>
                                                                    <p className="text-[10px] text-stone-500 mt-1 truncate">
                                                                        Shop: {req.user?.shop_name || req.user?.name || 'Unknown Shop'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 align-middle" data-label="Seller">
                                                            <p className="text-sm font-bold text-stone-900">{req.user?.shop_name || req.user?.name}</p>
                                                            <p className="text-[10px] text-stone-550">ID: {req.user?.id}</p>
                                                        </td>
                                                        <td className="py-4 px-6 align-middle text-sm text-stone-500 font-medium" data-label="Requested">
                                                            {new Date(req.created_at).toLocaleDateString()}
                                                            <div className="text-[10px] text-stone-400">{new Date(req.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                        </td>
                                                        <td className="py-4 px-6 align-middle" data-label="Status">
                                                            {getStatusBadge(req.status)}
                                                            {req.status === 'rejected' && req.rejection_reason && (
                                                                <p className="mt-2 max-w-[260px] text-[11px] leading-relaxed text-red-650">
                                                                    Reason: {req.rejection_reason}
                                                                </p>
                                                            )}
                                                            {recentlyUpdatedId === req.id && (
                                                                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                                                    Updated just now
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 align-middle">
                                                            {req.status === 'pending' ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleSponsorshipAction(req, 'reject')}
                                                                        disabled={processingSponsorship && pendingActionId === req.id}
                                                                        className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                                                                    >
                                                                        {processingSponsorship && pendingActionId === req.id && modalData.type === 'reject' ? 'Rejecting...' : 'Reject'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleSponsorshipAction(req, 'approve')}
                                                                        disabled={processingSponsorship && pendingActionId === req.id}
                                                                        className="px-4 py-1.5 text-xs font-bold bg-stone-900 text-white hover:bg-black rounded-lg transition shadow-sm disabled:opacity-50"
                                                                    >
                                                                        {processingSponsorship && pendingActionId === req.id && modalData.type === 'approve' ? 'Approving...' : 'Approve'}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="text-right text-[10px] text-stone-400 font-medium">
                                                                    Processed on<br/>
                                                                    {new Date(req.approved_at || req.updated_at).toLocaleDateString()}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="py-12">
                                                        <div className="text-center flex flex-col items-center">
                                                            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4 text-stone-300">
                                                                <Award size={24} />
                                                            </div>
                                                            <h3 className="text-sm font-bold text-stone-900">No requests found</h3>
                                                            <p className="text-xs text-stone-500 mt-1 max-w-sm">
                                                                No sponsorship requests match your search criteria.
                                                             </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {requests?.last_page > 1 && (
                                    <CompactPagination
                                        currentPage={requests.current_page}
                                        totalPages={requests.last_page}
                                        totalItems={requests.total}
                                        itemsPerPage={requests.per_page}
                                        onPageChange={(requests_page) => router.get(route('admin.catalog.index'), { tab: 'sponsorships', requests_page }, { preserveScroll: true, preserveState: true })}
                                        itemLabel="requests"
                                    />
                                )}
                            </div>

                            <ConfirmationModal
                                isOpen={modalData.isOpen && modalData.type === 'approve'}
                                onClose={() => setModalData({ isOpen: false, type: null, request: null })}
                                onConfirm={confirmSponsorshipAction}
                                title="Approve Sponsorship?"
                                message={`Are you sure you want to approve "${modalData.request?.product?.name}" for a 7-day sponsorship? It will be placed across the homepage and catalog sponsored surfaces.`}
                                icon={CheckCircle2}
                                iconBg="bg-emerald-50 text-emerald-600"
                                confirmText="Yes, Approve"
                                confirmColor="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-250/20"
                                processing={processingSponsorship}
                            />

                            <Modal
                                show={modalData.isOpen && modalData.type === 'reject'}
                                onClose={() => {
                                    setRejectionReason('');
                                    setModalData({ isOpen: false, type: null, request: null });
                                }}
                                maxWidth="md"
                            >
                                <div className="p-6">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-650 flex items-center justify-center">
                                            <XCircle size={22} />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-stone-900">Reject Sponsorship?</h2>
                                            <p className="text-sm text-stone-500 mt-1">
                                                Add a reason for rejecting "{modalData.request?.product?.name}". This note will be shown to the seller.
                                            </p>
                                        </div>
                                    </div>

                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
                                        Rejection Reason
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        rows={5}
                                        className="w-full rounded-xl border border-stone-200 focus:border-red-300 focus:ring-red-200 text-sm"
                                        placeholder="Explain why the request was rejected so the seller knows what to improve."
                                    />

                                    <div className="mt-5 flex justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setRejectionReason('');
                                                setModalData({ isOpen: false, type: null, request: null });
                                            }}
                                            className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmSponsorshipAction}
                                            disabled={processingSponsorship}
                                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
                                        >
                                            {processingSponsorship ? 'Rejecting...' : 'Reject Request'}
                                        </button>
                                    </div>
                                </div>
                            </Modal>
                        </motion.div>
                    )}

                    {activeTab === 'moderation' && (
                        <motion.div
                            key="moderation-tab"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-6"
                        >
                            {/* Filter Bar & Bulk Actions */}
                            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <label className="text-xs font-bold text-stone-500 uppercase tracking-widest whitespace-nowrap">Filter Status:</label>
                                    <select
                                        value={currentStatusFilter}
                                        onChange={(e) => handleProductStatusFilterChange(e.target.value)}
                                        className="rounded-xl border-stone-200 text-xs font-bold text-stone-700 bg-stone-50 focus:bg-white focus:border-clay-300 focus:ring-1 focus:ring-clay-300 transition"
                                    >
                                        <option value="pending_review">Pending Review</option>
                                        <option value="rejected">Rejected</option>
                                        <option value="flagged">Flagged</option>
                                        <option value="Active">Approved / Active</option>
                                        <option value="all">All Listings</option>
                                    </select>
                                </div>

                                {selectedProductIds.length > 0 && (
                                    <div className="flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-xl border border-stone-150 animate-fadeIn">
                                        <span className="text-xs font-bold text-stone-600 mr-2">
                                            {selectedProductIds.length} Selected
                                        </span>
                                        <button
                                            onClick={() => triggerModeration(selectedProductIds, 'approve')}
                                            className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition"
                                        >
                                            <Check size={12} /> Approve
                                        </button>
                                        <button
                                            onClick={() => triggerModeration(selectedProductIds, 'reject')}
                                            className="flex items-center gap-1 bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-700 transition"
                                        >
                                            <XCircle size={12} /> Reject
                                        </button>
                                        <button
                                            onClick={() => triggerModeration(selectedProductIds, 'flag')}
                                            className="flex items-center gap-1 bg-amber-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-amber-700 transition"
                                        >
                                            <ShieldAlert size={12} /> Flag
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Table */}
                            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse table-card-mobile">
                                        <thead>
                                            <tr className="bg-stone-50 border-b border-stone-100">
                                                <th className="py-4 px-6 w-12 text-center">
                                                    <input
                                                        type="checkbox"
                                                        onChange={handleSelectAllProducts}
                                                        checked={products?.data?.length > 0 && selectedProductIds.length === products.data.length}
                                                        className="rounded text-clay-600 focus:ring-clay-500"
                                                    />
                                                </th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-1/3">Product</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Artisan Seller</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Submitted</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest">Status</th>
                                                <th className="py-4 px-6 text-[10px] font-bold text-stone-500 uppercase tracking-widest text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-stone-100">
                                            {products?.data?.length > 0 ? (
                                                products.data.map((product) => (
                                                    <tr key={product.id} className="hover:bg-stone-50/50 transition duration-150">
                                                        <td className="py-4 px-6 text-center align-middle" data-label="Select">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProductIds.includes(product.id)}
                                                                onChange={() => handleSelectProduct(product.id)}
                                                                className="rounded text-clay-600 focus:ring-clay-500"
                                                            />
                                                        </td>
                                                        <td className="py-4 px-6 align-middle" data-label="Product">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                                                                    {product.cover_photo_path ? (
                                                                        <img
                                                                            src={`/storage/${product.cover_photo_path}`}
                                                                            alt=""
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                                        />
                                                                    ) : (
                                                                        <Package size={16} className="text-stone-300" />
                                                                    )}
                                                                </div>
                                                                <div className="max-w-[200px]">
                                                                    <p className="text-sm font-bold text-stone-900 truncate">{product.name}</p>
                                                                    <p className="text-[10px] text-stone-500 mt-0.5 truncate">SKU: {product.sku}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 align-middle text-sm font-bold text-stone-850" data-label="Seller">
                                                            <div>
                                                                <p className="text-stone-900">{product.user?.shop_name || 'Individual Seller'}</p>
                                                                <p className="text-[10px] text-stone-500 font-medium mt-0.5">{product.user?.name}</p>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 align-middle text-xs font-semibold text-stone-550" data-label="Submitted">
                                                            {product.created_at ? new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                                        </td>
                                                        <td className="py-4 px-6 align-middle" data-label="Status">
                                                            {product.status === 'Active' ? (
                                                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><CheckCircle2 size={12}/> Active</span>
                                                            ) : product.status === 'pending_review' ? (
                                                                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><Clock size={12}/> Pending Review</span>
                                                            ) : product.status === 'rejected' ? (
                                                                <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><XCircle size={12}/> Rejected</span>
                                                            ) : product.status === 'flagged' ? (
                                                                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><ShieldAlert size={12}/> Flagged</span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-700 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider"><AlertTriangle size={12}/> {product.status}</span>
                                                            )}
                                                            {product.rejection_reason && (
                                                                <p className="text-[10px] text-red-500 mt-1 max-w-[180px] truncate" title={product.rejection_reason}>
                                                                    Reason: {product.rejection_reason}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 align-middle text-right" data-label="Actions">
                                                            <div className="flex items-center justify-end gap-2">
                                                                {product.status !== 'Active' && (
                                                                    <button
                                                                        onClick={() => triggerModeration(product.id, 'approve')}
                                                                        className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                                                                        title="Approve Listing"
                                                                    >
                                                                        <Check size={14} strokeWidth={2.5} />
                                                                    </button>
                                                                )}
                                                                {product.status !== 'rejected' && (
                                                                    <button
                                                                        onClick={() => triggerModeration(product.id, 'reject')}
                                                                        className="p-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                                                                        title="Reject Listing"
                                                                    >
                                                                        <XCircle size={14} strokeWidth={2.5} />
                                                                    </button>
                                                                )}
                                                                {product.status !== 'flagged' && (
                                                                    <button
                                                                        onClick={() => triggerModeration(product.id, 'flag')}
                                                                        className="p-1.5 text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition"
                                                                        title="Flag Listing"
                                                                    >
                                                                        <ShieldAlert size={14} strokeWidth={2.5} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="py-16 text-center">
                                                        <div className="inline-flex p-4 bg-stone-50 rounded-full mb-3 text-stone-300 border border-stone-100">
                                                            <Package size={24} />
                                                        </div>
                                                        <h3 className="text-sm font-bold text-stone-900">No products matching status</h3>
                                                        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                                                            Currently no artisan listings are listed with this status moderation.
                                                        </p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {products?.last_page > 1 && (
                                    <CompactPagination
                                        currentPage={products.current_page}
                                        totalPages={products.last_page}
                                        totalItems={products.total}
                                        itemsPerPage={products.per_page}
                                        onPageChange={(products_page) => router.get(route('admin.catalog.index'), { tab: 'moderation', product_status: currentStatusFilter, products_page }, { preserveScroll: true, preserveState: true })}
                                        itemLabel="products"
                                    />
                                )}
                            </div>

                            {/* Moderation Modals */}
                            <ConfirmationModal
                                isOpen={moderationModal.isOpen && moderationModal.type === 'approve'}
                                onClose={() => setModerationModal({ isOpen: false, type: null, ids: [] })}
                                onConfirm={confirmModerationAction}
                                title="Approve Listing(s)?"
                                message={`Are you sure you want to approve the selected ${moderationModal.ids?.length} product listing(s)? This will publish them and make them fully searchable in the public marketplace.`}
                                icon={CheckCircle2}
                                iconBg="bg-emerald-50 text-emerald-600"
                                confirmText="Yes, Approve"
                                confirmColor="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-250/20"
                                processing={isModifyingProduct}
                            />

                            <Modal
                                show={moderationModal.isOpen && (moderationModal.type === 'reject' || moderationModal.type === 'flag')}
                                onClose={() => {
                                    setModerationFeedback('');
                                    setModerationModal({ isOpen: false, type: null, ids: [] });
                                }}
                                maxWidth="md"
                            >
                                <div className="p-6">
                                    <div className="flex items-start gap-3 mb-4">
                                        <div 
                                            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${lastType === 'reject' ? 'bg-red-50 text-red-650' : 'bg-amber-50 text-amber-650'}`}
                                            style={{ width: '48px', height: '48px', minWidth: '48px', minHeight: '48px' }}
                                        >
                                            {lastType === 'reject' ? <XCircle size={22} /> : <ShieldAlert size={22} />}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-stone-900">
                                                {lastType === 'reject' ? 'Reject Product Listing(s)?' : 'Flag Product Listing(s)?'}
                                            </h2>
                                            <p className="text-sm text-stone-500 mt-1">
                                                Enter the feedback or reason for this moderation action on the selected {moderationModal.ids?.length} product(s). Sellers will be notified of this message.
                                            </p>
                                        </div>
                                    </div>

                                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-2">
                                        Reason Feedback
                                    </label>
                                    <textarea
                                        value={moderationFeedback}
                                        onChange={(e) => setModerationFeedback(e.target.value)}
                                        rows={5}
                                        className="w-full rounded-xl border border-stone-250 focus:border-clay-300 focus:ring-clay-200 text-sm"
                                        placeholder="Explain the listing adjustments or guidelines violated so the seller can take corrective actions."
                                        autoFocus
                                    />

                                    <div className="mt-5 flex justify-end gap-3">
                                        <button
                                            onClick={() => {
                                                setModerationFeedback('');
                                                setModerationModal({ isOpen: false, type: null, ids: [] });
                                            }}
                                            className="px-4 py-2.5 border border-stone-200 rounded-xl text-sm font-bold text-stone-700 hover:bg-stone-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={confirmModerationAction}
                                            disabled={isModifyingProduct}
                                            className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 ${lastType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                                        >
                                            {isModifyingProduct ? 'Processing...' : lastType === 'reject' ? 'Reject Listing(s)' : 'Flag Listing(s)'}
                                        </button>
                                    </div>
                                </div>
                            </Modal>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
}

CatalogManager.layout = (page) => (
    <AdminLayout title="Catalog Manager">{page}</AdminLayout>
);

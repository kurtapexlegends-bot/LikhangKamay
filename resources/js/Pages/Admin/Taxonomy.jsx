import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import Modal from '@/Components/Modal';
import FloatingModuleActions from '@/Components/FloatingModuleActions';
import { FolderTree, Plus, Edit2, Trash2, Tag, AlertTriangle, Save, X, ChevronDown, Settings, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import axios from 'axios';

export default function Taxonomy({ categories }) {
    const { addToast } = useToast();
    const [localCategories, setLocalCategories] = useState(categories);
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

    // Audit Log State
    const [viewingAuditLog, setViewingAuditLog] = useState(null);

    React.useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (newCategoryName.trim().length > 2) {
                setIsValidating(true);
                try {
                    const response = await axios.post(route('admin.taxonomy.check-name'), { name: newCategoryName });
                    setIsNameTaken(response.data.exists);
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

    const pendingDeletes = React.useRef({});

    React.useEffect(() => {
        setLocalCategories(categories);
    }, [categories]);

    React.useEffect(() => {
        return () => {
            Object.values(pendingDeletes.current).forEach(timer => clearTimeout(timer));
        };
    }, []);

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

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

        if (!confirm(`Are you sure you want to rename "${category.name}" to "${editName}"? This will instantly update ${category.products_count} existing products.`)) {
            return;
        }

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
            // SAFETY: Attempt to show toast FIRST. If this fails, the catch block will prevent data loss.
            addToast(`Deleting "${category.name}"...`, 'info', 5000, () => {
                if (pendingDeletes.current[categoryId]) {
                    clearTimeout(pendingDeletes.current[categoryId]);
                    setLocalCategories(originalCategories);
                    delete pendingDeletes.current[categoryId];
                }
            });

            // OPTIMISTIC REMOVE (UI ONLY)
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

    return (
        <AdminLayout title="Global Taxonomy Engine">
            <Head title="Taxonomy Engine" />

            <div className="max-w-5xl pt-4">
                
                <FloatingModuleActions actions={(
                    <button 
                        onClick={() => setIsAddOpen(true)}
                        className="flex items-center gap-1.5 bg-clay-600 text-white px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-clay-700 active:scale-95 transition-all shadow-lg shadow-clay-600/20 whitespace-nowrap"
                    >
                        <Plus size={14} strokeWidth={3} /> Add Category
                    </button>
                )} />

                {/* CATEGORIES TABLE */}
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
                                {categories.length > 0 ? (
                                categories.map((category) => (
                                        <tr key={category.id} className={`hover:bg-stone-50/50 transition-all group ${localCategories.find(c => c.id === category.id) ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
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



        </AdminLayout>
    );
}
import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { FolderTree, Edit2, Trash2, Tag, Save, X } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import EmptyState from '@/Components/WorkspaceEmptyState';

export default function CategoryManagerTable({ categories }) {
    const { addToast } = useToast();
    const [localCategories, setLocalCategories] = useState(categories || []);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);
    const [confirmingUpdate, setConfirmingUpdate] = useState(null);
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

    return (
        <div className="w-full pt-4">
            <div className="overflow-x-auto no-scrollbar -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                    <div className="overflow-hidden bg-white rounded-2xl border border-stone-200 shadow-sm">
                        <table className="w-full min-w-[640px] text-left border-collapse">
                            <thead className="bg-stone-50 border-b border-stone-100">
                                <tr>
                                    <th className="px-6 py-3.5 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-1/2">Category Name</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-1/4">Products Linked</th>
                                    <th className="px-6 py-3.5 text-[10px] font-bold text-stone-500 uppercase tracking-widest w-1/4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {localCategories.length > 0 ? (
                                    localCategories.map((category) => (
                                        <tr key={category.id} className="hover:bg-stone-50/50 transition-all group">
                                            <td className="px-6 py-4">
                                                {editingCategory === category.id ? (
                                                    <input
                                                        type="text"
                                                        value={editName}
                                                        onChange={(e) => setEditName(e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-clay-300 rounded-lg text-sm focus:ring-2 focus:ring-clay-500/20 outline-none min-h-[44px]"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2.5 min-h-[44px]">
                                                        <div className="p-2 bg-stone-100 rounded-lg text-stone-500 shrink-0">
                                                            <FolderTree size={16} strokeWidth={2} />
                                                        </div>
                                                        <span className="font-bold text-stone-900">{category.name}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-bold ${category.products_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                                    <Tag size={12} />
                                                    {category.products_count} product{category.products_count !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingCategory === category.id ? (
                                                    <div className="flex items-center justify-end gap-2.5">
                                                        <button
                                                            onClick={() => setEditingCategory(null)}
                                                            className="p-2.5 text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                            title="Cancel"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateCategory(category)}
                                                            disabled={isProcessingEdit}
                                                            className="p-2.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition disabled:opacity-50 min-h-[44px] min-w-[44px] flex items-center justify-center shadow-sm"
                                                            title="Save"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                setEditingCategory(category.id);
                                                                setEditName(category.name);
                                                            }}
                                                            className="p-2.5 text-stone-500 hover:text-clay-700 bg-white hover:bg-clay-50 border border-stone-200 hover:border-clay-200 rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                            title="Rename Category"
                                                        >
                                                            <Edit2 size={14} strokeWidth={2.5} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCategory(category)}
                                                            disabled={category.products_count > 0}
                                                            className={`p-2.5 rounded-xl border shadow-sm transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                                                                category.products_count > 0
                                                                    ? 'text-stone-300 bg-stone-50 border-stone-100 cursor-not-allowed'
                                                                    : 'text-stone-500 hover:text-red-700 bg-white hover:bg-red-50 border-stone-200 hover:border-red-200 hover:scale-105 active:scale-95'
                                                            }`}
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
                                        <td colSpan="3" className="px-6 py-12">
                                            <EmptyState
                                                compact
                                                icon={FolderTree}
                                                title="No categories found"
                                                description="Create a new global category for the marketplace."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

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
        </div>
    );
}

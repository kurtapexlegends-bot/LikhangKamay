import React, { useState, useEffect, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import { 
    FolderTree, 
    Edit2, 
    Trash2, 
    Plus, 
    Search
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import TextInput from '@/Components/TextInput';
import EmptyState from '@/Components/WorkspaceEmptyState';
import CategoryTreeItem from './CategoryTreeItem';
import CategoryFormModal from './CategoryFormModal';

export default function CategoryManager({ categories }) {
    const { addToast } = useToast();
    
    // --- CATEGORY LIST STATES ---
    const [localCategories, setLocalCategories] = useState(categories || []);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('Package');
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);
    const [confirmingUpdate, setConfirmingUpdate] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const pendingDeletes = useRef({});

    // --- CREATE CATEGORY MODAL/DRAWER STATES ---
    const [isProcessingAdd, setIsProcessingAdd] = useState(false);
    const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);

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

    // --- ACTIONS ---
    const handleAddCategory = (categoryData, resetCallback) => {
        setIsProcessingAdd(true);
        router.post(route('admin.taxonomy.store'), { name: categoryData.name, icon: categoryData.icon }, {
            preserveScroll: true,
            onSuccess: () => {
                if (resetCallback) resetCallback();
                setIsAddDrawerOpen(false);
                addToast('Category added successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingAdd(false)
        });
    };

    const handleUpdateCategory = (category) => {
        if (!editName.trim() || (editName === category.name && editIcon === category.icon)) {
            setEditingCategory(null);
            return;
        }
        setConfirmingUpdate(category);
    };

    const submitUpdateCategory = () => {
        const category = confirmingUpdate;
        setConfirmingUpdate(null);
        setIsProcessingEdit(true);
        router.patch(route('admin.taxonomy.update', category.id), { name: editName, icon: editIcon }, {
            preserveScroll: true,
            onSuccess: () => {
                setEditingCategory(null);
                addToast('Category updated successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingEdit(false)
        });
    };

    const submitDeleteCategory = () => {
        const category = confirmingDelete;
        setConfirmingDelete(null);
        handleDeleteCategory(category);
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

    // --- SEARCH FILTER ---
    const filteredCategories = useMemo(() => {
        if (!searchTerm.trim()) return localCategories;
        return localCategories.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [localCategories, searchTerm]);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {/* LEFT COLUMN: Categories Inventory List Card */}
                <div className="md:col-span-1 lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-200">
                        {/* Header and Search Box */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-2">
                                <FolderTree className="text-clay-600" size={16} />
                                <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Categories Inventory</h3>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={12} />
                                <TextInput 
                                    placeholder="Search categories..." 
                                    className="pl-8 text-xs py-2 w-full min-h-[38px] bg-stone-50/20"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Category List Rows */}
                        <div className="border border-stone-200/60 rounded-xl divide-y divide-stone-100">
                            {filteredCategories.length > 0 ? (
                                filteredCategories.map((category) => (
                                    <CategoryTreeItem
                                        key={category.id}
                                        category={category}
                                        isEditing={editingCategory === category.id}
                                        editName={editName}
                                        setEditName={setEditName}
                                        editIcon={editIcon}
                                        setEditIcon={setEditIcon}
                                        onStartEdit={() => {
                                            setEditingCategory(category.id);
                                            setEditName(category.name);
                                            setEditIcon(category.icon || 'Package');
                                        }}
                                        onCancelEdit={() => setEditingCategory(null)}
                                        onSaveEdit={() => handleUpdateCategory(category)}
                                        onDelete={() => setConfirmingDelete(category)}
                                        isProcessingEdit={isProcessingEdit}
                                    />
                                ))
                            ) : (
                                <div className="p-12">
                                    <EmptyState
                                        compact
                                        icon={FolderTree}
                                        title="No categories found"
                                        description="No matching global categories were found in the inventory."
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Desktop Create Category Card */}
                <div className="hidden lg:block space-y-6">
                    <CategoryFormModal
                        isInlineCard={true}
                        onSubmit={handleAddCategory}
                        isProcessing={isProcessingAdd}
                        categories={localCategories}
                    />
                </div>

                {/* CONFIRMATION MODAL */}
                <ConfirmationModal
                    isOpen={!!confirmingUpdate}
                    onClose={() => setConfirmingUpdate(null)}
                    onConfirm={submitUpdateCategory}
                    title="Edit Category"
                    message={`Are you sure you want to update the category "${confirmingUpdate?.name}"? This will instantly update ${confirmingUpdate?.products_count || 0} existing products across the marketplace.`}
                    icon={Edit2}
                    iconBg="bg-clay-50 text-clay-600"
                    confirmText="Save Changes"
                    confirmColor="bg-clay-600 hover:bg-clay-700 focus-visible:ring-clay-600/30"
                    isHighRisk={true}
                />

                {/* DELETE CONFIRMATION MODAL */}
                <ConfirmationModal
                    isOpen={!!confirmingDelete}
                    onClose={() => setConfirmingDelete(null)}
                    onConfirm={submitDeleteCategory}
                    title="Delete Category"
                    message={`Are you sure you want to delete "${confirmingDelete?.name}"? Any products assigned to this category will lose their category association.`}
                    icon={Trash2}
                    iconBg="bg-rose-50 text-rose-600"
                    confirmText="Delete Category"
                    confirmColor="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600/30"
                    isVeryHighRisk={true}
                />
            </div>

            {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
            <div className="lg:hidden fixed bottom-6 right-5 z-[80]">
                <button
                    type="button"
                    onClick={() => setIsAddDrawerOpen(true)}
                    className="flex items-center gap-2 bg-clay-700 hover:bg-clay-800 text-white font-bold px-4 py-3.5 rounded-full shadow-2xl active:scale-95 transition-all text-xs border border-clay-600/50"
                >
                    <Plus size={18} strokeWidth={2.5} />
                    <span className="font-extrabold uppercase tracking-wider text-[11px]">Add Category</span>
                </button>
            </div>

            {/* MOBILE SLIDE-UP BOTTOM SHEET FOR ADD CATEGORY */}
            <CategoryFormModal
                isOpen={isAddDrawerOpen}
                onClose={() => setIsAddDrawerOpen(false)}
                onSubmit={handleAddCategory}
                isProcessing={isProcessingAdd}
                categories={localCategories}
            />
        </>
    );
}

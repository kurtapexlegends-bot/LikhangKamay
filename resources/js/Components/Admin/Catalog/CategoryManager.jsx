import React, { useState, useEffect, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import axios from 'axios';
import { 
    FolderTree, 
    Edit2, 
    Trash2, 
    Tag, 
    Save, 
    X, 
    Plus, 
    Search, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    Utensils,
    Coffee,
    Flower2,
    Sprout,
    Home,
    ChefHat,
    Gift,
    Package,
    Sparkles,
    Hammer,
    Heart,
    Flame
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import EmptyState from '@/Components/WorkspaceEmptyState';

const CATEGORY_ICONS_MAP = {
    'Utensils': Utensils,
    'Coffee': Coffee,
    'Flower2': Flower2,
    'Sprout': Sprout,
    'Home': Home,
    'ChefHat': ChefHat,
    'Gift': Gift,
    'Package': Package,
    'Sparkles': Sparkles,
    'Hammer': Hammer,
    'Heart': Heart,
    'Tag': Tag,
    'Flame': Flame,
};

const PRESET_ICONS = [
    { value: 'Package', label: 'Default Box' },
    { value: 'Utensils', label: 'Tableware (Utensils)' },
    { value: 'Coffee', label: 'Drinkware (Coffee)' },
    { value: 'Flower2', label: 'Vases & Jars (Flower)' },
    { value: 'Sprout', label: 'Planters & Pots (Sprout)' },
    { value: 'Home', label: 'Home Decor (Home)' },
    { value: 'ChefHat', label: 'Kitchenware (Chef Hat)' },
    { value: 'Gift', label: 'Artisan Sets (Gift)' },
    { value: 'Sparkles', label: 'Sculptures & Art (Sparkles)' },
    { value: 'Hammer', label: 'Tools (Hammer)' },
    { value: 'Heart', label: 'Custom/Favorites (Heart)' },
    { value: 'Tag', label: 'Sale/Deals (Tag)' },
    { value: 'Flame', label: 'Candles (Flame)' },
];

export default function CategoryManager({ categories }) {
    const { addToast } = useToast();
    
    // --- CATEGORY LIST STATES ---
    const [localCategories, setLocalCategories] = useState(categories || []);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('Package');
    const [isEditIconDropdownOpen, setIsEditIconDropdownOpen] = useState(null);
    const [isProcessingEdit, setIsProcessingEdit] = useState(false);
    const [confirmingUpdate, setConfirmingUpdate] = useState(null);
    const [confirmingDelete, setConfirmingDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const pendingDeletes = useRef({});

    // --- CREATE CATEGORY FORM STATES ---
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryIcon, setNewCategoryIcon] = useState('Package');
    const [isNewIconDropdownOpen, setIsNewIconDropdownOpen] = useState(false);
    const [isProcessingAdd, setIsProcessingAdd] = useState(false);
    const [isNameTaken, setIsNameTaken] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

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

    // --- DEBOUNCED NAME VALIDATION ---
    useEffect(() => {
        if (newCategoryName.trim().length <= 2) {
            setIsNameTaken(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
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
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [newCategoryName]);

    // --- ACTIONS ---
    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim() || isNameTaken) return;

        setIsProcessingAdd(true);
        router.post(route('admin.taxonomy.store'), { name: newCategoryName, icon: newCategoryIcon }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewCategoryName('');
                setNewCategoryIcon('Package');
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
            
            {/* LEFT COLUMN: Categories Inventory List Card */}
            <div className="lg:col-span-2 space-y-6">
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
                                <div key={category.id} className="flex items-center justify-between p-4 bg-white hover:bg-stone-50/30 transition-all group min-h-[64px] first:rounded-t-xl last:rounded-b-xl">
                                    <div className="flex-1 min-w-0 pr-4">
                                        {editingCategory === category.id ? (
                                            <div className="flex items-center gap-2 w-full max-w-xl">
                                                {/* Edit Icon Picker Popover */}
                                                <div className="relative">
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsEditIconDropdownOpen(isEditIconDropdownOpen === category.id ? null : category.id)}
                                                        className="flex items-center justify-center w-10 h-10 rounded-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 transition-all shadow-sm shrink-0"
                                                        title="Select Category Icon"
                                                    >
                                                        {(() => {
                                                            const EditIconComp = CATEGORY_ICONS_MAP[editIcon] || FolderTree;
                                                            return <EditIconComp size={18} />;
                                                        })()}
                                                    </button>
                                                    {isEditIconDropdownOpen === category.id && (
                                                        <>
                                                            <div className="fixed inset-0 z-40" onClick={() => setIsEditIconDropdownOpen(null)} />
                                                            <div className="absolute left-0 mt-2 z-50 bg-white border border-stone-200 rounded-xl shadow-xl p-3 grid grid-cols-4 gap-2 w-56">
                                                                {PRESET_ICONS.map((opt) => {
                                                                    const IconComp = CATEGORY_ICONS_MAP[opt.value];
                                                                    return (
                                                                        <button
                                                                            key={opt.value}
                                                                            type="button"
                                                                            title={opt.label}
                                                                            onClick={() => {
                                                                                setEditIcon(opt.value);
                                                                                setIsEditIconDropdownOpen(null);
                                                                            }}
                                                                            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
                                                                                editIcon === opt.value
                                                                                    ? 'border-clay-600 bg-clay-50/50 text-clay-700'
                                                                                    : 'border-transparent hover:bg-stone-50 text-stone-500'
                                                                            }`}
                                                                        >
                                                                            <IconComp size={18} />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>

                                                {/* Edit Name Input */}
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="flex-1 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-clay-500/20 outline-none min-h-[38px]"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2.5">
                                                <div className="p-2 bg-stone-100 rounded-lg text-stone-500 shrink-0">
                                                    {(() => {
                                                        const IconComponent = CATEGORY_ICONS_MAP[category.icon] || FolderTree;
                                                        return <IconComponent size={14} />;
                                                    })()}
                                                </div>
                                                <span className="font-bold text-xs text-stone-900 truncate">{category.name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-4 shrink-0">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${category.products_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                                            <Tag size={10} />
                                            {category.products_count} product{category.products_count !== 1 ? 's' : ''}
                                        </span>

                                        <div className="flex items-center gap-1.5">
                                            {editingCategory === category.id ? (
                                                <>
                                                    <button
                                                        onClick={() => setEditingCategory(null)}
                                                        className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 border border-transparent transition-all"
                                                        title="Cancel"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateCategory(category)}
                                                        disabled={isProcessingEdit}
                                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent transition-all disabled:opacity-40"
                                                        title="Save"
                                                    >
                                                        <Save size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setEditingCategory(category.id);
                                                            setEditName(category.name);
                                                            setEditIcon(category.icon || 'Package');
                                                        }}
                                                        className="p-1.5 rounded-lg text-clay-650 hover:bg-clay-50/50 border border-transparent transition-all md:opacity-0 md:group-hover:opacity-100"
                                                        title="Edit Category"
                                                    >
                                                        <Edit2 size={12} strokeWidth={2.5} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmingDelete(category)}
                                                        disabled={category.products_count > 0}
                                                        className={`p-1.5 rounded-lg border transition-all md:opacity-0 md:group-hover:opacity-100 ${
                                                            category.products_count > 0
                                                                ? 'text-stone-300 bg-stone-50 border-stone-100 cursor-not-allowed shadow-none'
                                                                : 'text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100/30'
                                                        }`}
                                                        title={category.products_count > 0 ? "Cannot delete category with active products" : "Delete Category"}
                                                    >
                                                        <Trash2 size={12} strokeWidth={2.5} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
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

            {/* RIGHT COLUMN: Sticky Create Category Card */}
            <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-4 shadow-sm sticky top-24 animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75">
                    
                    <div className="flex items-center gap-2">
                        <Plus className="text-clay-600" size={16} />
                        <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Add New Category</h3>
                    </div>

                    <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                        Create a new global category to catalog artisan product listings on the marketplace.
                    </p>

                    <form onSubmit={handleAddCategory} className="space-y-4 pt-2">
                        <div>
                            <InputLabel value="Category Name" className="text-[9px] font-bold text-stone-450 uppercase tracking-wider mb-1.5" />
                            <div className="flex gap-2 items-center">
                                {/* Icon Picker Popover */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsNewIconDropdownOpen(!isNewIconDropdownOpen)}
                                        className="flex items-center justify-center w-11 h-11 rounded-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 transition-all shadow-sm shrink-0 animate-in fade-in zoom-in-95 duration-150"
                                        title="Select Category Icon"
                                    >
                                        {(() => {
                                            const NewIconComp = CATEGORY_ICONS_MAP[newCategoryIcon] || FolderTree;
                                            return <NewIconComp size={20} />;
                                        })()}
                                    </button>
                                    {isNewIconDropdownOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsNewIconDropdownOpen(false)} />
                                            <div className="absolute left-0 mt-2 z-50 bg-white border border-stone-200 rounded-xl shadow-xl p-3 grid grid-cols-4 gap-2 w-56 animate-in fade-in slide-in-from-top-1 duration-150">
                                                {PRESET_ICONS.map((opt) => {
                                                    const IconComp = CATEGORY_ICONS_MAP[opt.value];
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            title={opt.label}
                                                            onClick={() => {
                                                                setNewCategoryIcon(opt.value);
                                                                setIsNewIconDropdownOpen(false);
                                                            }}
                                                            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
                                                                newCategoryIcon === opt.value
                                                                    ? 'border-clay-600 bg-clay-50/50 text-clay-700'
                                                                    : 'border-transparent hover:bg-stone-50 text-stone-500'
                                                            }`}
                                                        >
                                                            <IconComp size={18} />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="relative flex-1">
                                    <TextInput
                                        type="text"
                                        placeholder="e.g., Ceramic Mugs"
                                        className={`block w-full text-xs py-2.5 min-h-[44px] pr-10 ${isNameTaken ? 'border-rose-300 ring-rose-500/10' : 'bg-stone-50/20'}`}
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                        {isValidating ? (
                                            <Loader2 size={14} className="text-stone-400 animate-spin" />
                                        ) : newCategoryName.trim().length > 2 ? (
                                            isNameTaken ? (
                                                <XCircle size={14} className="text-rose-500" />
                                            ) : (
                                                <CheckCircle2 size={14} className="text-emerald-500" />
                                            )
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                            {isNameTaken && (
                                <p className="mt-1.5 text-[9px] font-bold text-rose-550 flex items-center gap-1">
                                    <AlertTriangle size={10} /> This name is already taken.
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessingAdd || !newCategoryName.trim() || isNameTaken}
                            className="w-full py-3 bg-clay-600 hover:bg-clay-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-clay-600/10 border-none text-[10px] font-black uppercase tracking-wider disabled:opacity-50 disabled:active:scale-100 min-h-[44px]"
                        >
                            {isProcessingAdd && <Loader2 size={14} className="animate-spin" />}
                            {isProcessingAdd ? 'Creating...' : 'Create Category'}
                        </button>
                    </form>
                </div>
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
    );
}

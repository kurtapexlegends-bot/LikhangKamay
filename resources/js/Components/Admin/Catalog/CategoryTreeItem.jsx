import React, { useState } from 'react';
import { 
    FolderTree, 
    Edit2, 
    Trash2, 
    Tag, 
    Save, 
    X,
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

export const CATEGORY_ICONS_MAP = {
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

export const PRESET_ICONS = [
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

export default function CategoryTreeItem({
    category,
    isEditing,
    editName,
    setEditName,
    editIcon,
    setEditIcon,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onDelete,
    isProcessingEdit = false,
}) {
    const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);

    const IconComponent = CATEGORY_ICONS_MAP[category.icon] || FolderTree;
    const EditIconComponent = CATEGORY_ICONS_MAP[editIcon] || FolderTree;

    return (
        <div className="flex items-center justify-between p-4 bg-white hover:bg-stone-50/30 transition-all group min-h-[64px] first:rounded-t-xl last:rounded-b-xl">
            <div className="flex-1 min-w-0 pr-4">
                {isEditing ? (
                    <div className="flex items-center gap-2 w-full max-w-xl">
                        {/* Edit Icon Picker Popover */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                                className="flex items-center justify-center w-10 h-10 rounded-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 transition-all shadow-sm shrink-0"
                                title="Select Category Icon"
                            >
                                <EditIconComponent size={18} />
                            </button>
                            {isIconDropdownOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsIconDropdownOpen(false)} />
                                    <div className="absolute left-0 mt-2 z-50 bg-white border border-stone-200 rounded-xl shadow-xl p-3 grid grid-cols-4 gap-2 w-56 animate-in fade-in slide-in-from-top-1 duration-150">
                                        {PRESET_ICONS.map((opt) => {
                                            const IconComp = CATEGORY_ICONS_MAP[opt.value];
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    title={opt.label}
                                                    onClick={() => {
                                                        setEditIcon(opt.value);
                                                        setIsIconDropdownOpen(false);
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
                            <IconComponent size={14} />
                        </div>
                        <span className="font-bold text-xs text-stone-900 truncate">{category.name}</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${category.products_count > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>
                    <Tag size={10} />
                    {category.products_count} <span className="hidden sm:inline">product{category.products_count !== 1 ? 's' : ''}</span>
                </span>

                <div className="flex items-center gap-1">
                    {isEditing ? (
                        <>
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                className="p-2 rounded-lg text-stone-500 hover:bg-stone-100 border border-transparent transition-all min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                                title="Cancel"
                            >
                                <X size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={onSaveEdit}
                                disabled={isProcessingEdit}
                                className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent transition-all disabled:opacity-40 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                                title="Save"
                            >
                                <Save size={14} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onStartEdit}
                                className="p-2 rounded-lg text-clay-650 hover:bg-clay-50/50 border border-transparent transition-all lg:opacity-0 lg:group-hover:opacity-100 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                                title="Edit Category"
                            >
                                <Edit2 size={13} strokeWidth={2.2} />
                            </button>
                            <button
                                type="button"
                                onClick={() => onDelete(category)}
                                disabled={category.products_count > 0}
                                className={`p-2 rounded-lg border transition-all lg:opacity-0 lg:group-hover:opacity-100 active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer ${
                                    category.products_count > 0
                                        ? 'text-stone-300 bg-stone-50 border-stone-100 cursor-not-allowed shadow-none'
                                        : 'text-rose-600 hover:bg-rose-50 border-transparent hover:border-rose-100/30'
                                }`}
                                title={category.products_count > 0 ? 'Cannot delete category with active products' : 'Delete Category'}
                            >
                                <Trash2 size={13} strokeWidth={2.2} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

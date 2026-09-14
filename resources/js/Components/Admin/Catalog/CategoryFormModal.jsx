import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Plus, 
    Loader2, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    FolderTree
} from 'lucide-react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { CATEGORY_ICONS_MAP, PRESET_ICONS } from './CategoryTreeItem';

export default function CategoryFormModal({
    isOpen,
    onClose,
    onSubmit,
    isProcessing = false,
    categories = [],
    isInlineCard = false,
}) {
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('Package');
    const [parentId, setParentId] = useState('');
    const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);
    const [isNameTaken, setIsNameTaken] = useState(false);
    const [isValidating, setIsValidating] = useState(false);

    // Debounced name availability check
    useEffect(() => {
        if (name.trim().length <= 2) {
            setIsNameTaken(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsValidating(true);
            try {
                const response = await axios.post(route('api.validate-constraint'), {
                    type: 'category_name_availability',
                    value: name
                });
                setIsNameTaken(!response.data.valid);
            } catch (e) {
                console.error("Validation failed", e);
            } finally {
                setIsValidating(false);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [name]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || isNameTaken || isProcessing) return;

        onSubmit({
            name,
            icon,
            parent_id: parentId || null,
        }, () => {
            setName('');
            setIcon('Package');
            setParentId('');
            if (onClose) onClose();
        });
    };

    const SelectedIcon = CATEGORY_ICONS_MAP[icon] || FolderTree;

    const formBody = (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
                <InputLabel value="Category Name" className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5" />
                <div className="flex gap-2 items-center">
                    {/* Icon Picker Popover */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                            className="flex items-center justify-center w-11 h-11 rounded-xl border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 transition-all shadow-sm shrink-0"
                            title="Select Category Icon"
                        >
                            <SelectedIcon size={20} />
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
                                                    setIcon(opt.value);
                                                    setIsIconDropdownOpen(false);
                                                }}
                                                className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${
                                                    icon === opt.value
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
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            {isValidating ? (
                                <Loader2 size={14} className="text-stone-400 animate-spin" />
                            ) : name.trim().length > 2 ? (
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

            {categories.length > 0 && (
                <div>
                    <InputLabel value="Parent Category (Optional)" className="text-[9px] font-bold text-stone-500 uppercase tracking-wider mb-1.5" />
                    <select
                        value={parentId}
                        onChange={(e) => setParentId(e.target.value)}
                        className="block w-full text-xs py-2.5 px-3 min-h-[42px] bg-white border border-stone-300 rounded-xl font-medium text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10"
                    >
                        <option value="">Top Level Category (No Parent)</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            )}

            <button
                type="submit"
                disabled={isProcessing || !name.trim() || isNameTaken}
                className="w-full py-3 bg-clay-600 hover:bg-clay-700 text-white rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-clay-600/10 border-none text-[10px] font-black uppercase tracking-wider disabled:opacity-50 disabled:active:scale-100 min-h-[44px] cursor-pointer"
            >
                {isProcessing && <Loader2 size={14} className="animate-spin" />}
                {isProcessing ? 'Creating...' : 'Create Category'}
            </button>
        </form>
    );

    if (isInlineCard) {
        return (
            <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-4 shadow-sm sticky top-24 animate-in fade-in slide-in-from-bottom-2 duration-200 delay-75">
                <div className="flex items-center gap-2">
                    <Plus className="text-clay-600" size={16} />
                    <h3 className="text-[10px] font-bold text-stone-900 uppercase tracking-wider">Add New Category</h3>
                </div>

                <p className="text-[10px] text-stone-500 leading-relaxed font-medium">
                    Create a new global category to catalog artisan product listings on the marketplace.
                </p>

                {formBody}
            </div>
        );
    }

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title="Add New Category"
            position="bottom"
        >
            <div className="space-y-4 p-1">
                <p className="text-xs text-stone-500 leading-relaxed font-medium">
                    Create a new global category to catalog artisan product listings on the marketplace.
                </p>

                {formBody}
            </div>
        </SlideOverDrawer>
    );
}

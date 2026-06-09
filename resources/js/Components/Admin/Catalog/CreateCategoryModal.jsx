import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, XCircle, CheckCircle2, AlertTriangle, Settings, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/Components/ToastContext';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import Modal from '@/Components/Modal';

export default function CreateCategoryModal({ show, onClose }) {
    const { addToast } = useToast();
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isProcessingAdd, setIsProcessingAdd] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isNameTaken, setIsNameTaken] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Debounce API Validation Check for Category Name
    useEffect(() => {
        if (!show) {
            setNewCategoryName('');
            setIsNameTaken(false);
            setIsValidating(false);
            setShowAdvanced(false);
            return;
        }

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
    }, [newCategoryName, show]);

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (!newCategoryName.trim() || isNameTaken) return;

        setIsProcessingAdd(true);
        router.post(route('admin.taxonomy.store'), { name: newCategoryName }, {
            preserveScroll: true,
            onSuccess: () => {
                setNewCategoryName('');
                onClose();
                addToast('Category added successfully.', 'success');
            },
            onError: (errors) => {
                if (errors.name) addToast(errors.name, 'error');
            },
            onFinish: () => setIsProcessingAdd(false)
        });
    };

    const renderForm = () => (
        <form onSubmit={handleAddCategory} className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-widest mb-2">
                    Category Name
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Ceramic Mugs"
                        className={`w-full px-4 py-3 bg-stone-50 border ${isNameTaken ? 'border-rose-300 ring-rose-500/10' : 'border-stone-200 ring-clay-500/10'} rounded-xl text-sm focus:ring-4 focus:bg-white outline-none transition-all pr-10 min-h-[44px]`}
                        autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
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
            <div>
                <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-stone-400 hover:text-stone-600 transition-colors focus:outline-none min-h-[44px]"
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
                                        className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs outline-none focus:border-clay-300 transition-colors min-h-[44px]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1.5">
                                        Internal Priority
                                    </label>
                                    <select className="w-full px-3 py-2 bg-stone-50/50 border border-stone-200 rounded-xl text-xs outline-none focus:border-clay-300 transition-colors min-h-[44px]">
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 mt-6">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-bold text-stone-500 hover:text-stone-750 transition min-h-[44px]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isProcessingAdd || !newCategoryName.trim() || isNameTaken}
                    className="bg-clay-600 hover:bg-clay-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center gap-2 min-h-[44px]"
                >
                    {isProcessingAdd && <Loader2 size={16} className="animate-spin" />}
                    {isProcessingAdd ? 'Saving...' : 'Add Category'}
                </button>
            </div>
        </form>
    );

    if (isMobile) {
        return (
            <SlideOverDrawer
                show={show}
                onClose={onClose}
                title="Add New Category"
                widthClass="max-w-md"
            >
                <p className="text-xs text-stone-500 mb-5">Create a new global category for the marketplace.</p>
                {renderForm()}
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-6">
                <h2 className="text-lg font-bold text-stone-900 mb-1">Add New Category</h2>
                <p className="text-xs text-stone-500 mb-5">Create a new global category for the marketplace.</p>
                {renderForm()}
            </div>
        </Modal>
    );
}

import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { Zap, Package, DollarSign, CheckCircle2, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function ProductQuickEditDrawer({
    isOpen,
    onClose,
    product,
    canEditProducts = true,
}) {
    const { addToast } = useToast();
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [status, setStatus] = useState('Active');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (product && isOpen) {
            setPrice(product.price !== undefined ? String(product.price) : '');
            setStock(product.stock !== undefined ? String(product.stock) : '');
            setStatus(product.status || 'Active');
            setErrorMessage('');
        }
    }, [product, isOpen]);

    if (!product) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEditProducts || isSubmitting) return;

        const numPrice = parseFloat(price);
        const numStock = parseInt(stock, 10);

        if (isNaN(numPrice) || numPrice <= 0) {
            setErrorMessage('Please enter a valid price greater than ₱0.00.');
            return;
        }

        if (isNaN(numStock) || numStock < 0) {
            setErrorMessage('Please enter a valid stock quantity (0 or greater).');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        const formData = new FormData();
        formData.append('name', product.name || 'Handcrafted Pottery');
        formData.append('category', product.category || 'Vases & Vessels');
        formData.append('price', numPrice);
        formData.append('cost_price', product.cost_price || 0);
        formData.append('stock', numStock);
        formData.append('status', status);
        if (product.sku) formData.append('sku', product.sku);
        if (product.description) formData.append('description', product.description);
        if (product.production_method) formData.append('production_method', product.production_method);
        formData.append('_method', 'POST');

        router.post(route('products.update', product.id), formData, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                addToast(`Quick updated "${product.name}" successfully!`, 'success');
                onClose();
            },
            onError: (errors) => {
                setIsSubmitting(false);
                const first = Object.values(errors)[0] || 'Failed to update product.';
                setErrorMessage(first);
                addToast(first, 'error');
            },
        });
    };

    return (
        <SlideOverDrawer
            show={isOpen}
            onClose={onClose}
            title="Quick Edit Price & Stock"
            subtitle={product.sku ? `SKU: ${product.sku}` : undefined}
            widthClass="max-w-md"
            footer={
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting || !canEditProducts}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 active:scale-95 transition shadow-sm disabled:opacity-50 min-h-[42px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={14} />
                                <span>Save Changes</span>
                            </>
                        )}
                    </button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* Product Summary Header */}
                <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 p-3.5 flex items-center gap-3">
                    <img
                        src={product.img ? (product.img.startsWith('http') || product.img.startsWith('/storage') ? product.img : `/storage/${product.img}`) : '/images/no-image.png'}
                        alt={product.name}
                        className="h-12 w-12 rounded-xl object-cover border border-stone-200 bg-white shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-extrabold text-stone-900 truncate">{product.name}</h4>
                        <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">{product.category || 'General Craft'}</p>
                    </div>
                </div>

                {errorMessage && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Base Price Input */}
                <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                        Selling Price (PHP ₱)
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">
                            ₱
                        </span>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            disabled={!canEditProducts || isSubmitting}
                            className="w-full rounded-xl border border-stone-200 pl-8 pr-3 py-2.5 text-sm font-extrabold text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                            placeholder="0.00"
                            required
                        />
                    </div>
                    <p className="text-[10px] text-stone-400">Current marketplace listing price</p>
                </div>

                {/* Stock Quantity Input */}
                <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                        Available Stock Quantity
                    </label>
                    <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400">
                            <Package size={14} />
                        </span>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            disabled={!canEditProducts || isSubmitting}
                            className="w-full rounded-xl border border-stone-200 pl-9 pr-3 py-2.5 text-sm font-extrabold text-stone-900 focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
                            placeholder="0"
                            required
                        />
                    </div>
                    <p className="text-[10px] text-stone-400">Total physical units ready to ship or pickup</p>
                </div>

                {/* Status Toggle */}
                <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600">
                        Listing Visibility Status
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {['Active', 'Draft', 'Archived'].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatus(s)}
                                className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                                    status === s
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-2xs'
                                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tip callout */}
                <div className="p-3 bg-stone-50 border border-stone-200/70 rounded-xl text-[11px] text-stone-500 leading-relaxed">
                    Need to modify 3D models, clay recipes, or dimensions? Use the full <strong>Edit</strong> button in the products table.
                </div>
            </form>
        </SlideOverDrawer>
    );
}

/* global route */
import React, { useEffect, useMemo } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    X, Pencil, Loader2, AlertTriangle, Layers, 
    DollarSign, Sliders, Warehouse, Lock, CheckCircle2 
} from 'lucide-react';

const modalFieldClass = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-900 placeholder-stone-400 shadow-2xs transition focus:border-clay-500 focus:ring-clay-500 min-h-[42px]';
const modalSelectClass = 'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-900 shadow-2xs transition focus:border-clay-500 focus:ring-clay-500 min-h-[42px] cursor-pointer';

export default function EditSupplyModal({
    show,
    onClose,
    canEditProcurement,
    supply,
    categoriesList = [],
    unitsList = [],
    onSuccess,
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        category: '',
        unit: 'pcs',
        min_stock: 10,
        max_stock: 500,
        unit_cost: '',
        supplier: '',
        notes: '',
    });

    useEffect(() => {
        if (supply && show) {
            setData({
                name: supply.name || '',
                category: supply.category || categoriesList[0] || 'Finished Goods',
                unit: supply.unit || 'pcs',
                min_stock: supply.min_stock ?? 10,
                max_stock: supply.max_stock ?? 500,
                unit_cost: supply.unit_cost ?? '',
                supplier: supply.supplier || '',
                notes: supply.notes || '',
            });
        }
    }, [supply, show]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!supply || !canEditProcurement) return;

        post(route('supplies.update', supply.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
                if (onSuccess) onSuccess();
            },
        });
    };

    const currentStockNum = Number(supply?.quantity) || 0;
    const unitCostNum = Number(data.unit_cost) || 0;
    const totalValuation = useMemo(() => currentStockNum * unitCostNum, [currentStockNum, unitCostNum]);

    const minStockNum = Number(data.min_stock) || 0;
    const maxStockNum = Number(data.max_stock) || 500;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={handleSubmit} noValidate className="flex max-h-[88vh] flex-col bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-center px-6 py-4 border-b border-stone-200/80 bg-stone-50/70">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-clay-200/60 bg-clay-50 text-clay-700">
                            <Pencil size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-stone-900 tracking-tight">Update Supply Details</h2>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-stone-100 text-stone-700 border border-stone-200">
                                    {supply?.sku || 'Item'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer min-h-[42px] min-w-[42px]"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Section 1: Item Identity & Classification */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-stone-100 text-xs font-bold text-stone-800">
                            <Layers size={14} className="text-clay-600" />
                            <span>Material Identity &amp; Classification</span>
                        </div>

                        <div>
                            <label htmlFor="edit-supply-name-input" className="block text-xs font-bold text-stone-700 mb-1">
                                Supply Item Name <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                id="edit-supply-name-input"
                                type="text" 
                                disabled={!canEditProcurement}
                                className={`${modalFieldClass} ${errors.name ? 'border-rose-300 bg-rose-50/40 focus:ring-rose-500 focus:border-rose-500' : ''}`}
                                placeholder="e.g. Red Terracotta Clay"
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                required 
                            />
                            {errors.name && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* SKU (Read Only) */}
                            <div>
                                <label className="block text-[11px] font-bold text-stone-500 mb-1 flex items-center gap-1">
                                    <Lock size={11} className="text-stone-400" />
                                    Catalog SKU
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-100/70 px-3.5 py-2.5 text-xs font-mono font-bold text-stone-600 cursor-not-allowed min-h-[42px]"
                                    value={supply?.sku || 'N/A'} 
                                    disabled
                                    readOnly
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label htmlFor="edit-supply-category-select" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Category
                                </label>
                                <select 
                                    id="edit-supply-category-select"
                                    disabled={!canEditProcurement}
                                    className={`${modalSelectClass} ${errors.category ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                    value={data.category} 
                                    onChange={e => setData('category', e.target.value)}
                                >
                                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                {errors.category && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.category}</p>}
                            </div>

                            {/* Unit */}
                            <div>
                                <label htmlFor="edit-supply-unit-select" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Measurement Unit
                                </label>
                                <select 
                                    id="edit-supply-unit-select"
                                    disabled={!canEditProcurement}
                                    className={`${modalSelectClass} ${errors.unit ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                    value={data.unit} 
                                    onChange={e => setData('unit', e.target.value)}
                                >
                                    {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                {errors.unit && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.unit}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Stock Levels & Thresholds */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                                <Sliders size={14} className="text-clay-600" />
                                <span>Inventory Levels &amp; Thresholds</span>
                            </div>
                            <span className="text-[11px] font-bold text-stone-500">
                                Unit: <strong className="text-stone-800">{data.unit || 'pcs'}</strong>
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Current Stock (Read Only) */}
                            <div>
                                <label className="block text-[11px] font-bold text-stone-500 mb-1">
                                    Current Stock
                                </label>
                                <div className="w-full rounded-xl border border-stone-200 bg-stone-100/70 px-3.5 py-2.5 text-xs font-bold text-stone-800 min-h-[42px] flex items-center">
                                    {supply?.quantity ?? 0} {supply?.unit || data.unit}
                                </div>
                            </div>

                            {/* Min Stock */}
                            <div>
                                <label htmlFor="edit-supply-min-stock-input" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Min Alert Level <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    id="edit-supply-min-stock-input"
                                    type="number" 
                                    min="0"
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} font-bold ${errors.min_stock ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                    value={data.min_stock} 
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                    onChange={e => setData('min_stock', e.target.value.replace(/[-.]/g, ""))} 
                                    required 
                                />
                                {errors.min_stock && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.min_stock}</p>}
                            </div>

                            {/* Max Stock */}
                            <div>
                                <label htmlFor="edit-supply-max-stock-input" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Max Capacity
                                </label>
                                <input 
                                    id="edit-supply-max-stock-input"
                                    type="number" 
                                    min="1"
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} font-bold ${errors.max_stock ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                    value={data.max_stock} 
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                    onChange={e => setData('max_stock', e.target.value.replace(/[-.]/g, ""))} 
                                />
                                {errors.max_stock && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.max_stock}</p>}
                            </div>
                        </div>

                        {/* Inventory Threshold Summary Bar */}
                        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 flex items-center justify-between text-xs">
                            <span className="text-stone-500 font-medium">
                                Alert triggers when stock drops to or below <strong className="text-stone-800">{minStockNum} {data.unit}</strong>
                            </span>
                            <span className="font-bold text-stone-700">
                                Storage Ceiling: {maxStockNum} {data.unit}
                            </span>
                        </div>
                    </div>

                    {/* Section 3: Costing & Live Valuation */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                                <DollarSign size={14} className="text-clay-600" />
                                <span>Unit Cost &amp; Inventory Valuation</span>
                            </div>
                            <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                PHP (₱)
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                            <div>
                                <label htmlFor="edit-supply-unit-cost-input" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Unit Cost (₱ per {data.unit || 'unit'})
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">₱</span>
                                    <input 
                                        id="edit-supply-unit-cost-input"
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        disabled={!canEditProcurement}
                                        className={`${modalFieldClass} pl-8 font-bold ${errors.unit_cost ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                        placeholder="0.00"
                                        value={data.unit_cost} 
                                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                        onChange={e => setData('unit_cost', e.target.value.replace(/-/g, ""))} 
                                    />
                                </div>
                                {errors.unit_cost && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.unit_cost}</p>}
                            </div>

                            {/* Live Valuation Card */}
                            <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
                                    Current On-Hand Asset Value
                                </span>
                                <div className="text-base font-black text-stone-900 tracking-tight">
                                    ₱{totalValuation.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <span className="text-[11px] text-stone-500 font-medium block">
                                    {currentStockNum} {data.unit || 'pcs'} in stock @ ₱{unitCostNum.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Sourcing & Storage */}
                    <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-stone-100 text-xs font-bold text-stone-800">
                            <Warehouse size={14} className="text-clay-600" />
                            <span>Supplier &amp; Handling Specifications</span>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label htmlFor="edit-supply-supplier-input" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Supplier Name / Vendor
                                </label>
                                <input 
                                    id="edit-supply-supplier-input"
                                    type="text" 
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} ${errors.supplier ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                    placeholder="e.g. Luzon Artisan Pottery Supplies Co."
                                    value={data.supplier} 
                                    onChange={e => setData('supplier', e.target.value)} 
                                />
                                {errors.supplier && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.supplier}</p>}
                            </div>

                            <div>
                                <label htmlFor="edit-supply-notes-textarea" className="block text-[11px] font-bold text-stone-600 mb-1">
                                    Handling &amp; Storage Notes
                                </label>
                                <textarea 
                                    id="edit-supply-notes-textarea"
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} resize-none min-h-[70px] font-medium ${errors.notes ? 'border-rose-300 bg-rose-50/40' : ''}`}
                                    rows={2}
                                    placeholder="Storage specifications, grade, batch details, or special handling..."
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)}
                                />
                                {errors.notes && <p className="mt-1 text-xs text-rose-600 font-medium">{errors.notes}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between gap-3 border-t border-stone-200/80 bg-stone-50/70 px-6 py-3.5">
                    <div className="text-xs text-stone-500 font-medium truncate">
                        {Object.keys(errors).length > 0 ? (
                            <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                <AlertTriangle size={14} /> Please resolve highlighted fields.
                            </span>
                        ) : (
                            <span className="text-stone-600 font-semibold truncate">
                                {data.name ? `${data.name} • ${currentStockNum} ${data.unit}` : 'Supply Details'}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={processing}
                            className="px-4 py-2 text-xs text-stone-700 font-bold bg-white border border-stone-200 hover:bg-stone-50 rounded-xl transition min-h-[42px] cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={!canEditProcurement || processing} 
                            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs bg-clay-700 hover:bg-clay-800 active:scale-95 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 min-h-[42px] cursor-pointer"
                        >
                            {processing ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Saving Changes...</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={14} />
                                    <span>Save Changes</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

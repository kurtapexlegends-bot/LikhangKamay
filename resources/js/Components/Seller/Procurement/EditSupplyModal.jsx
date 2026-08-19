import React, { useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    X, Pencil, Loader2, AlertTriangle 
} from 'lucide-react';

const modalFieldClass = 'w-full rounded-xl border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-800 placeholder-stone-400 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px]';
const modalSelectClass = 'w-full rounded-xl border-stone-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-stone-800 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] cursor-pointer';

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

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-start px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700">
                            <Pencil size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-stone-900 tracking-tight">Update Supply Details</h2>
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest bg-stone-100 text-stone-600 border border-stone-200">
                                    {supply?.sku || 'Item'}
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-0.5 font-medium">
                                Modify catalog specifications and inventory thresholds.
                            </p>
                        </div>
                    </div>

                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-50 transition min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px]"
                        title="Close Modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {/* Section 1: Basic Information */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                            Basic Supply Details
                        </h3>
                        <div className="grid gap-5 md:grid-cols-2">
                            {/* SKU (Read Only) */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">Item SKU (Catalog Code)</label>
                                <input 
                                    type="text" 
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-mono font-bold text-stone-500 cursor-not-allowed min-h-[44px] shadow-none"
                                    value={supply?.sku || 'N/A'} 
                                    disabled
                                    readOnly
                                />
                            </div>

                            {/* Name */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Item Name</label>
                                <input 
                                    type="text" 
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} ${errors.name ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    placeholder="e.g. Red Terracotta Clay"
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    required 
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
                            </div>

                            {/* Category */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Category</label>
                                <select 
                                    disabled={!canEditProcurement}
                                    className={`${modalSelectClass} ${errors.category ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    value={data.category} 
                                    onChange={e => setData('category', e.target.value)}
                                >
                                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                {errors.category && <p className="mt-1 text-xs text-red-500 font-medium">{errors.category}</p>}
                            </div>

                            {/* Unit */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Measurement Unit</label>
                                <select 
                                    disabled={!canEditProcurement}
                                    className={`${modalSelectClass} ${errors.unit ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    value={data.unit} 
                                    onChange={e => setData('unit', e.target.value)}
                                >
                                    {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                                {errors.unit && <p className="mt-1 text-xs text-red-500 font-medium">{errors.unit}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Stock Levels & Valuation */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                            Stock Thresholds &amp; Valuation
                        </h3>
                        <div className="grid gap-5 md:grid-cols-3">
                            {/* Current Stock */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">Current Stock</label>
                                <div className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-xs font-bold text-stone-700 min-h-[44px] flex items-center shadow-none">
                                    {supply?.quantity ?? 0} {supply?.unit}
                                </div>
                            </div>

                            {/* Min Stock */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Min Alert Level</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} font-bold ${errors.min_stock ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    value={data.min_stock} 
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                    onChange={e => setData('min_stock', e.target.value.replace(/[-.]/g, ""))} 
                                    required 
                                />
                                {errors.min_stock && <p className="mt-1 text-xs text-red-500 font-medium">{errors.min_stock}</p>}
                            </div>

                            {/* Max Stock */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Max Capacity</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} font-bold ${errors.max_stock ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    value={data.max_stock} 
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                    onChange={e => setData('max_stock', e.target.value.replace(/[-.]/g, ""))} 
                                />
                                {errors.max_stock && <p className="mt-1 text-xs text-red-500 font-medium">{errors.max_stock}</p>}
                            </div>

                            {/* Unit Cost */}
                            <div className="md:col-span-3">
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Unit Cost (₱)</label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">₱</span>
                                    <input 
                                        type="number" 
                                        min="0"
                                        step="0.01"
                                        disabled={!canEditProcurement}
                                        className={`${modalFieldClass} pl-8 font-semibold ${errors.unit_cost ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                        placeholder="0.00"
                                        value={data.unit_cost} 
                                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                        onChange={e => setData('unit_cost', e.target.value.replace(/-/g, ""))} 
                                    />
                                </div>
                                {errors.unit_cost && <p className="mt-1 text-xs text-red-500 font-medium">{errors.unit_cost}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Sourcing & Notes */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                            Supplier &amp; Sourcing
                        </h3>
                        <div className="grid gap-5">
                            {/* Supplier */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Supplier Name</label>
                                <input 
                                    type="text" 
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} ${errors.supplier ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    placeholder="e.g. Luzon Artisan Pottery Supplies Co."
                                    value={data.supplier} 
                                    onChange={e => setData('supplier', e.target.value)} 
                                />
                                {errors.supplier && <p className="mt-1 text-xs text-red-500 font-medium">{errors.supplier}</p>}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Notes &amp; Handling</label>
                                <textarea 
                                    disabled={!canEditProcurement}
                                    className={`${modalFieldClass} resize-none min-h-[75px] font-medium ${errors.notes ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''}`}
                                    rows={2}
                                    placeholder="Storage specifications, grade, batch details, or special handling..."
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)}
                                />
                                {errors.notes && <p className="mt-1 text-xs text-red-500 font-medium">{errors.notes}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-between gap-3 border-t border-stone-100 bg-[#FDFBF9] px-6 py-4">
                    <div className="text-xs text-stone-500 font-medium">
                        {Object.keys(errors).length > 0 && (
                            <span className="text-rose-600 font-bold flex items-center gap-1.5">
                                <AlertTriangle size={14} /> Please resolve highlighted fields.
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={processing}
                            className="px-5 py-2.5 text-xs text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition min-h-[44px] sm:min-h-[38px] flex items-center justify-center"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={!canEditProcurement || processing} 
                            className="px-6 py-2.5 text-xs bg-clay-600 hover:bg-clay-700 active:scale-95 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 min-h-[44px] sm:min-h-[38px] flex items-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Saving Changes...</span>
                                </>
                            ) : (
                                <span>Save Changes</span>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}

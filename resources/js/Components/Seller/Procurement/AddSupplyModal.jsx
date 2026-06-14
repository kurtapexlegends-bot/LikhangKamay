import React from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import { AlertCircle, Loader2, CheckCircle, X } from 'lucide-react';

export default function AddSupplyModal({
    show,
    onClose,
    canEditProcurement,
    categoriesList,
    unitsList,
    data,
    setData,
    errors,
    processing,
    onSubmit,
    skuValidation
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <form onSubmit={onSubmit} className="p-5">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Add New Supply</h2>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Item SKU" />
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className={`w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition pr-10 min-h-[38px] ${skuValidation.isValid === false ? 'border-red-300 bg-red-50' : ''}`} 
                                    placeholder="e.g., CLAY-TER-01"
                                    value={data.sku} 
                                    onChange={e => setData('sku', e.target.value)} 
                                    required 
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                    {data.sku && (
                                        skuValidation.isValid === null ? (
                                            <Loader2 size={14} className="animate-spin text-gray-400" />
                                        ) : skuValidation.isValid ? (
                                            <CheckCircle size={14} className="text-emerald-500" />
                                        ) : (
                                            <AlertCircle size={14} className="text-red-500" />
                                        )
                                    )}
                                </div>
                            </div>
                            {skuValidation.isValid === false && (
                                <p className="mt-1 text-[10px] font-bold text-red-600 uppercase tracking-tight">
                                    {skuValidation.message}
                                </p>
                            )}
                            {errors.sku && <p className="mt-1 text-xs text-red-500 font-medium">{errors.sku}</p>}
                        </div>

                        <div className="sm:col-span-2">
                            <InputLabel value="Item Name" />
                            <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                                placeholder="e.g., Terracotta Clay"
                                value={data.name} 
                                onChange={e => setData('name', e.target.value)} 
                                required 
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
                        </div>
                        <div>
                            <InputLabel value="Category" />
                            <select 
                                disabled={!canEditProcurement}
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                                value={data.category} 
                                onChange={e => setData('category', e.target.value)}
                            >
                                {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <InputLabel value="Quantity" />
                            <input 
                                type="number" 
                                disabled={!canEditProcurement}
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                                value={data.quantity} 
                                onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                onChange={e => setData('quantity', e.target.value.replace(/[-.]/g, ""))} 
                                required 
                                min="0"
                            />
                        </div>
                        <div>
                            <InputLabel value="Unit" />
                            <select 
                                disabled={!canEditProcurement}
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                                value={data.unit} 
                                onChange={e => setData('unit', e.target.value)}
                            >
                                {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <InputLabel value="Unit Cost (₱)" />
                            <input 
                                type="number" 
                                min="0"
                                step="0.01"
                                disabled={!canEditProcurement}
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                                placeholder="0.00"
                                value={data.unit_cost} 
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={e => setData('unit_cost', e.target.value.replace(/-/g, ""))} 
                            />
                        </div>
                        <div>
                            <InputLabel value="Supplier" />
                            <input 
                                type="text" 
                                disabled={!canEditProcurement}
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                                placeholder="Supplier name"
                                value={data.supplier} 
                                onChange={e => setData('supplier', e.target.value)} 
                            />
                        </div>
                    </div>

                    <div>
                        <InputLabel value="Notes" />
                        <textarea 
                            disabled={!canEditProcurement}
                            className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition resize-none" 
                            rows={2}
                            placeholder="Optional notes..."
                            value={data.notes} 
                            onChange={e => setData('notes', e.target.value)}
                        />
                    </div>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3 pt-3 border-t border-gray-100 items-stretch sm:items-center">
                    {Object.keys(errors).length > 0 && (
                        <p className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 mb-2 sm:mb-0">
                            <AlertCircle size={13} />
                            Review the highlighted supply fields first.
                        </p>
                    )}
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={!canEditProcurement || processing} 
                        className="px-4 py-2 text-xs bg-clay-600 text-white rounded-lg font-bold hover:bg-clay-700 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                    >
                        {processing ? 'Adding...' : 'Add Supply'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

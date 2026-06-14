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
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <form onSubmit={onSubmit} className="p-6 bg-[#FDFBF9]">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-stone-100">
                    <div>
                        <h2 className="text-base font-black text-stone-900 tracking-tight">Add New Supply Item</h2>
                        <p className="text-xs text-stone-500 mt-1">Register a new raw material or tool in the workspace catalog.</p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="text-stone-400 hover:text-stone-600 hover:bg-stone-100/80 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
                        title="Close Modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-6">
                    {/* Section 1: Supply Identity */}
                    <div>
                        <h3 className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-4">Supply Identity</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel value="Item SKU" className="text-stone-700 text-xs font-bold mb-1" />
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        className={`w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition pr-10 min-h-[44px] ${skuValidation.isValid === false ? 'border-red-300 bg-red-50' : ''}`} 
                                        placeholder="e.g., CLAY-TER-01"
                                        value={data.sku} 
                                        onChange={e => setData('sku', e.target.value)} 
                                        required 
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                                        {data.sku && (
                                            skuValidation.isValid === null ? (
                                                <Loader2 size={16} className="animate-spin text-stone-400" />
                                            ) : skuValidation.isValid ? (
                                                <CheckCircle size={16} className="text-emerald-500" />
                                            ) : (
                                                <AlertCircle size={16} className="text-red-500" />
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

                            <div>
                                <InputLabel value="Item Name" className="text-stone-700 text-xs font-bold mb-1" />
                                <input 
                                    type="text" 
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition min-h-[44px]" 
                                    placeholder="e.g., Terracotta Clay"
                                    value={data.name} 
                                    onChange={e => setData('name', e.target.value)} 
                                    required 
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
                            </div>

                            <div className="md:col-span-2">
                                <InputLabel value="Category" className="text-stone-700 text-xs font-bold mb-1" />
                                <select 
                                    disabled={!canEditProcurement}
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition min-h-[44px] cursor-pointer" 
                                    value={data.category} 
                                    onChange={e => setData('category', e.target.value)}
                                >
                                    {categoriesList.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-stone-100" />

                    {/* Section 2: Inventory & Cost Details */}
                    <div>
                        <h3 className="text-[10px] font-bold text-stone-400 tracking-widest uppercase mb-4">Inventory & Cost Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <InputLabel value="Initial Quantity" className="text-stone-700 text-xs font-bold mb-1" />
                                <input 
                                    type="number" 
                                    disabled={!canEditProcurement}
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition min-h-[44px]" 
                                    value={data.quantity} 
                                    onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                    onChange={e => setData('quantity', e.target.value.replace(/[-.]/g, ""))} 
                                    required 
                                    min="0"
                                />
                            </div>

                            <div>
                                <InputLabel value="Packaging Unit" className="text-stone-700 text-xs font-bold mb-1" />
                                <select 
                                    disabled={!canEditProcurement}
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition min-h-[44px] cursor-pointer" 
                                    value={data.unit} 
                                    onChange={e => setData('unit', e.target.value)}
                                >
                                    {unitsList.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>

                            <div>
                                <InputLabel value="Unit Cost (₱)" className="text-stone-700 text-xs font-bold mb-1" />
                                <input 
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    disabled={!canEditProcurement}
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition min-h-[44px]" 
                                    placeholder="0.00"
                                    value={data.unit_cost} 
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={e => setData('unit_cost', e.target.value.replace(/-/g, ""))} 
                                />
                            </div>

                            <div>
                                <InputLabel value="Supplier" className="text-stone-700 text-xs font-bold mb-1" />
                                <input 
                                    type="text" 
                                    disabled={!canEditProcurement}
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition min-h-[44px]" 
                                    placeholder="Supplier name"
                                    value={data.supplier} 
                                    onChange={e => setData('supplier', e.target.value)} 
                                />
                            </div>

                            <div className="md:col-span-2">
                                <InputLabel value="Notes" className="text-stone-700 text-xs font-bold mb-1" />
                                <textarea 
                                    disabled={!canEditProcurement}
                                    className="w-full border-stone-200 bg-white rounded-xl text-xs py-2.5 focus:border-clay-500 focus:ring-clay-500/20 shadow-sm transition resize-none min-h-[80px]" 
                                    rows={2}
                                    placeholder="Optional notes regarding supply specifications or instructions..."
                                    value={data.notes} 
                                    onChange={e => setData('notes', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-stone-100 items-stretch sm:items-center">
                    {Object.keys(errors).length > 0 && (
                        <p className="mr-auto inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700 mb-2 sm:mb-0">
                            <AlertCircle size={13} />
                            Review highlighted errors first.
                        </p>
                    )}
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-5 py-2.5 text-xs text-stone-500 font-bold border border-stone-200 bg-white hover:bg-stone-50 rounded-xl transition min-h-[44px] flex items-center justify-center sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={!canEditProcurement || processing} 
                        className="px-6 py-2.5 text-xs bg-clay-600 hover:bg-clay-700 text-white rounded-xl font-bold transition shadow-md shadow-clay-600/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center sm:w-auto"
                    >
                        {processing ? 'Adding...' : 'Add Supply'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

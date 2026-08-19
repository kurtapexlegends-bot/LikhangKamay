import React from 'react';
import Modal from '@/Components/Modal';
import { X, Banknote, ShoppingBag } from 'lucide-react';

export default function RequestRestockModal({
    show,
    onClose,
    canEditStockRequests,
    supply,
    requestQuantity,
    setRequestQuantity,
    onSubmit
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-start px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700">
                            <ShoppingBag size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 tracking-tight">Request Supply Purchase</h2>
                            <p className="text-xs text-stone-500 mt-0.5 font-medium">
                                Submit a stock purchase request for <strong className="text-stone-800 font-semibold">{supply?.name}</strong>.
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
                <div className="p-6 space-y-4">
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                            Quantity to Request ({supply?.unit || 'units'})
                        </label>
                        <input 
                            type="number" 
                            disabled={!canEditStockRequests}
                            className="w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-xs font-bold text-stone-800 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px]" 
                            value={requestQuantity} 
                            onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                            onChange={e => setRequestQuantity(e.target.value.replace(/[-.]/g, ""))} 
                            required 
                            min="1"
                            autoFocus
                        />
                        <p className="text-[11px] text-stone-400 font-medium mt-1.5">
                            Recommended Batch: <strong className="text-stone-700">{supply ? supply.min_stock * 2 : 0} {supply?.unit}</strong>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="shrink-0 flex items-center justify-end gap-2.5 border-t border-stone-100 bg-[#FDFBF9] px-6 py-4">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-5 py-2.5 text-xs text-stone-600 font-bold hover:bg-stone-100 rounded-xl transition min-h-[44px] sm:min-h-[38px]"
                    >
                        Cancel
                    </button>
                    <button 
                        type="button"
                        disabled={!canEditStockRequests}
                        onClick={onSubmit} 
                        className="px-6 py-2.5 text-xs bg-clay-600 hover:bg-clay-700 active:scale-95 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 min-h-[44px] sm:min-h-[38px] flex items-center gap-2"
                    >
                        <Banknote size={14} /> Submit Purchase Request
                    </button>
                </div>
            </div>
        </Modal>
    );
}

import React from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import { Banknote } from 'lucide-react';

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
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-5">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-3 text-amber-600 mx-auto">
                    <Banknote size={20} />
                </div>
                <div className="text-center">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Request Restock?</h2>
                    <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                        This will create a purchase request for <strong>{supply?.name}</strong>.
                        <br/>
                        The request will be sent to <strong>Accounting</strong> for budget approval.
                    </p>

                    <div className="mb-4 text-left">
                        <InputLabel value="Quantity to Request" />
                        <div className="relative">
                            <input 
                                type="number" 
                                disabled={!canEditStockRequests}
                                className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-amber-500 focus:ring-amber-500 shadow-sm transition pr-12 font-bold min-h-[38px]" 
                                value={requestQuantity} 
                                onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                onChange={e => setRequestQuantity(e.target.value.replace(/[-.]/g, ""))} 
                                required 
                                min="1"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-medium">{supply?.unit}</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Recommended: {supply ? supply.min_stock * 2 : 0} {supply?.unit}</p>
                    </div>
                </div>

                <div className="flex justify-center gap-3 mt-6 pt-3 border-t border-gray-100">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition min-h-[44px] flex items-center justify-center w-full sm:w-auto"
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={!canEditStockRequests}
                        onClick={onSubmit} 
                        className="px-4 py-2 text-xs bg-clay-600 text-white rounded-lg font-bold hover:bg-clay-700 transition shadow-sm disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center w-full sm:w-auto"
                    >
                        Submit Request
                    </button>
                </div>
            </div>
        </Modal>
    );
}

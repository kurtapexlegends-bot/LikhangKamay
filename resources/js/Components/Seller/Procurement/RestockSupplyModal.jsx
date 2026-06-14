import React from 'react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';

export default function RestockSupplyModal({
    show,
    onClose,
    canEditProcurement,
    selectedSupply,
    restockForm,
    onSubmit
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <form onSubmit={onSubmit} className="p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Restock Supply</h2>
                <p className="text-xs text-gray-500 mb-4">
                    Add stock to <strong>{selectedSupply?.name}</strong>
                </p>

                <div>
                    <InputLabel value="Quantity to Add" />
                    <input 
                        type="number" 
                        disabled={!canEditProcurement}
                        className="w-full border-gray-300 rounded-lg text-xs py-2 focus:border-clay-500 focus:ring-clay-500 shadow-sm transition min-h-[38px]" 
                        value={restockForm.data.quantity} 
                        onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                        onChange={e => restockForm.setData('quantity', e.target.value.replace(/[-.]/g, ""))} 
                        required 
                        min="1"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Current: {selectedSupply?.quantity} {selectedSupply?.unit}</p>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={!canEditProcurement || restockForm.processing} 
                        className="px-4 py-2 text-xs bg-clay-600 text-white rounded-lg font-bold hover:bg-clay-700 transition disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] flex items-center justify-center"
                    >
                        {restockForm.processing ? 'Adding...' : 'Add Stock'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

import React from 'react';
import Modal from '@/Components/Modal';
import { Trash2 } from 'lucide-react';

export default function DeleteSupplyModal({
    show,
    onClose,
    canEditProcurement,
    supply,
    onConfirm
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-6 text-center">
                <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 shadow-sm">
                    <Trash2 size={28} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Delete Supply?</h2>
                <p className="text-xs text-gray-500 mb-6 leading-relaxed px-2">
                    Are you sure you want to delete <strong className="text-gray-900">"{supply?.name}"</strong>? 
                    <br/><br/>
                    This action is irreversible and will remove high-level tracking for this item from your inventory.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-3 px-4">
                    <button 
                        onClick={onClose}
                        className="w-full sm:w-auto px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-2xl transition duration-200 min-h-[44px] flex items-center justify-center"
                    >
                        Cancel, Keep it
                    </button>
                    <button 
                        disabled={!canEditProcurement}
                        onClick={onConfirm}
                        className="w-full sm:w-auto px-8 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition duration-200 shadow-lg shadow-red-200 active:scale-95 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px]"
                    >
                        <Trash2 size={18} /> Yes, Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
}

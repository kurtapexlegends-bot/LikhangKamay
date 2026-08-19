import React from 'react';
import Modal from '@/Components/Modal';
import { X, Trash2 } from 'lucide-react';

export default function DeleteSupplyModal({
    show,
    onClose,
    canEditProcurement,
    supply,
    onConfirm
}) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-start px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-3.5">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
                            <Trash2 size={18} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900 tracking-tight">Delete Supply Item</h2>
                            <p className="text-xs text-stone-500 mt-0.5 font-medium">
                                Remove <strong className="text-stone-800 font-semibold">{supply?.name}</strong> from catalog tracking.
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
                <div className="p-6">
                    <p className="text-xs text-stone-600 font-medium leading-relaxed">
                        Are you sure you want to remove this supply item? This will remove its inventory tracking and history from your workspace.
                    </p>
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
                        disabled={!canEditProcurement}
                        onClick={onConfirm} 
                        className="px-6 py-2.5 text-xs bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-bold transition shadow-xs disabled:opacity-50 min-h-[44px] sm:min-h-[38px] flex items-center gap-2"
                    >
                        <Trash2 size={14} /> Confirm Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
}

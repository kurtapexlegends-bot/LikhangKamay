import React from 'react';
import Modal from '@/Components/Modal';
import { Truck } from 'lucide-react';

export default function ConfirmOrderModal({ show, onClose, request, onConfirm, processing, canEdit }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-5 sm:p-6 text-center">
                <div className="w-12 h-12 bg-[#FBF1E8] text-clay-700 rounded-xl flex items-center justify-center mx-auto mb-3 border border-[#E7D8C9] shadow-sm">
                    <Truck size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Confirm Order Placed?</h2>
                <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                    Are you sure you have placed the order for <strong>{request?.supply?.name}</strong> with the supplier?
                    <br/><br/>
                    This will move the request to <strong>On Process</strong> status.
                </p>
                <div className="flex justify-center gap-3">
                    <button 
                        onClick={onClose}
                        type="button"
                        className="px-4 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition min-h-[44px] min-w-[80px]"
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={!canEdit || processing}
                        onClick={onConfirm}
                        type="button"
                        className="px-4 py-2 bg-clay-600 text-white rounded-lg text-xs font-bold hover:bg-clay-700 transition shadow-sm shadow-clay-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 min-h-[44px]"
                    >
                        {processing ? 'Confirming...' : 'Confirm Order'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

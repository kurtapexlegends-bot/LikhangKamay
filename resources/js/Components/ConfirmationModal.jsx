import React from 'react';
import Modal from '@/Components/Modal';

export default function ConfirmationModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    icon: Icon, 
    iconBg, 
    confirmText, 
    confirmColor, 
    processing 
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <div className="p-6 text-center">
                <div className={`w-16 h-16 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={28} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">{message}</p>
                <div className="flex justify-center gap-3">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        disabled={processing}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:-translate-y-0.5 ${confirmColor} disabled:opacity-50`}
                    >
                        {processing ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

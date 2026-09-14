import React from 'react';
import Modal from '@/Components/Modal';
import { X, ShieldCheck } from 'lucide-react';

export default function DriverPhotoViewerModal({
    isOpen,
    onClose,
    title,
    photoUrl,
    isVerifiedBadge = false,
}) {
    if (!isOpen || !photoUrl) return null;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="md">
            <div className="p-4 bg-white rounded-2xl">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2 mb-3">
                    <div className="flex items-center gap-2">
                        {isVerifiedBadge && <ShieldCheck size={16} className="text-emerald-600" />}
                        <h4 className="text-xs font-bold text-stone-900">{title}</h4>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 rounded-lg p-1 hover:bg-stone-100 transition cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>
                <img
                    src={photoUrl}
                    alt={title}
                    className="w-full rounded-xl object-contain max-h-[70vh] bg-stone-50"
                />
            </div>
        </Modal>
    );
}

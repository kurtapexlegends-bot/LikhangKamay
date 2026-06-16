import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { Package } from 'lucide-react';

export default function ReceiveRequestModal({ isOpen, onClose, max, value, onChange, onSubmit, processing, canEdit, supplyName }) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const content = (
        <form onSubmit={onSubmit} className="p-5 sm:p-6 text-left">
            <div className="w-10 h-10 bg-[#F8EEE6] text-clay-700 rounded-lg flex items-center justify-center mb-3 border border-[#E7D8C9]">
                <Package size={20} />
            </div>
            <h2 className="text-base font-bold text-gray-900 mb-1">Receive Items into Buffer</h2>
            <p className="text-xs text-gray-400 mb-4">
                Record items received from the supplier {supplyName && <>for <strong>{supplyName}</strong></>}
            </p>
            <div className="mb-4">
                <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity Received</label>
                <input 
                    type="number" 
                    min="1" 
                    max={max} 
                    value={value} 
                    onChange={onChange} 
                    disabled={!canEdit} 
                    className="w-full border-gray-200 rounded-lg shadow-sm focus:border-clay-500 focus:ring-clay-500 font-bold text-base py-2" 
                    required 
                />
                <p className="text-xs text-gray-400 mt-2">Remaining needed: <span className="font-bold text-clay-700">{max}</span></p>
            </div>
            <div className="flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={onClose} 
                    className="px-3 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={!canEdit || processing} 
                    className="px-4 py-2 bg-clay-600 text-white text-xs font-bold rounded-lg hover:bg-clay-700 transition shadow-sm shadow-clay-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
                >
                    {processing ? 'Receiving...' : 'Receive Items'}
                </button>
            </div>
        </form>
    );

    if (isMobile) {
        return (
            <SlideOverDrawer
                show={isOpen}
                onClose={onClose}
                title="Receive Items"
                widthClass="max-w-md"
            >
                <div className="pt-2">
                    {content}
                </div>
            </SlideOverDrawer>
        );
    }

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            {content}
        </Modal>
    );
}

import React from 'react';
import Modal from '@/Components/Modal';
import { ShoppingBag } from 'lucide-react';
import { Link } from '@inertiajs/react';

export default function CreateRequestModal({ show, onClose }) {
    return (
        <Modal show={show} onClose={onClose} maxWidth="sm">
            <div className="p-5 sm:p-6 text-center">
                <div className="w-12 h-12 bg-[#FBF1E8] text-clay-700 rounded-xl flex items-center justify-center mx-auto mb-3 border border-[#E7D8C9] shadow-sm">
                    <ShoppingBag size={24} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Request Stock</h2>
                <p className="text-xs text-stone-500 mb-5 leading-relaxed">
                    To request stock for raw materials, please go to the Procurement Catalog page where you can check current supply capacities and request restock.
                </p>
                <div className="flex justify-center gap-3">
                    <button 
                        onClick={onClose}
                        type="button"
                        className="px-4 py-2 text-xs text-gray-500 font-bold hover:bg-gray-50 rounded-lg transition min-h-[44px]"
                    >
                        Close
                    </button>
                    <Link 
                        href={route('procurement.index')}
                        className="px-4 py-2 bg-clay-600 text-white rounded-lg text-xs font-bold hover:bg-clay-700 transition shadow-sm shadow-clay-100 active:scale-95 min-h-[44px] flex items-center justify-center"
                    >
                        Go to Procurement
                    </Link>
                </div>
            </div>
        </Modal>
    );
}

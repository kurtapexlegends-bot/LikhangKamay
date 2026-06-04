import React from 'react';
import { Link } from '@inertiajs/react';
import { X, ShoppingBag, User, MapPin, Phone } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export default function OrderContextSidebar({
    currentChatUser,
    setShowInfoPanel,
    currentChatUserAddress
}) {
    if (!currentChatUser) return null;

    return (
        <>
            {/* Backdrop for mobile overlays */}
            <div 
                className="fixed inset-0 bg-stone-900/35 backdrop-blur-[1px] z-20 xl:hidden animate-in fade-in duration-200"
                onClick={() => setShowInfoPanel(false)}
            />
            <div className="fixed inset-y-0 right-0 z-30 w-80 max-w-[85vw] xl:max-w-none xl:w-80 bg-white border-l border-gray-100 flex flex-col shrink-0 h-full shadow-2xl xl:shadow-none xl:relative animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-gray-900 text-sm tracking-wide uppercase">Customer Profile</h3>
                <button 
                    onClick={() => setShowInfoPanel(false)}
                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    type="button"
                >
                    <X size={18} />
                </button>
            </header>
            
            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {/* User Profile Summary */}
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="relative mb-4 w-24 h-24 mx-auto shrink-0">
                        <UserAvatar user={currentChatUser} className="w-24 h-24 text-3xl shadow-md border-4 border-white" />
                        {currentChatUser.is_online && (
                            <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white z-20" />
                        )}
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg mb-2 truncate max-w-full">{currentChatUser.name}</h4>
                    <p className="text-xs text-gray-500 mb-4 break-all max-w-full">{currentChatUser.email}</p>
                    
                    <div className="flex gap-2 w-full">
                        <Link
                            href={route('orders.index')}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition shadow-sm min-h-[44px]"
                        >
                            <ShoppingBag size={16} className="text-clay-500" />
                            View Orders
                        </Link>
                    </div>
                </div>
                
                {/* Info Cards */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">About Customer</h5>
                        <div className="space-y-4 text-left">
                            <div className="flex items-start gap-3">
                                <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{currentChatUser.name}</p>
                                    <p className="text-xs text-gray-500">Contact Person</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 break-words leading-relaxed">
                                        {currentChatUserAddress || 'No address provided'}
                                    </p>
                                    <p className="text-xs text-gray-500">Address</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{currentChatUser.phone_number || 'No number provided'}</p>
                                    <p className="text-xs text-gray-500">Number</p>
                                </div>
                            </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
        </>
    );
}

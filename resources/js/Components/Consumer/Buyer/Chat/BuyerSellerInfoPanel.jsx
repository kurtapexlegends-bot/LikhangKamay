import React from 'react';
import { Link } from '@inertiajs/react';
import { X, ShoppingBag, User, MapPin, Phone } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

function SellerInfoPanelContent({
    currentChatUser,
    currentChatUserAddress,
    currentChatUserShopHref,
    onClose,
    isDrawer = false,
}) {
    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-gray-900 text-sm tracking-wide uppercase">Seller Profile</h3>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        type="button"
                    >
                        <X size={18} />
                    </button>
                )}
            </header>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {/* Profile Summary */}
                <div className="flex flex-col items-center text-center mb-8">
                     <div className="relative mb-4 w-24 h-24 mx-auto shrink-0">
                         <UserAvatar user={currentChatUser} className="w-24 h-24 text-3xl shadow-md border-4 border-white" />
                         {currentChatUser.is_online && (
                             <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-4 border-white z-20" />
                         )}
                     </div>
                    <h4 className="font-bold text-gray-900 text-lg mb-4 truncate w-full">{currentChatUser.shop_name || currentChatUser.name}</h4>
                    <p className="text-sm text-gray-500 mb-4 break-all w-full">{currentChatUser.email}</p>
                    
                    <div className="flex gap-2 w-full">
                        {currentChatUserShopHref ? (
                            <Link
                                href={currentChatUserShopHref}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
                            >
                                <ShoppingBag size={16} className="text-clay-500" />
                                View Shop
                            </Link>
                        ) : (
                            <span className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-sm font-semibold cursor-not-allowed shadow-sm">
                                <ShoppingBag size={16} className="text-gray-300" />
                                Shop Unavailable
                            </span>
                        )}
                    </div>
                </div>
                
                {/* Details Section */}
                <div className="space-y-4">
                    <div className="bg-stone-50/50 rounded-2xl p-4 border border-stone-100 shadow-sm">
                        <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">About Seller</h5>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <User size={16} className="text-stone-450 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 truncate">{currentChatUser.name}</p>
                                    <p className="text-xs text-gray-500">Contact Person</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <MapPin size={16} className="text-stone-450 mt-0.5 shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 break-words leading-relaxed">
                                        {currentChatUserAddress || 'No address provided'}
                                    </p>
                                    <p className="text-xs text-gray-500">Address</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone size={16} className="text-stone-450 mt-0.5 shrink-0" />
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
    );
}

export default function BuyerSellerInfoPanel({
    currentChatUser,
    currentChatUserAddress,
    currentChatUserShopHref,
    showInfoPanel,
    setShowInfoPanel,
    isDesktop = false,
}) {
    if (!currentChatUser) return null;

    if (isDesktop) {
        if (!showInfoPanel) return null;
        return (
            <div className="hidden xl:flex flex-col w-80 border-l border-gray-100 bg-white h-full relative shrink-0">
                <SellerInfoPanelContent
                    currentChatUser={currentChatUser}
                    currentChatUserAddress={currentChatUserAddress}
                    currentChatUserShopHref={currentChatUserShopHref}
                    onClose={() => setShowInfoPanel(false)}
                />
            </div>
        );
    }

    return (
        <SlideOverDrawer
            show={showInfoPanel}
            onClose={() => setShowInfoPanel(false)}
            position="right"
            widthClass="max-w-xs"
            bodyClassName="relative flex-1 overflow-hidden"
        >
            <SellerInfoPanelContent
                currentChatUser={currentChatUser}
                currentChatUserAddress={currentChatUserAddress}
                currentChatUserShopHref={currentChatUserShopHref}
                onClose={() => setShowInfoPanel(false)}
                isDrawer={true}
            />
        </SlideOverDrawer>
    );
}

import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Search, ShoppingBag, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

import BuyerNavbar from '@/Layouts/BuyerNavbar';
import ImpersonationBanner from '@/Layouts/ImpersonationBanner';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import RatingModal from '@/Components/Consumer/RatingModal';
import ConfirmationModal from '@/Components/ConfirmationModal';

// Extracted Subcomponents
import OrderListItemCard from '@/Components/Consumer/Buyer/MyOrders/OrderListItemCard';
import ReturnRequestModal from '@/Components/Consumer/Buyer/MyOrders/ReturnRequestModal';
import EscalateDisputeModal from '@/Components/Consumer/Buyer/MyOrders/EscalateDisputeModal';

export default function MyOrders({ auth, orders }) {
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState(false);
    
    const [ratingModal, setRatingModal] = useState({ isOpen: false, order: null });
    const [returnModalState, setReturnModalState] = useState({ isOpen: false, order: null });
    const [escalateModalState, setEscalateModalState] = useState({ isOpen: false, disputeId: null });

    // Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: null, // 'receive', 'return', 'cancel'
        orderId: null
    });

    const { props: { flash } } = usePage();

    const hasActiveCourierTracking = orders.some((order) => {
        if (order?.delivery?.provider !== 'lalamove' || !order?.delivery?.external_order_id) {
            return false;
        }
        return !['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED'].includes(String(order?.delivery?.status || '').toUpperCase());
    });

    useEffect(() => {
        if (!hasActiveCourierTracking || typeof window === 'undefined') {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            router.reload({
                only: ['orders'],
                preserveState: true,
                preserveScroll: true,
            });
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [hasActiveCourierTracking]);

    const tabs = [
        { id: 'All', label: 'All Orders', count: orders.length },
        { id: 'Pending', label: 'To Pay' },
        { id: 'Accepted', label: 'To Ship' },
        { id: 'Shipped', label: 'To Receive' },
        { id: 'Ready for Pickup', label: 'To Pickup' },
        { id: 'Completed', label: 'Completed' },
        { id: 'Refund/Return', label: 'Returns' },
    ];

    const getTabCount = (tabId) => {
        if (tabId === 'All') return orders.length;
        if (tabId === 'Accepted') return orders.filter(o => ['Accepted', 'Processing'].includes(o.status) && o.shipping_method !== 'Pick Up').length;
        if (tabId === 'Shipped') return orders.filter(o => ['Shipped', 'Delivered'].includes(o.status) && o.shipping_method !== 'Pick Up').length;
        if (tabId === 'Ready for Pickup') return orders.filter(o => (['Ready for Pickup', 'Delivered'].includes(o.status) || ['Accepted', 'Processing'].includes(o.status)) && o.shipping_method === 'Pick Up').length;
        if (tabId === 'Refund/Return') return orders.filter(o => ['Refund/Return', 'Refunded', 'Replaced'].includes(o.status)).length;
        return orders.filter(o => o.status === tabId).length;
    };

    const filteredOrders = orders.filter(order => {
        let tabMatch = true;
        if (activeTab !== 'All') {
            if (activeTab === 'Accepted') {
                tabMatch = ['Accepted', 'Processing'].includes(order.status) && order.shipping_method !== 'Pick Up';
            } else if (activeTab === 'Shipped') {
                tabMatch = ['Shipped', 'Delivered'].includes(order.status) && order.shipping_method !== 'Pick Up';
            } else if (activeTab === 'Ready for Pickup') {
                tabMatch = (['Ready for Pickup', 'Delivered'].includes(order.status) || ['Accepted', 'Processing'].includes(order.status)) && order.shipping_method === 'Pick Up';
            } else if (activeTab === 'Refund/Return') {
                tabMatch = ['Refund/Return', 'Refunded', 'Replaced'].includes(order.status);
            } else {
                tabMatch = order.status === activeTab;
            }
        }

        let searchMatch = true;
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            searchMatch = order.items.some(item => 
                item.name.toLowerCase().includes(query)
            ) || order.order_number?.toLowerCase().includes(query);
        }

        return tabMatch && searchMatch;
    });

    const modalConfigs = {
        receive: {
            title: 'Confirm Order Received',
            message: 'By confirming, you acknowledge receiving this order in good condition. You will have 1 day to request a return if there are any issues.',
            icon: CheckCircle,
            iconBg: 'bg-green-100 text-green-600',
            confirmText: 'Confirm Receipt',
            confirmColor: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200',
            action: (id) => router.post(route('my-orders.receive', id), {}, {
                onStart: () => setProcessing(true),
                onFinish: () => { setProcessing(false); closeModal(); }
            })
        },
        cancel: {
            title: 'Cancel Order',
            message: 'Are you sure you want to cancel this order? This action cannot be undone.',
            icon: XCircle,
            iconBg: 'bg-red-100 text-red-600',
            confirmText: 'Yes, Cancel Order',
            confirmColor: 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200',
            action: (id) => router.post(route('my-orders.cancel', id), {}, {
                onStart: () => setProcessing(true),
                onFinish: () => { setProcessing(false); closeModal(); }
            })
        },
        cancelReturn: {
            title: 'Cancel Return Request',
            message: 'Are you sure? cancelling your return request will mark this order as Completed. This action cannot be undone.',
            icon: CheckCircle,
            iconBg: 'bg-green-100 text-green-600',
            confirmText: 'Yes, Keep Item',
            confirmColor: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200',
            action: (id) => router.post(route('my-orders.cancel-return', id), {}, {
                onStart: () => setProcessing(true),
                onFinish: () => { setProcessing(false); closeModal(); }
            })
        }
    };

    const openModal = (type, orderId) => setConfirmModal({ isOpen: true, type, orderId });
    const closeModal = () => setConfirmModal({ isOpen: false, type: null, orderId: null });

    const handleConfirm = () => {
        if (confirmModal.type && confirmModal.orderId) {
            modalConfigs[confirmModal.type].action(confirmModal.orderId);
        }
    };

    const contactSeller = (sellerId) => {
        router.visit(route('buyer.chat', { user_id: sellerId }));
    };

    const buyAgain = (orderId) => {
        router.post(route('cart.buy-again', orderId));
    };

    const currentConfig = confirmModal.type ? modalConfigs[confirmModal.type] : null;

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-805 flex flex-col">
            <Head title="My Purchases" />
            <ImpersonationBanner />
            <BuyerNavbar />

            <main className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-5 min-w-0 flex-1">
                
                {/* --- FLASH MESSAGES --- */}
                {flash?.success && (
                    <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm flex items-start gap-2.5">
                        <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm flex items-start gap-2.5">
                        <XCircle className="h-5 w-5 text-red-655 shrink-0 mt-0.5" />
                        <span className="text-sm font-medium">{flash.error}</span>
                    </div>
                )}
                
                {/* Page Header */}
                <div className="mb-3 flex items-center justify-between">
                    <h1 className="text-lg font-black tracking-tight text-stone-900 sm:text-xl">My Purchases</h1>
                    <p className="hidden sm:block text-xs text-stone-500">Track orders, delivery, and returns.</p>
                </div>

                {/* --- TABS --- */}
                <div className="mb-3 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                    <div className="flex overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => {
                            const count = getTabCount(tab.id);
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative flex min-w-[95px] flex-1 items-center justify-center gap-2 px-2.5 py-3 text-center text-[10px] font-bold transition-all sm:min-w-[100px] sm:text-sm sm:py-4 focus:outline-none ${
                                        activeTab === tab.id 
                                        ? 'text-clay-700 bg-clay-50/50' 
                                        : 'text-stone-400 hover:text-clay-600 hover:bg-stone-50'
                                    }`}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab.label}
                                        {count > 0 && (
                                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold transition-colors ${
                                                activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-500'
                                            }`}>
                                                {count}
                                            </span>
                                        )}
                                    </span>
                                    {activeTab === tab.id && (
                                        <motion.div 
                                            layoutId="activeTabUnderline"
                                            className="absolute bottom-0 left-0 right-0 h-[2px] bg-clay-600"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- SEARCH BAR --- */}
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                    <input 
                        type="text" 
                        placeholder="Search items or order IDs..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pl-8 pr-3 text-base font-medium placeholder:text-stone-400 shadow-sm transition-all focus:border-clay-500 focus:ring-0 sm:py-2 sm:pl-9 sm:text-[12px]"
                    />
                </div>

                {/* --- ORDER LIST --- */}
                <div className="space-y-6">
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => (
                            <OrderListItemCard
                                key={order.id}
                                order={order}
                                onContactSeller={contactSeller}
                                onBuyAgain={buyAgain}
                                onOpenModal={openModal}
                                onOpenReturnModal={(ord) => setReturnModalState({ isOpen: true, order: ord })}
                                onOpenEscalateModal={(dispId) => setEscalateModalState({ isOpen: true, disputeId: dispId })}
                                onOpenRatingModal={(ord) => setRatingModal({ isOpen: true, order: ord })}
                            />
                        ))
                    ) : searchQuery.trim() ? (
                        <WorkspaceEmptyState
                            icon={Search}
                            title="No matching orders"
                            description={`We couldn't find any orders matching "${searchQuery}". Try using different terms or click below to clear the search.`}
                            actionLabel="Clear Search"
                            onAction={() => setSearchQuery('')}
                        />
                    ) : (
                        <WorkspaceEmptyState
                            icon={ShoppingBag}
                            title="No orders found"
                            description={
                                activeTab === 'All' 
                                    ? "You haven't placed any orders yet. Start exploring artisan products." 
                                    : `No orders found in the "${tabs.find(t => t.id === activeTab)?.label}" category.`
                            }
                            actionLabel="Start Shopping"
                            actionHref="/shop"
                        />
                    )}
                </div>

            </main>

            {/* --- RATING MODAL --- */}
            <RatingModal 
                isOpen={ratingModal.isOpen} 
                onClose={() => setRatingModal({ ...ratingModal, isOpen: false })}
                order={ratingModal.order}
            />

            {/* --- RETURN FORM MODAL --- */}
            <ReturnRequestModal
                isOpen={returnModalState.isOpen}
                onClose={() => setReturnModalState({ isOpen: false, order: null })}
                order={returnModalState.order}
            />

            {/* --- ESCALATE DISPUTE MODAL --- */}
            <EscalateDisputeModal
                isOpen={escalateModalState.isOpen}
                onClose={() => setEscalateModalState({ isOpen: false, disputeId: null })}
                disputeId={escalateModalState.disputeId}
            />

            {/* --- CONFIRMATION MODAL --- */}
            {currentConfig && (
                <ConfirmationModal
                    isOpen={confirmModal.isOpen}
                    onClose={closeModal}
                    onConfirm={handleConfirm}
                    title={currentConfig.title}
                    message={currentConfig.message}
                    icon={currentConfig.icon}
                    iconBg={currentConfig.iconBg}
                    confirmText={currentConfig.confirmText}
                    confirmColor={currentConfig.confirmColor}
                    processing={processing}
                />
            )}
        </div>
    );
}

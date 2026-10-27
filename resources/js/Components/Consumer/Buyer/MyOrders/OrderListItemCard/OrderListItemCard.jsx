import React, { useState } from 'react';
import { Store, ChevronRight, Truck, MapPin, PackageCheck, AlertTriangle, ChevronDown, ChevronUp, Clock, Navigation } from 'lucide-react';
import CourierTrackingCard, { getVehicleIcon } from '../CourierTrackingCard';
import ProductImageLightboxModal from '@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal';
import OrderTimeline from '@/Components/Consumer/Buyer/MyOrders/OrderTimeline';
import { buyerDeliverySummary, buyerIssueSummary } from '@/utils/orderHelpers';
import OrderCardActions from './OrderCardActions';

export default function OrderListItemCard({
    order,
    onContactSeller,
    onBuyAgain,
    onOpenModal,
    onOpenCancelModal,
    onOpenReturnModal,
    onOpenEscalateModal,
    onOpenRatingModal,
}) {
    const isTransitDelivery = ['ON_GOING', 'PICKED_UP', 'IN_TRANSIT'].includes(
        String(order.delivery?.status || '').toUpperCase()
    );
    const [isItemsExpanded, setIsItemsExpanded] = useState(false);
    const [isTrackingExpanded, setIsTrackingExpanded] = useState(false);
    const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(false);
    const [isCourierExpanded, setIsCourierExpanded] = useState(isTransitDelivery);
    const [lightboxState, setLightboxState] = useState({ open: false, photos: [], index: 0, title: '' });

    const deliverySummary = buyerDeliverySummary(order);
    const issueSummary = buyerIssueSummary(order);

    const formatPHP = (val) => {
        if (val === undefined || val === null) return '₱0.00';
        if (typeof val === 'string' && val.startsWith('₱')) return val;
        const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
        return isNaN(num) ? '₱0.00' : `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const items = order.items || [];
    const displayedItems = isItemsExpanded ? items : items.slice(0, 2);
    const hasMoreItems = items.length > 2;
    const totalItemCount = items.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);

    // Minimal dot color helper for Apple/Linear style
    const getStatusDotColor = (status) => {
        switch (String(status).toLowerCase()) {
            case 'completed': return 'bg-emerald-500';
            case 'in transit':
            case 'to deliver':
            case 'shipped':
            case 'processing': return 'bg-blue-500';
            case 'cancelled':
            case 'declined': return 'bg-stone-400';
            case 'refund/return':
            case 'dispute': return 'bg-amber-500';
            default: return 'bg-clay-500';
        }
    };

    return (
        <div className="relative rounded-xl border border-stone-200/70 bg-white shadow-xs hover:border-stone-300 transition-colors duration-150 overflow-hidden">
            {/* 1. Linear/Apple Minimalist Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-stone-100 flex items-center justify-between gap-3 bg-white">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-semibold text-stone-900 tracking-tight truncate">
                        {order.seller_name || 'Artisan Workshop'}
                    </span>
                    <span className="text-stone-300 text-xs shrink-0">•</span>
                    <span className="text-[11px] font-mono text-stone-600 truncate shrink-0">
                        #{order.order_number || order.id}
                    </span>
                </div>

                {/* Minimalist Status Indicator */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700">
                        <span className={`w-2 h-2 rounded-full ${getStatusDotColor(order.status)}`} />
                        <span>{order.status}</span>
                    </span>
                    <span className="text-stone-300 text-xs hidden sm:inline">|</span>
                    <span className="text-[11px] font-medium text-stone-600 capitalize hidden sm:inline">
                        {order.payment_method || 'Online'} • {order.payment_status}
                    </span>
                </div>
            </div>

            {/* 2. Streamlined Product List */}
            <div className="divide-y divide-stone-100/80 px-4 sm:px-5">
                {displayedItems.map((item, idx) => (
                    <div key={idx} className="py-3 flex items-center gap-3.5">
                        <div className="w-14 h-14 bg-stone-50 rounded-lg border border-stone-200/60 overflow-hidden shrink-0">
                            <img 
                                loading="lazy"
                                decoding="async"
                                src={item.img} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                            />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <h4 className="font-semibold text-stone-900 text-xs sm:text-sm truncate">{item.name}</h4>
                                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-600 flex-wrap">
                                    {item.variant && (
                                        <span className="text-stone-700">{item.variant}</span>
                                    )}
                                    <span>Qty: {item.qty}</span>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <span className="font-mono text-xs sm:text-sm font-semibold text-stone-900">
                                    {formatPHP(item.price)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {hasMoreItems && (
                    <button
                        type="button"
                        onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                        className="w-full py-2.5 text-center text-xs text-stone-600 font-medium hover:text-stone-900 transition flex items-center justify-center gap-1 cursor-pointer min-h-[44px]"
                    >
                        <span>{isItemsExpanded ? 'Collapse' : `+${items.length - 2} more items`}</span>
                        {isItemsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                )}
            </div>

            {/* 3. Hairline Logistics Row with On-Demand Tracking Drawer */}
            <div className="px-4 sm:px-5 py-2.5 bg-stone-50/50 border-t border-b border-stone-100 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0 text-stone-600">
                    {order.shipping_method === 'Pick Up' ? (
                        <Store size={13} className="text-stone-400 shrink-0" />
                    ) : (() => {
                        const VehicleIcon = getVehicleIcon(order?.delivery?.vehicle_type || order?.recommended_vehicle);
                        return <VehicleIcon size={13} className="text-stone-400 shrink-0" />;
                    })()}
                    <span className="truncate text-[11px] sm:text-xs">
                        {deliverySummary ? `${deliverySummary.title}: ${deliverySummary.detail}` : (order.shipping_address || 'Delivery Address')}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={() => setIsTrackingExpanded(!isTrackingExpanded)}
                    className="text-[11px] font-medium text-stone-700 hover:text-stone-950 transition-colors shrink-0 flex items-center gap-1 cursor-pointer py-1 px-1.5 -mr-1.5"
                >
                    <span>{isTrackingExpanded ? 'Close Timeline' : 'Tracking'}</span>
                    <ChevronDown size={12} className={`transition-transform duration-200 ${isTrackingExpanded ? 'rotate-180' : ''}`} />
                </button>
            </div>

            {/* On-Demand Order Timeline Drawer */}
            {isTrackingExpanded && (
                <div className="px-4 sm:px-5 py-3.5 bg-white border-b border-stone-100">
                    <OrderTimeline status={order.status} isPickup={order.shipping_method === 'Pick Up'} />
                </div>
            )}

            {/* Live Courier Tracking card for active order delivery */}
            {order.delivery && order.status !== 'Pending' && (order.delivery?.flow_type === 'replacement_exchange' || !['Cancelled', 'Rejected'].includes(order.status)) && (
                <div className="px-4 sm:px-5 py-2.5 bg-blue-50/40 border-b border-blue-100/60">
                    <CourierTrackingCard 
                        order={order}
                        isExpanded={isCourierExpanded}
                        onToggle={() => setIsCourierExpanded(!isCourierExpanded)}
                    />
                </div>
            )}

            {/* Workshop Pickup Pass for Pick Up orders */}
            {order.shipping_method === 'Pick Up' && order.pickup_pin && !['Cancelled', 'Rejected'].includes(order.status) && (
                <div className="px-4 sm:px-5 py-3 bg-amber-50/50 border-b border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-semibold text-stone-900">
                            <MapPin size={13} className="text-clay-600" />
                            <span>Workshop Pickup Pass</span>
                        </div>
                        <p className="text-[11px] text-stone-600 mt-0.5 truncate">
                            {order.pickup_location_snapshot || order.seller_address || 'Artisan Workshop'} • {order.pickup_date} ({order.pickup_time_slot})
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-stone-500 font-medium">Claim PIN:</span>
                        <span className="font-mono font-bold tracking-widest text-xs px-2.5 py-1 bg-white border border-stone-200 rounded text-stone-900 shadow-2xs">
                            {order.pickup_pin}
                        </span>
                    </div>
                </div>
            )}

            {/* 4. Total Row with On-Demand Fee Breakdown Toggle */}
            <div className="px-4 sm:px-5 py-2.5 flex items-center justify-between text-xs bg-white border-b border-stone-100/70">
                <span className="text-[11px] text-stone-600 truncate mr-2">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'} • {order.shipping_method === 'Pick Up' ? 'Workshop Pick Up' : 'Doorstep Delivery'}
                </span>
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-600 hover:text-stone-900 transition-colors cursor-pointer py-1 px-1.5 -my-1 rounded hover:bg-stone-100/80"
                        aria-expanded={isBreakdownExpanded}
                    >
                        <span>{isBreakdownExpanded ? 'Hide' : 'Breakdown'}</span>
                        <ChevronDown size={11} className={`transition-transform duration-200 ${isBreakdownExpanded ? 'rotate-180' : ''}`} />
                    </button>
                    <span className="text-stone-200 text-xs">|</span>
                    <div className="flex items-center gap-1.5">
                        <span className="text-stone-500 text-xs font-normal">Total:</span>
                        <span className="font-mono font-bold text-sm text-stone-900 tracking-tight">
                            {formatPHP(order.total || order.total_amount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Expandable Price & Fee Breakdown Drawer */}
            {isBreakdownExpanded && (
                <div className="px-4 sm:px-5 py-3 bg-stone-50/70 border-b border-stone-100 text-xs text-stone-600 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Items Subtotal ({totalItemCount} {totalItemCount === 1 ? 'item' : 'items'})</span>
                        <span className="font-mono font-medium text-stone-800">
                            {formatPHP(order.merchandise_subtotal || items.reduce((acc, it) => acc + (Number(it.price || 0) * Number(it.qty || 1)), 0))}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-500">Shipping Fee ({order.shipping_method === 'Pick Up' ? 'Workshop Pick Up' : 'Doorstep Delivery'})</span>
                        <span className="font-mono font-medium text-stone-800">
                            {order.shipping_method === 'Pick Up' ? (
                                <span className="text-emerald-600 font-semibold uppercase text-[10px] tracking-wider">Free</span>
                            ) : (
                                formatPHP(order.shipping_fee_amount)
                            )}
                        </span>
                    </div>
                    {Number(String(order.convenience_fee_amount || 0).replace(/,/g, '')) > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                            <span className="text-stone-500">Service Fee (3%)</span>
                            <span className="font-mono font-medium text-stone-800">
                                {formatPHP(order.convenience_fee_amount)}
                            </span>
                        </div>
                    )}
                    <div className="pt-2 border-t border-stone-200/60 flex items-center justify-between text-xs font-semibold text-stone-900">
                        <span>Total Payment</span>
                        <span className="font-mono font-bold text-sm text-stone-900">
                            {formatPHP(order.total || order.total_amount)}
                        </span>
                    </div>
                </div>
            )}

            {/* 5. Minimalist Actions Footer */}
            <OrderCardActions 
                order={order}
                onContactSeller={onContactSeller}
                onBuyAgain={onBuyAgain}
                onOpenModal={onOpenModal}
                onOpenCancelModal={onOpenCancelModal}
                onOpenReturnModal={onOpenReturnModal}
                onOpenEscalateModal={onOpenEscalateModal}
                onOpenRatingModal={onOpenRatingModal}
            />

            {/* Proof Lightbox Modal */}
            {lightboxState.open && lightboxState.photos.length > 0 && (
                <ProductImageLightboxModal
                    isOpen={lightboxState.open}
                    onClose={() => setLightboxState(prev => ({ ...prev, open: false }))}
                    productName={lightboxState.title}
                    gallery={lightboxState.photos}
                    activeIndex={lightboxState.index}
                    onChangeIndex={(idx) => setLightboxState(prev => ({ ...prev, index: idx }))}
                    has3D={false}
                />
            )}
        </div>
    );
}

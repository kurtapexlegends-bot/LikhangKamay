import React, { useState } from 'react';
import { MapPin, PackageCheck, AlertTriangle } from 'lucide-react';
import CourierTrackingCard from '../CourierTrackingCard';
import { buyerDeliverySummary, buyerIssueSummary, buyerProofLabel, humanizeAddressType } from '@/utils/orderHelpers';

// Subcomponents
import OrderCardHeader from './OrderCardHeader';
import OrderCardTimeline from './OrderCardTimeline';
import OrderCardItems from './OrderCardItems';
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
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [isCourierTrackingExpanded, setIsCourierTrackingExpanded] = useState(isTransitDelivery);

    const deliverySummary = buyerDeliverySummary(order);
    const issueSummary = buyerIssueSummary(order);

    const toggleCourierTrackingExpansion = () => {
        setIsCourierTrackingExpanded(!isCourierTrackingExpanded);
    };

    const toggleOrderExpansion = () => {
        setIsTimelineExpanded(!isTimelineExpanded);
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-[0_2px_12px_-3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.07)] hover:border-stone-300 transition-all duration-300">
            {/* Header */}
            <OrderCardHeader order={order} />

            {/* Timeline collapser and list */}
            <OrderCardTimeline 
                order={order} 
                isTimelineExpanded={isTimelineExpanded} 
                toggleOrderExpansion={toggleOrderExpansion} 
            />

            {/* Main Content Body */}
            <div className="p-3.5 sm:p-5 space-y-3">
                {/* Pickup / Delivery Info */}
                <div className="space-y-1.5">
                    {deliverySummary && (
                        <div className={`rounded-xl border px-3 py-2 ${deliverySummary.tone}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-[12px] font-bold text-stone-900">{deliverySummary.title}</p>
                                    <p className="text-[10px] leading-snug text-stone-600">{deliverySummary.detail}</p>
                                    {order.shipping_method === 'Pick Up' && order.proof_of_delivery && (
                                        <a 
                                            href={order.proof_of_delivery} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-[#FFFDFB] px-2.5 py-1.5 text-[10px] font-bold text-orange-600 hover:bg-orange-50 transition shadow-sm min-h-[44px] sm:min-h-[28px] mt-1.5"
                                        >
                                            <PackageCheck size={12} /> {buyerProofLabel(order)}
                                        </a>
                                    )}
                                </div>
                                {deliverySummary.latestEventTime && (
                                    <span className="rounded-full border border-white/80 bg-white/80 px-2 py-0.5 text-[9px] font-bold text-stone-500">
                                        {deliverySummary.latestEventTime}
                                    </span>
                                )}
                            </div>
                            {deliverySummary.latestEvent && (
                                <p className="mt-1 text-[9px] font-medium text-stone-500">
                                    Latest update: {deliverySummary.latestEvent.label}
                                </p>
                            )}
                        </div>
                    )}

                    {order.shipping_method !== 'Pick Up' && (
                        order.delivery ? (
                            <CourierTrackingCard 
                                order={order}
                                isExpanded={isCourierTrackingExpanded}
                                onToggle={toggleCourierTrackingExpansion}
                            />
                        ) : (
                            /* Standalone Address row when delivery courier is not yet dispatched */
                            <div className="rounded-xl border border-stone-200/80 bg-stone-50/60 px-3 py-2 text-stone-800">
                                <div className="flex items-start gap-2">
                                    <div className="p-1 bg-white rounded shadow-2xs text-clay-600 border border-stone-200/70 shrink-0 mt-0.5">
                                        <MapPin size={13} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <p className="text-[11px] font-bold text-stone-900">
                                                Standard Delivery
                                            </p>
                                            {order.shipping_address_type && (
                                                <span className="inline-flex rounded border border-stone-200 bg-white px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-stone-600">
                                                    {humanizeAddressType(order.shipping_address_type)}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-stone-600 leading-snug">{order.shipping_address}</p>
                                        {(order.shipping_recipient_name || order.shipping_contact_phone) && (
                                            <p className="text-[10px] text-stone-400">
                                                {order.shipping_recipient_name}
                                                {order.shipping_recipient_name && order.shipping_contact_phone ? ' | ' : ''}
                                                {order.shipping_contact_phone}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {order.tracking_number && (
                                                <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-stone-200 text-stone-600 font-medium">
                                                    Tracker: {order.tracking_number}
                                                </span>
                                            )}
                                            {order.shipping_notes && (
                                                <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-stone-200 text-stone-600 font-medium">
                                                    Note: {order.shipping_notes}
                                                </span>
                                            )}
                                            {order.proof_of_delivery && (
                                                <a 
                                                    href={order.proof_of_delivery} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 transition shadow-2xs min-h-[28px] mt-1"
                                                >
                                                    <PackageCheck size={11} className="text-clay-600" /> {buyerProofLabel(order)}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    )}
                </div>

                {/* Dispute / Issue Summary */}
                {issueSummary && (
                    <div className={`rounded-xl border p-3 sm:p-3.5 space-y-2 shadow-2xs ${issueSummary.tone}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 min-w-0">
                                <div className="p-1 rounded-lg bg-white/80 text-stone-700 border border-stone-200/60 shrink-0 mt-0.5 shadow-2xs">
                                    <issueSummary.icon size={14} />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                    <h4 className="text-xs font-bold text-stone-900">{issueSummary.title}</h4>
                                    <p className="text-[11px] text-stone-600 leading-snug">{issueSummary.detail}</p>
                                </div>
                            </div>
                            {/* Unboxing Proof / Badge on Top-Right */}
                            <div className="flex items-center gap-2 shrink-0">
                                {issueSummary.timestampValue && (
                                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${issueSummary.badgeTone}`}>
                                        {issueSummary.timestampLabel}: {issueSummary.timestampValue}
                                    </span>
                                )}
                                {issueSummary.proofPhotos?.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        {issueSummary.proofPhotos.map((photo, i) => (
                                            <a
                                                key={i}
                                                href={photo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="h-10 w-10 rounded-lg border border-stone-300/80 bg-white overflow-hidden shadow-2xs hover:opacity-80 transition"
                                                title="View unboxing proof"
                                            >
                                                <img src={photo} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {!issueSummary.proofPhotos?.length && issueSummary.proofHref && (
                                    <a
                                        href={issueSummary.proofHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-10 w-10 rounded-lg border border-stone-300/80 bg-white overflow-hidden shadow-2xs hover:opacity-80 transition flex items-center justify-center"
                                        title={issueSummary.proofLabel || "View Return Proof"}
                                    >
                                        <PackageCheck size={16} className="text-clay-600" />
                                    </a>
                                )}
                            </div>
                        </div>

                        {issueSummary.infoValue && (
                            <div className="bg-white/90 rounded-lg border border-stone-200/70 px-3 py-2 text-[11px] text-stone-700 leading-relaxed shadow-2xs">
                                <span className="font-extrabold text-stone-900">{issueSummary.infoLabel}: </span>
                                <span className="italic text-stone-600 ml-1">"{issueSummary.infoValue}"</span>
                            </div>
                        )}

                        {issueSummary.resolutionNotes && (
                            <div className="bg-white/90 rounded-lg border border-stone-200/80 px-3 py-2 text-[11px] text-stone-700 leading-relaxed shadow-2xs">
                                <span className="font-extrabold text-stone-800">Platform Resolution Notes: </span>
                                <span className="italic text-stone-600 ml-1">"{issueSummary.resolutionNotes}"</span>
                            </div>
                        )}
                    </div>
                )}

                {/* List of Ordered Items */}
                <OrderCardItems order={order} />
            </div>

            {/* Warranty Info (if applicable) */}
            {(order.status === 'Completed' && order.can_return) && (
                <div className="px-3.5 sm:px-5 pb-3">
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1.5 text-xs text-amber-800 w-full sm:w-auto shadow-2xs">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        <span className="text-[11px] font-medium text-amber-800">
                            Return expires: <span className="font-bold">{order.warranty_expires_at}</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Footer Pricing & Actions */}
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
        </div>
    );
}

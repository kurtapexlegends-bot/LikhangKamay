import React, { useState } from 'react';
import { MapPin, PackageCheck, AlertTriangle, ChevronRight, ChevronDown } from 'lucide-react';
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
    onOpenReturnModal,
    onOpenEscalateModal,
    onOpenRatingModal,
}) {
    const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
    const [isCourierTrackingExpanded, setIsCourierTrackingExpanded] = useState(false);

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
            <div className="p-4 sm:p-6 space-y-4">
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
                    <>
                        {/* Address row */}
                        <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <div className="flex items-start gap-2">
                                <div className="p-1 bg-white rounded shadow-sm text-blue-600 shrink-0 mt-0.5">
                                    <MapPin size={13} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="text-[12px] font-bold text-gray-900">
                                            {order.delivery?.provider === 'lalamove' ? 'Lalamove Delivery' : 'Standard Delivery'}
                                        </p>
                                        {order.shipping_address_type && (
                                            <span className="inline-flex rounded border border-blue-200 bg-white px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-blue-700">
                                                {humanizeAddressType(order.shipping_address_type)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-snug">{order.shipping_address}</p>
                                    {(order.shipping_recipient_name || order.shipping_contact_phone) && (
                                        <p className="text-[10px] text-gray-400">
                                            {order.shipping_recipient_name}
                                            {order.shipping_recipient_name && order.shipping_contact_phone ? ' | ' : ''}
                                            {order.shipping_contact_phone}
                                        </p>
                                    )}
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {order.tracking_number && (
                                            <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-blue-200 text-blue-600 font-medium">
                                                Tracker: {order.tracking_number}
                                            </span>
                                        )}
                                        {order.shipping_notes && (
                                            <span className="text-[9px] bg-white px-1.5 py-0 rounded border border-blue-200 text-blue-600 font-medium">
                                                Note: {order.shipping_notes}
                                            </span>
                                        )}
                                        {order.proof_of_delivery && (
                                            <a 
                                                href={order.proof_of_delivery} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition shadow-sm min-h-[44px] sm:min-h-[28px] mt-1"
                                            >
                                                <PackageCheck size={12} /> {buyerProofLabel(order)}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Courier tracking card */}
                        {order.delivery && (
                            <CourierTrackingCard 
                                order={order}
                                isExpanded={isCourierTrackingExpanded}
                                onToggle={toggleCourierTrackingExpansion}
                            />
                        )}
                    </>
                    )}
                </div>

                {/* Dispute / Issue Summary */}
                {issueSummary && (
                    <div className={`rounded-xl border px-3 py-2.5 ${issueSummary.tone}`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <issueSummary.icon size={13} className="shrink-0 text-current" />
                                    <p className="text-[12px] font-bold text-stone-900">{issueSummary.title}</p>
                                </div>
                                <p className="mt-1 text-[10px] leading-snug text-stone-600">{issueSummary.detail}</p>
                            </div>
                            {issueSummary.timestampValue && (
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${issueSummary.badgeTone}`}>
                                    {issueSummary.timestampLabel}: {issueSummary.timestampValue}
                                </span>
                            )}
                        </div>

                        {issueSummary.infoValue && (
                            <div className="mt-2 rounded-lg border border-white/80 bg-white/75 px-2.5 py-2 text-[10px] text-stone-700 whitespace-pre-wrap leading-snug">
                                <span className="font-bold">{issueSummary.infoLabel}: </span>{issueSummary.infoValue}
                            </div>
                        )}

                        {issueSummary.proofHref && (
                            <a
                                href={issueSummary.proofHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-700 hover:bg-white"
                            >
                                <PackageCheck size={10} /> {issueSummary.proofLabel}
                            </a>
                        )}

                        {issueSummary.proofPhotos?.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {issueSummary.proofPhotos.map((photo, i) => (
                                    <a
                                        key={i}
                                        href={photo}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 w-12 rounded-lg border border-white/80 overflow-hidden shadow-sm hover:opacity-85 transition-opacity"
                                    >
                                        <img src={photo} alt={`Proof ${i + 1}`} className="h-full w-full object-cover" />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* List of Ordered Items */}
                <OrderCardItems order={order} />
            </div>

            {/* Warranty Info (if applicable) */}
            {(order.status === 'Completed' && order.can_return) && (
                <div className="px-4 sm:px-6 pb-4">
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 animate-pulse w-full sm:w-auto">
                        <AlertTriangle size={14} className="text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">
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
                onOpenReturnModal={onOpenReturnModal}
                onOpenEscalateModal={onOpenEscalateModal}
                onOpenRatingModal={onOpenRatingModal}
            />
        </div>
    );
}

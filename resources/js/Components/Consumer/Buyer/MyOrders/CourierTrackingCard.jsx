import React, { useState } from 'react';
import { Truck, ExternalLink, ChevronDown, ChevronRight, Hash, Clock, AlertTriangle, Map, Phone, MessageSquare } from 'lucide-react';
import { buyerCourierTrackingState } from '@/utils/orderHelpers';
import BuyerDeliveryTrackingMap from './BuyerDeliveryTrackingMap';

export default function CourierTrackingCard({ order, isExpanded, onToggle }) {
    const hasDelivery = Boolean(order?.delivery);
    const [isMapVisible, setIsMapVisible] = useState(
        ['ON_GOING', 'PICKED_UP', 'IN_TRANSIT'].includes(String(order?.delivery?.status || '').toUpperCase())
    );

    if (!hasDelivery) return null;

    const delivery = order.delivery;
    const trackingState = buyerCourierTrackingState(order);
    const isReplacementExchange = delivery.flow_type === 'replacement_exchange';
    const driverName = delivery.driver_name || 'Studio Courier';
    const vehiclePlate = delivery.vehicle_plate_number;
    const driverPhone = delivery.driver_phone;

    return (
        <div className="rounded-2xl border border-stone-200/80 bg-stone-50/70 overflow-hidden shadow-2xs transition-colors hover:border-clay-300 mt-2.5">
            {/* Header / Summary Bar */}
            <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                <div 
                    onClick={onToggle}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700 border border-clay-200/80">
                        <Truck size={15} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-extrabold text-stone-900 truncate">
                                {isExpanded && isMapVisible ? 'Courier Tracking' : driverName}
                            </span>
                            {vehiclePlate && !(isExpanded && isMapVisible) && (
                                <span className="rounded bg-white border border-stone-200 px-1.5 py-0.2 text-[9px] font-mono font-bold text-stone-600">
                                    {vehiclePlate}
                                </span>
                            )}
                            <span className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold shadow-2xs ${trackingState.tone}`}>
                                {trackingState.label}
                            </span>
                            {isReplacementExchange && (
                                <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.2 text-[9px] font-bold text-teal-700">
                                    {delivery.flow_label || 'Replacement'}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-stone-500 truncate mt-0.5">
                            {trackingState.detail}
                        </p>
                    </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            if (!isExpanded && onToggle) onToggle();
                            setIsMapVisible(!isMapVisible);
                        }}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold shadow-2xs transition-all ${
                            isExpanded && isMapVisible
                                ? "border-clay-300 bg-clay-600 text-white shadow-xs"
                                : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
                        }`}
                        title={isMapVisible ? "Hide delivery map" : "Show live tracking map"}
                    >
                        <Map size={11} className={isExpanded && isMapVisible ? "text-white" : "text-clay-600"} />
                        <span>{isExpanded && isMapVisible ? 'Hide Map' : 'Live Map'}</span>
                    </button>

                    {delivery.share_link && (
                        <a
                            href={delivery.share_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 shadow-2xs transition"
                            title="Open external tracking link"
                        >
                            <ExternalLink size={10} className="text-stone-500" />
                        </a>
                    )}

                    <button
                        type="button"
                        onClick={onToggle}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded transition"
                        aria-label="Toggle details"
                    >
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-2.5 pb-2.5 pt-0 space-y-2">
                    {/* Live Delivery Map */}
                    {isMapVisible ? (
                        <BuyerDeliveryTrackingMap order={order} delivery={delivery} />
                    ) : (
                        /* Compact driver contact strip when map is hidden */
                        driverPhone && (
                            <div className="flex items-center justify-between gap-2 rounded-xl bg-white border border-stone-200/80 px-3 py-2">
                                <span className="text-[10px] font-semibold text-stone-600">Contact Courier:</span>
                                <div className="flex items-center gap-1.5">
                                    <a
                                        href={`tel:${driverPhone}`}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 transition"
                                    >
                                        <Phone size={10} /> Call Driver
                                    </a>
                                    <a
                                        href={`sms:${driverPhone}`}
                                        className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] font-bold text-stone-700 hover:bg-stone-100 transition"
                                    >
                                        <MessageSquare size={10} /> SMS
                                    </a>
                                </div>
                            </div>
                        )
                    )}

                    {/* Replacement exchange route legs (if any) */}
                    {isReplacementExchange && delivery.route_legs?.length > 0 && (
                        <div className="flex flex-col gap-1 rounded-xl bg-white p-2 border border-stone-200/70">
                            {delivery.route_legs.map((leg, index) => (
                                <div key={index} className="flex items-start gap-1.5">
                                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                                    <p className="text-[10px] text-stone-700 font-medium">
                                        <span className="font-bold text-teal-800">{leg.label}:</span> {leg.from} <span className="mx-0.5 text-stone-400">→</span> {leg.to}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Metadata Footer: ID & Last sync */}
                    {(delivery.external_order_id || delivery.last_updated_at) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] text-stone-400">
                            {delivery.external_order_id && (
                                <div className="flex items-center gap-1">
                                    <Hash size={9} />
                                    <span>Courier Ref: {delivery.external_order_id}</span>
                                </div>
                            )}
                            {delivery.last_updated_at && (
                                <div className="flex items-center gap-1">
                                    <Clock size={9} />
                                    <span>Updated {delivery.last_updated_at}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pending auto cancel alert */}
                    {delivery.pending_auto_cancel && (
                        <div className="flex items-start gap-1.5 rounded-xl border border-red-200 bg-red-50 p-2 text-red-700 shadow-2xs">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <div className="text-[10px]">
                                <span className="font-bold">Return-to-sender Hold</span>
                                <p className="mt-0.5">Auto-cancel after {delivery.cancel_hold_ends_at} if unresolved.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

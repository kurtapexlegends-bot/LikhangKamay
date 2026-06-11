import React from 'react';
import { Truck, ExternalLink, ChevronDown, ChevronRight, CheckCircle, Hash, Clock, AlertTriangle } from 'lucide-react';
import { buyerCourierTrackingState } from '@/utils/orderHelpers';

const CourierProgressBar = ({ status }) => {
    const normalized = String(status || '').toUpperCase();
    
    const steps = [
        { key: 'ASSIGNING', label: 'Assigning' },
        { key: 'TRANSIT', label: 'In Transit' },
        { key: 'COMPLETED', label: 'Delivered' }
    ];

    let currentStepIndex = 0;
    if (normalized === 'ON_GOING' || normalized === 'PICKED_UP') {
        currentStepIndex = 1;
    } else if (normalized === 'COMPLETED') {
        currentStepIndex = 2;
    } else if (['CANCELED', 'REJECTED', 'EXPIRED'].includes(normalized)) {
        return null;
    }

    return (
        <div className="py-4 px-2">
            <div className="relative flex items-center justify-between">
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-stone-100 rounded-full" />
                
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-clay-500 rounded-full transition-all duration-700 ease-in-out" 
                    style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />

                {steps.map((step, idx) => {
                    const isActive = idx === currentStepIndex;
                    const isCompleted = idx < currentStepIndex;
                    
                    return (
                        <div key={step.key} className="relative z-10 flex flex-col items-center">
                            <div className={`
                                w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500
                                ${isCompleted 
                                    ? 'bg-clay-600 text-white shadow-sm' 
                                    : isActive 
                                        ? 'bg-white text-clay-600 border border-clay-500 shadow-sm ring-4 ring-clay-100/50' 
                                        : 'bg-white text-stone-300 border border-stone-200'}
                            `}>
                                {isCompleted ? (
                                    <CheckCircle size={12} strokeWidth={3} />
                                ) : (
                                    <span className="text-[10px] font-black">{idx + 1}</span>
                                )}
                            </div>
                            
                            <span className={`
                                mt-1.5 text-[10px] font-bold tracking-tight transition-colors duration-300
                                ${isActive 
                                    ? 'text-clay-700 font-extrabold' 
                                    : isCompleted 
                                        ? 'text-stone-600' 
                                        : 'text-stone-400'}
                            `}>
                                {step.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default function CourierTrackingCard({ order, isExpanded, onToggle }) {
    if (!order.delivery) return null;

    const trackingState = buyerCourierTrackingState(order);
    const isReplacementExchange = order.delivery.flow_type === 'replacement_exchange';

    return (
        <div className="rounded-xl border border-stone-200/80 bg-[#FCF7F2] p-2 shadow-sm transition-colors hover:border-clay-300 mt-3">
            <div 
                onClick={onToggle}
                className={`flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-clay-50/50 p-1 -m-1 rounded transition-colors ${
                    isExpanded ? "mb-1" : ""
                }`}
            >
                <div className="flex items-center gap-1.5">
                    <Truck size={12} className="text-clay-600" />
                    <p className="text-[10px] font-extrabold uppercase tracking-wide text-clay-700">Courier Tracking</p>
                </div>
                <div className="flex items-center gap-1.5">
                    {!isExpanded && (
                        <div className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold shadow-sm ${trackingState.tone}`}>
                            {trackingState.label}
                        </div>
                    )}
                    {isExpanded ? (
                        <ChevronDown size={12} className="text-clay-500" />
                    ) : (
                        <ChevronRight size={12} className="text-clay-500" />
                    )}
                </div>
            </div>

            {isExpanded && (
                <div className="space-y-2 mt-1 pt-1.5 border-t border-clay-100/30">
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {isReplacementExchange && (
                                <span className="inline-flex rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-bold tracking-tight text-teal-700 shadow-sm">
                                    {order.delivery.flow_label}
                                </span>
                            )}
                            <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold shadow-sm ${trackingState.tone}`}>
                                {trackingState.label}
                            </div>
                        </div>
                        {order.delivery.share_link && (
                            <a
                                href={order.delivery.share_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-md border border-clay-200 bg-white px-2 py-1 text-[10px] font-bold text-clay-700 hover:bg-clay-50 hover:text-clay-800 shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all shrink-0"
                            >
                                Live Track <ExternalLink size={10} />
                            </a>
                        )}
                    </div>

                    <CourierProgressBar status={order.delivery.status} />

                    <p className="text-[11px] leading-relaxed text-stone-600 mb-2.5 font-medium">{trackingState.detail}</p>

                    {isReplacementExchange && order.delivery.route_legs?.length > 0 && (
                        <div className="mb-2.5 flex flex-col gap-1 rounded-lg bg-white/60 p-2 border border-stone-100/50">
                            {order.delivery.route_legs.map((leg, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <div className="mt-1 h-1 w-1 shrink-0 rounded-full bg-teal-400" />
                                    <p className="text-[10px] text-stone-700 font-medium">
                                        <span className="font-bold text-teal-800">{leg.label}:</span> {leg.from} <span className="mx-0.5 text-stone-400">→</span> {leg.to}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {(order.delivery.external_order_id || order.delivery.last_updated_at) && (
                        <div className="flex flex-wrap gap-1.5 mt-2 pt-2.5 border-t border-stone-200/50">
                            {order.delivery.external_order_id && (
                                <div className="flex items-center gap-1 px-1.5 text-[9px]">
                                    <Hash size={10} className="text-stone-400" />
                                    <span className="font-bold text-stone-600">ID: {order.delivery.external_order_id}</span>
                                </div>
                            )}
                            {order.delivery.last_updated_at && (
                                <div className="flex items-center gap-1 px-1.5 text-[9px] text-stone-500 border-l border-stone-300/50">
                                    <Clock size={10} className="text-stone-400" />
                                    <span>{order.delivery.last_updated_at}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {order.delivery.pending_auto_cancel && (
                        <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-red-200 bg-red-50 p-2 text-red-700 shadow-sm">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <div className="text-[10px]">
                                <span className="font-bold">Return-to-sender Hold</span>
                                <p className="mt-0.5">Auto-cancel after {order.delivery.cancel_hold_ends_at} if unresolved.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

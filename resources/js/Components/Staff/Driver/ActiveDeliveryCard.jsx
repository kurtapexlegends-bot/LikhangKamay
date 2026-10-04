import React from 'react';
import {
    Phone,
    MessageSquare,
    MapPin,
    Clock,
    Camera,
    Check,
    Copy,
    Navigation,
    ArrowUpRight,
    Compass,
} from 'lucide-react';

export default function ActiveDeliveryCard({
    delivery,
    copiedOrderId,
    onCopyAddress,
    onOpenCompleteModal,
    onOpenRouteMap,
    stopIndex,
    totalStops,
}) {
    const encodedAddr = encodeURIComponent(delivery.destination?.address || "");
    const mapUrl =
        delivery.destination?.latitude && delivery.destination?.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=${delivery.destination.latitude},${delivery.destination.longitude}`
            : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddr}`;

    return (
        <div className="rounded-3xl border border-stone-200/90 bg-white shadow-xs overflow-hidden transition hover:border-stone-300">
            {/* Card Header: Order #, Status & Dispatch Time */}
            <div className="border-b border-stone-100 bg-stone-50/80 px-4 sm:px-6 py-3.5 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {totalStops > 1 && stopIndex && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${
                            stopIndex === 1
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/30'
                                : 'bg-stone-100 text-stone-700 border-stone-200'
                        }`}>
                            Stop {stopIndex} of {totalStops}{stopIndex === 1 ? ' • Next' : ''}
                        </span>
                    )}
                    <span className="font-mono text-sm font-extrabold text-stone-900">
                        Order #{delivery.order_number}
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        In Transit
                    </span>
                </div>
                <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                    <Clock size={12} className="text-stone-400" />
                    <span>Dispatched {delivery.dispatched_at || "today"}</span>
                </span>
            </div>

            {/* Card Body */}
            <div className="p-4 sm:p-6 space-y-4">
                {/* Recipient Customer Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/60 p-3.5 rounded-2xl border border-stone-100">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Recipient Customer
                        </p>
                        <p className="text-sm sm:text-base font-extrabold text-stone-900 mt-0.5 truncate">
                            {delivery.customer?.name || "Customer"}
                        </p>
                        <p className="text-xs text-stone-600 font-mono mt-0.5">
                            {delivery.customer?.phone || "No phone provided"}
                        </p>
                    </div>

                    {/* Quick Call & SMS Actions */}
                    {delivery.customer?.phone && (
                        <div className="flex items-center gap-2">
                            <a
                                href={`tel:${delivery.customer.phone}`}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3 text-sm font-extrabold text-emerald-900 hover:bg-emerald-100 active:scale-95 transition min-h-[52px] shadow-2xs"
                            >
                                <Phone size={16} className="text-emerald-700" />
                                <span>Call Customer</span>
                            </a>
                            <a
                                href={`sms:${delivery.customer.phone}`}
                                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-300 bg-sky-50 px-5 py-3 text-sm font-extrabold text-sky-900 hover:bg-sky-100 active:scale-95 transition min-h-[52px] shadow-2xs"
                            >
                                <MessageSquare size={16} className="text-sky-700" />
                                <span>SMS</span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Drop-off Address Card & Turn-by-Turn Navigation */}
                <div className="rounded-2xl bg-stone-50/90 p-4 border border-stone-200/70 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-clay-100 text-clay-700 mt-0.5">
                                <MapPin size={16} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                    Delivery Address
                                </p>
                                <p className="text-xs sm:text-sm font-semibold text-stone-900 leading-relaxed mt-0.5">
                                    {delivery.destination?.address || "Store Pickup"}
                                </p>
                            </div>
                        </div>

                        {/* Copy Address Button */}
                        {delivery.destination?.address && (
                            <button
                                type="button"
                                onClick={() => onCopyAddress(delivery.id, delivery.destination?.address)}
                                className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition shadow-2xs"
                                title="Copy Address"
                            >
                                {copiedOrderId === delivery.id ? (
                                    <>
                                        <Check size={12} className="text-emerald-600" />
                                        <span className="text-emerald-700">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy size={12} />
                                        <span>Copy</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Turn-by-Turn Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                        <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex-1 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-stone-950 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-stone-850 active:scale-[0.99] transition shadow-xs min-h-[52px]"
                        >
                            <Navigation size={17} className="text-clay-400 shrink-0" />
                            <span>Navigate in Google Maps / Waze</span>
                            <ArrowUpRight size={15} className="text-stone-400 shrink-0" />
                        </a>
                        {onOpenRouteMap && (
                            <button
                                type="button"
                                onClick={() => onOpenRouteMap(delivery)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-2xs min-h-[52px]"
                                title="Inspect Map Preview"
                            >
                                <Compass size={16} className="text-clay-600 shrink-0" />
                                <span>Preview Map</span>
                            </button>
                        )}
                    </div>

                    {delivery.dispatch_notes && (
                        <div className="text-[11px] text-amber-900 bg-amber-50/80 rounded-xl p-3 border border-amber-200/70 font-medium">
                            <strong className="font-bold">Artisan Note:</strong> {delivery.dispatch_notes}
                        </div>
                    )}
                </div>

                {/* Parcel Contents */}
                {delivery.items?.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Parcel Contents ({delivery.items.length} item{delivery.items.length === 1 ? '' : 's'})
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {delivery.items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-2.5 text-xs"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white border border-stone-200 text-stone-700 font-extrabold text-[11px]">
                                        ×{item.quantity}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-stone-900">
                                            {item.name}
                                        </p>
                                        {item.variant && (
                                            <p className="truncate text-[10px] text-stone-500">
                                                {item.variant}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Complete Delivery Action */}
                <div className="pt-2 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={() => onOpenCompleteModal(delivery)}
                        className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-700 py-4 px-5 text-sm sm:text-base font-extrabold text-white hover:bg-emerald-800 active:scale-[0.99] transition shadow-xs min-h-[56px]"
                    >
                        <Camera size={20} className="shrink-0" />
                        <span>Complete Delivery &amp; Submit Proof Photo</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from "react";
import { Camera as CameraIcon } from "lucide-react";
import { formatTimelineStamp } from "@/utils/orderHelpers";
import { resolveImageUrl } from "@/lib/media";
import ProductImageLightboxModal from "@/Components/Consumer/Shop/ProductShow/ProductImageLightboxModal";

export default function OrderIssueBanner({ order, issueSummary }) {
    const [lightboxState, setLightboxState] = useState({ open: false, photos: [], index: 0, title: '' });

    if (!issueSummary) return null;

    const Icon = issueSummary.icon;

    return (
        <div className={`rounded-xl border p-3.5 text-left shadow-sm ${issueSummary.tone}`}>
            <div className="flex items-start gap-2">
                {Icon && <Icon className="mt-0.5 shrink-0" size={16} />}
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex rounded border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${issueSummary.badgeTone}`}>
                            {issueSummary.title}
                        </span>
                        {issueSummary.timestampValue && (
                            <span className="text-[10px] font-medium text-stone-400">
                                {issueSummary.timestampLabel}{" "}
                                {formatTimelineStamp(issueSummary.timestampValue)}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-stone-600 font-medium">
                        {issueSummary.detail}
                    </p>
                    {issueSummary.infoValue && (
                        <div className="mt-2.5 border-t border-stone-200/40 pt-2 text-[10px]">
                            <span className="font-bold uppercase tracking-wider text-stone-400 block mb-0.5">
                                {issueSummary.infoLabel}
                            </span>
                            <p className="font-medium text-stone-700 italic">
                                "{issueSummary.infoValue}"
                            </p>
                        </div>
                    )}
                    {issueSummary.resolutionNotes && (
                        <div className="mt-2 rounded-lg border border-stone-200/80 bg-white/80 p-2.5 text-[10px] text-stone-700 leading-snug">
                            <span className="font-bold text-stone-800">Platform Resolution Notes: </span>
                            <span className="italic font-medium">"{issueSummary.resolutionNotes}"</span>
                        </div>
                    )}
                    {issueSummary.proofPhotos && issueSummary.proofPhotos.length > 0 && (
                        <div className="mt-3">
                            <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                Buyer Proof Photos ({issueSummary.proofPhotos.length})
                            </span>
                            <div className="flex flex-nowrap overflow-x-auto gap-2 py-1 scrollbar-none">
                                {issueSummary.proofPhotos.map((photo, i) => {
                                    const photoUrl = resolveImageUrl(photo);
                                    return (
                                        <button
                                            key={`${order.id}-dispute-proof-${i}`}
                                            type="button"
                                            onClick={() => setLightboxState({
                                                open: true,
                                                photos: issueSummary.proofPhotos.map(p => resolveImageUrl(p)),
                                                index: i,
                                                title: `Order #${order.order_number || order.id} Buyer Proof`
                                            })}
                                            className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200 hover:border-clay-500 hover:ring-2 hover:ring-clay-500/20 transition cursor-pointer"
                                            title={`Inspect buyer proof photo ${i + 1} in carousel`}
                                        >
                                            <img
                                                loading="lazy"
                                                decoding="async"
                                                src={photoUrl}
                                                alt={`Dispute proof ${i + 1}`}
                                                className="h-full w-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.onerror = null;
                                                    e.currentTarget.src = '/images/placeholder.svg';
                                                }}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {issueSummary.proofHref && (
                        <button
                            type="button"
                            onClick={() => setLightboxState({
                                open: true,
                                photos: [resolveImageUrl(issueSummary.proofHref)],
                                index: 0,
                                title: `Order #${order.order_number || order.id} Return Proof`
                            })}
                            className="mt-2.5 inline-flex items-center justify-center gap-1 rounded-full border border-white/80 bg-white/80 px-2.5 py-1 text-[9px] font-bold text-stone-700 hover:bg-white hover:border-stone-300 transition min-h-[44px] cursor-pointer"
                            title="Inspect return proof in carousel"
                        >
                            <CameraIcon size={12} className="text-clay-600" />
                            {issueSummary.proofLabel}
                        </button>
                    )}
                </div>
            </div>

            {/* Proof Photos Lightbox Carousel Modal */}
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

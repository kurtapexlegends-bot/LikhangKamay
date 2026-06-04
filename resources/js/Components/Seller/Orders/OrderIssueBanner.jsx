import React from "react";
import { Camera as CameraIcon } from "lucide-react";
import { formatTimelineStamp } from "@/utils/orderHelpers";

export default function OrderIssueBanner({ order, issueSummary }) {
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
                    {issueSummary.proofPhotos && issueSummary.proofPhotos.length > 0 && (
                        <div className="mt-3">
                            <span className="font-bold uppercase tracking-wider text-stone-400 text-[10px] block mb-1">
                                Buyer Proof Photos
                            </span>
                            <div className="flex flex-nowrap overflow-x-auto gap-2 py-1 scrollbar-none">
                                {issueSummary.proofPhotos.map((photo, i) => (
                                    <a
                                        key={`${order.id}-dispute-proof-${i}`}
                                        href={photo.startsWith("http") || photo.startsWith("/storage") ? photo : `/storage/${photo}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-stone-200 hover:border-stone-400 transition"
                                    >
                                        <img
                                            src={photo.startsWith("http") || photo.startsWith("/storage") ? photo : `/storage/${photo}`}
                                            alt={`Dispute proof ${i + 1}`}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.target.src = "/images/no-image.png";
                                            }}
                                        />
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {issueSummary.proofHref && (
                        <a
                            href={issueSummary.proofHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 inline-flex items-center justify-center gap-1 rounded-full border border-white/80 bg-white/80 px-2 py-1 text-[9px] font-bold text-stone-700 hover:bg-white min-h-[44px]"
                        >
                            <CameraIcon size={10} />
                            {issueSummary.proofLabel}
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

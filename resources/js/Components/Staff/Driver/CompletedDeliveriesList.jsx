import React from "react";
import { CheckCircle2, Clock, Camera } from "lucide-react";

export default function CompletedDeliveriesList({
    completedToday = [],
    onViewPodPhoto,
}) {
    if (completedToday.length === 0) {
        return (
            <div className="rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-stone-400 mb-3 shadow-2xs">
                    <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-bold text-stone-900 mb-1">
                    No Completed Deliveries Yet Today
                </h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Deliveries marked completed with customer proof photos will be logged here with timestamps and drop compensation records.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {completedToday.map((delivery) => (
                <div
                    key={delivery.id}
                    className="rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-stone-900">
                                    Order #{delivery.order_number}
                                </span>
                                <span className="text-xs font-bold text-stone-800 truncate">
                                    • {delivery.customer?.name}
                                </span>
                            </div>
                            <p className="truncate text-xs text-stone-500 mt-0.5">
                                {delivery.destination?.address}
                            </p>
                            <p className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
                                <Clock size={11} />
                                <span>Delivered at {delivery.delivered_at || "Today"}</span>
                            </p>
                        </div>
                    </div>

                    {delivery.pod_photo_url && (
                        <button
                            type="button"
                            onClick={() => onViewPodPhoto(delivery.pod_photo_url)}
                            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 transition shadow-2xs min-h-[40px] cursor-pointer"
                        >
                            <Camera size={14} className="text-clay-600" />
                            <span>View Proof Photo</span>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

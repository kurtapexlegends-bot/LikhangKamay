import React from "react";
import { MapPin, Hash, PackageCheck, DollarSign } from "lucide-react";
import { sellerProofLabel } from "@/utils/orderHelpers";

export default function OrderLogistics({ order, canEditOrders, markAsPaidAction }) {
    return (
        <div className="space-y-2">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                Logistics & Route
            </span>
            <div className="text-[11px] text-stone-650 font-medium space-y-1.5">
                {order.shipping_address && (
                    <div className="flex items-start gap-1.5">
                        <MapPin size={12} className="text-stone-400 mt-0.5 shrink-0" />
                        <span className="line-clamp-1 text-stone-500" title={order.shipping_address}>
                            {order.shipping_address}
                        </span>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-md border border-stone-200 bg-white px-2 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-sm">
                        {order.shipping_method}
                    </span>
                    {order.tracking_number && (
                        <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-100 rounded-md px-2 py-0.5 text-[9px] font-extrabold text-sky-700 tracking-tight shadow-sm">
                            <Hash size={10} /> {order.tracking_number}
                        </span>
                    )}
                    {order.proof_of_delivery && (
                        <a
                            href={order.proof_of_delivery}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition shadow-sm min-h-[44px] sm:min-h-[28px]"
                        >
                            <PackageCheck size={10} /> {sellerProofLabel(order)}
                        </a>
                    )}
                    {order.payment_status === "pending" &&
                        order.payment_method === "COD" &&
                        ["Pending", "Accepted", "Shipped", "Ready for Pickup", "Delivered"].includes(order.status) && (
                            <button
                                disabled={!canEditOrders}
                                onClick={() => markAsPaidAction(order.id)}
                                className="inline-flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-green-700 hover:bg-green-105 transition shadow-sm min-h-[44px] sm:min-h-[28px]"
                                type="button"
                            >
                                <DollarSign size={10} /> Mark as Paid
                            </button>
                        )}
                </div>
            </div>
        </div>
    );
}

import React from "react";
import { MapPin, Hash, PackageCheck, DollarSign } from "lucide-react";
import { sellerProofLabel } from "@/utils/orderHelpers";

export default function OrderLogistics({ order, canEditOrders, markAsPaidAction }) {
    return (
        <div className="flex flex-wrap items-center gap-2 text-[11px] min-w-0">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest shrink-0">
                Logistics & Route:
            </span>
            {order.shipping_address && (
                <div className="flex items-center gap-1 min-w-0 max-w-[280px]">
                    <MapPin size={11} className="text-stone-400 shrink-0" />
                    <span className="truncate text-stone-600 font-medium" title={order.shipping_address}>
                        {order.shipping_address}
                    </span>
                </div>
            )}
            <span className="inline-flex rounded-md border border-stone-200 bg-white px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-stone-600 tracking-tight shadow-2xs">
                {order.shipping_method}
            </span>
            {order.tracking_number && (
                <span className="inline-flex items-center gap-0.5 bg-sky-50 border border-sky-100 rounded-md px-1.5 py-0.5 text-[9px] font-extrabold text-sky-700 tracking-tight shadow-2xs">
                    <Hash size={9} /> {order.tracking_number}
                </span>
            )}
            {order.proof_of_delivery && (
                <a
                    href={order.proof_of_delivery}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                >
                    <PackageCheck size={9} /> {sellerProofLabel(order)}
                </a>
            )}
            {order.payment_status === "pending" &&
                order.payment_method === "COD" &&
                ["Pending", "Accepted", "Shipped", "Ready for Pickup", "Delivered"].includes(order.status) && (
                    <button
                        disabled={!canEditOrders}
                        onClick={() => markAsPaidAction(order.id)}
                        className="inline-flex items-center justify-center gap-1 bg-green-50 border border-green-200 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-green-700 hover:bg-green-100 transition shadow-2xs cursor-pointer"
                        type="button"
                    >
                        <DollarSign size={9} /> Mark as Paid
                    </button>
                )}
        </div>
    );
}

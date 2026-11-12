import React from "react";
import VoucherTicketCard from "@/Components/Common/VoucherTicketCard";
import { Info } from "lucide-react";

const formatPreviewDate = (dateString) => {
    if (!dateString) return "No expiration";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "No expiration";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export default function VoucherTicketPreview({ data }) {
    const subtitle = (
        <>
            <span>
                {data.min_requirement_type === "quantity"
                    ? `Min. ${data.min_quantity || 1} item(s)`
                    : data.min_spend && Number(data.min_spend) > 0
                    ? `Min. spend PHP ${Number(data.min_spend).toLocaleString()}`
                    : "No minimum spend"}
            </span>
            {data.discount_type === "percentage" && data.max_discount && (
                <span>Cap PHP {Number(data.max_discount).toLocaleString()}</span>
            )}
            <span>Until {formatPreviewDate(data.expires_at)}</span>
        </>
    );

    return (
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
            <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                        Live Voucher Preview
                    </span>
                    <span className="text-[10.5px] font-semibold text-clay-700">
                        {data.is_public ? "Public in Drawer" : "Private Code"}
                    </span>
                </div>

                <VoucherTicketCard
                    voucher={{
                        ...data,
                        code: data.code || "VOUCHER-CODE",
                        name: data.name || "Voucher Title",
                    }}
                    isEligible={true}
                    isApplied={false}
                    notchBgClass="bg-stone-50"
                    subtitle={subtitle}
                    actionSlot={
                        <span className="inline-flex items-center rounded-xl bg-clay-600 px-2.5 h-7 text-[10.5px] font-bold text-white opacity-95">
                            Claim & Use
                        </span>
                    }
                />
            </div>

            {/* Workshop Financial Safeguard */}
            <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                    <Info size={14} className="text-clay-600 shrink-0" />
                    <span>Artisan Financial Safeguard</span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">
                    Shop discounts are absorbed by your workshop and reduce order merchandise totals. Zero platform commission is charged on discounts, and BIR 12% VAT recalculates on the net discounted subtotal.
                </p>
            </div>
        </div>
    );
}

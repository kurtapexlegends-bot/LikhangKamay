import React from "react";

export function formatVoucherRequirement(voucher) {
    if (voucher.min_requirement_type === "quantity") {
        return `Min. ${voucher.min_quantity || 1} Items`;
    }
    if (Number(voucher.min_spend || 0) > 0) {
        return `Min PHP ${Number(voucher.min_spend).toLocaleString()}`;
    }
    return "No Minimum";
}

export default function VoucherScopeTags({ voucher, className = "mt-1", pillClassName = "rounded" }) {
    const scopeLabel =
        voucher.scope_type === "specific_products"
            ? `${(voucher.applicable_products || []).length} Product(s)`
            : voucher.scope_type === "category"
            ? `Category: ${voucher.applicable_category || "Unset"}`
            : "Storewide";

    return (
        <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
            <span className={`text-[10px] font-medium text-stone-600 bg-stone-100/90 px-1.5 py-0.5 border border-stone-200/70 ${pillClassName}`}>
                {scopeLabel}
            </span>
            {voucher.target_audience === "followers" && (
                <span className={`text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-200/70 ${pillClassName}`}>
                    Followers Only
                </span>
            )}
            {voucher.target_audience === "new_customers" && (
                <span className={`text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 border border-amber-200/70 ${pillClassName}`}>
                    New Buyers Only
                </span>
            )}
            {voucher.target_audience === "repeat_customers" && (
                <span className={`text-[10px] font-bold text-clay-700 bg-clay-50 px-1.5 py-0.5 border border-clay-200/70 ${pillClassName}`}>
                    Loyal Buyers Only
                </span>
            )}
        </div>
    );
}

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function OrderPricingCard({
    order,
    expandedPricingDetails,
    togglePricingDetailsExpansion
}) {
    const isExpanded = expandedPricingDetails.has(order.id);

    return (
        <div className="mb-2 rounded-xl border border-stone-200/80 bg-stone-50/40 p-1 shadow-2xs">
            <button
                type="button"
                onClick={() => togglePricingDetailsExpansion(order.id)}
                className={`flex items-center justify-between w-full cursor-pointer select-none px-2 py-1 rounded-lg hover:bg-stone-100/60 transition-colors text-left focus:outline-none ${
                    isExpanded ? "border-b border-stone-200/60 pb-1.5 mb-1.5" : ""
                }`}
            >
                <div>
                    <p className="text-[8px] font-extrabold text-stone-400 uppercase tracking-wider">
                        Buyer Total
                    </p>
                    <p className="text-xs font-bold text-stone-800">
                        PHP {order.total}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-right">
                    <div>
                        <p className="text-[8px] font-extrabold text-emerald-600 uppercase tracking-wider">
                            Your Net
                        </p>
                        <p className="text-xs font-bold text-emerald-600">
                            PHP {Number(order.seller_net_amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2
                            })}
                        </p>
                    </div>
                    {isExpanded ? (
                        <ChevronDown size={12} className="text-stone-400 self-center" />
                    ) : (
                        <ChevronRight size={12} className="text-stone-400 self-center" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="space-y-2 text-[10.5px] mt-2.5 px-2 border-t border-stone-100 pt-2.5">
                    <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">Your Revenue Calculation</div>
                    <div className="flex justify-between text-stone-600">
                        <span>Merchandise Subtotal:</span>
                        <span className="font-semibold text-stone-800">
                            PHP {Number(order.merchandise_subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex justify-between text-stone-500">
                        <span>Platform Commission:</span>
                        <span className="font-semibold text-emerald-600">0% (₱0.00)</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1.5 border-t border-stone-100/60 mb-2.5">
                        <span className="text-stone-900">Your Net Payout:</span>
                        <span className="text-emerald-600 font-extrabold text-[11px]">
                            PHP {Number(order.seller_net_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100/60 text-stone-400 space-y-1">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-1">Paid by Buyer (Separate)</div>
                        <div className="flex justify-between">
                            <span>Shipping Fee:</span>
                            <span className="font-medium text-stone-600">
                                PHP {Number(order.shipping_fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span>Convenience Fee (3%):</span>
                            <span className="font-medium text-stone-600">
                                PHP {Number(order.convenience_fee_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

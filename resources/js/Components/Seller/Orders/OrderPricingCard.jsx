import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function OrderPricingCard({
    order,
    expandedPricingDetails,
    togglePricingDetailsExpansion
}) {
    const isExpanded = expandedPricingDetails.has(order.id);

    return (
        <div className="mb-4 rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
            <button
                type="button"
                onClick={() => togglePricingDetailsExpansion(order.id)}
                className={`flex items-center justify-between w-full cursor-pointer select-none p-2 rounded-xl hover:bg-stone-50 transition-colors text-left focus:outline-none min-h-[44px] ${
                    isExpanded ? "border-b border-stone-100 pb-2 mb-2" : ""
                }`}
            >
                <div>
                    <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                        Buyer Total
                    </p>
                    <p className="text-sm font-bold text-stone-800">
                        PHP {order.total}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-right">
                    <div>
                        <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                            Your Net
                        </p>
                        <p className="text-sm font-bold text-emerald-600">
                            PHP {Number(order.seller_net_amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2
                            })}
                        </p>
                    </div>
                    {isExpanded ? (
                        <ChevronDown size={12} className="text-stone-400 self-end mb-1" />
                    ) : (
                        <ChevronRight size={12} className="text-stone-400 self-end mb-1" />
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
                        <span>Platform Commission (5%):</span>
                        <span className="font-semibold text-red-500">
                            - PHP {Number(order.platform_commission_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
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

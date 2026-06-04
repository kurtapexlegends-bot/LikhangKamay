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
                <div className="space-y-1.5 text-[10px] mt-2 px-1">
                    <div className="flex justify-between text-stone-500 border-b border-stone-50 pb-1 mb-1">
                        <span>Merchandise:</span>
                        <span className="font-semibold text-stone-700">
                            {Number(order.merchandise_subtotal).toLocaleString(undefined, {
                                minimumFractionDigits: 2
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between text-stone-400 pt-0.5">
                        <span>Shipping (Paid by Buyer):</span>
                        <span className="font-medium text-stone-600">
                            {Number(order.shipping_fee_amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2
                            })}
                        </span>
                    </div>
                    <div className="flex justify-between text-stone-400">
                        <span>Platform Fee (Paid by Buyer):</span>
                        <span className="font-medium text-stone-600">
                            {Number(order.convenience_fee_amount).toLocaleString(undefined, {
                                minimumFractionDigits: 2
                            })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

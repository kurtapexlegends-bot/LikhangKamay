import React from 'react';
import { 
    ShoppingBag, ShieldCheck, Truck, 
    ArrowRight, AlertTriangle 
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CartOrderSummary({
    selectedCount = 0,
    selectedTotalAmount = 0,
    totalWeightKg = 0,
    highestVehicle,
    onProceedToCheckout,
    isProcessing = false,
    hasMoqViolations = false,
}) {
    return (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-5 shadow-2xs sticky top-6">
            <h2 className="text-base font-bold text-stone-900 tracking-tight pb-3 border-b border-stone-150">
                Order Summary
            </h2>

            <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                    <span>Selected Materials</span>
                    <span className="font-bold text-stone-900">{selectedCount} items</span>
                </div>

                <div className="flex items-center justify-between text-stone-600">
                    <span>Estimated Total Weight</span>
                    <span className="font-bold text-stone-900">{roundNumber(totalWeightKg, 1)} kg (with tare)</span>
                </div>

                {highestVehicle && (
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-150 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-stone-800 text-xs">
                            <Truck size={14} className="text-clay-600" />
                            <span>Courier Service: {highestVehicle.label}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 leading-relaxed font-medium">
                            {highestVehicle.reason}
                        </p>
                    </div>
                )}

                <div className="pt-3 border-t border-stone-150 flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-sm">Materials Subtotal</span>
                    <span className="font-extrabold text-stone-900 text-base">{formatCurrency(selectedTotalAmount)}</span>
                </div>
                <p className="text-[11px] text-stone-400">Shipping rates calculated at checkout per supplier store address.</p>
            </div>

            {hasMoqViolations && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-semibold">
                    <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                    <span>Some items are below their minimum order requirement.</span>
                </div>
            )}

            <button
                type="button"
                disabled={selectedCount === 0 || isProcessing || hasMoqViolations}
                onClick={onProceedToCheckout}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-clay-600 hover:bg-clay-700 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-clay-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
                <ShoppingBag size={16} />
                <span>Proceed to Checkout</span>
                <ArrowRight size={15} />
            </button>

            <div className="pt-2 border-t border-stone-150 flex items-center gap-2 text-[11px] text-stone-500 justify-center font-medium">
                <ShieldCheck size={14} className="text-clay-600" />
                <span>Automatic Studio Inventory Sync upon Delivery</span>
            </div>
        </div>
    );
}

function roundNumber(num, dec) {
    return Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec);
}

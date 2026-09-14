import React from 'react';
import {
    Truck,
    Scale,
    Car,
    Bike,
    Receipt,
    AlertTriangle,
} from 'lucide-react';

export default function LalamoveQuoteSection({
    recipientName,
    contactPhone,
    deliveryAddress,
    resolvedWeightKg,
    isHeavyOrder,
    recommendedVehicle,
    hasShippingFee,
    shippingFeeAmount,
}) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600 font-bold">
                        <Truck size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-stone-900">
                            Book Lalamove On-Demand Courier
                        </h4>
                        <p className="text-xs text-stone-500">
                            Instant automated booking with 3rd-party motorcycle or four-wheel courier.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-stone-100">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Drop-off Recipient
                        </p>
                        <p className="font-bold text-stone-800">{recipientName}</p>
                        <p className="text-stone-500">{contactPhone}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                            Drop-off Address
                        </p>
                        <p className="font-medium text-stone-700 line-clamp-2">{deliveryAddress}</p>
                    </div>
                </div>

                {/* Lalamove Logistics Specs */}
                <div className="mt-3 rounded-xl border border-stone-200/80 bg-white p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-stone-600">
                            <Scale size={13} className="text-orange-600" />
                            Total Package Weight
                        </span>
                        <span className="font-mono font-bold text-stone-900">
                            {resolvedWeightKg.toFixed(1)} kg
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-bold text-stone-600">
                            {isHeavyOrder ? (
                                <Car size={13} className="text-orange-600" />
                            ) : (
                                <Bike size={13} className="text-orange-600" />
                            )}
                            Recommended Courier Tier
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            isHeavyOrder
                                ? "bg-amber-100 text-amber-900 border border-amber-200"
                                : "bg-stone-100 text-stone-800"
                        }`}>
                            {recommendedVehicle}
                        </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-stone-100">
                        <span className="flex items-center gap-1.5 font-bold text-stone-600">
                            <Receipt size={13} className="text-orange-600" />
                            Customer Shipping Fee Paid
                        </span>
                        <span className="font-mono font-bold text-emerald-700">
                            {hasShippingFee ? `₱${shippingFeeAmount.toFixed(2)}` : "Free / Included"}
                        </span>
                    </div>
                    {isHeavyOrder && (
                        <p className="text-[10px] text-amber-800 leading-snug flex items-start gap-1 pt-0.5">
                            <AlertTriangle size={12} className="shrink-0 mt-0.5 text-amber-600" />
                            <span>Lalamove automated quotation will request a 4-wheel vehicle (Sedan/MPV/Van) due to package weight ({resolvedWeightKg.toFixed(1)} kg).</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

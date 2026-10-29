import React from "react";
import { usePage } from "@inertiajs/react";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import TextAreaWithCounter from "@/Components/TextAreaWithCounter";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const modalFieldClass =
    "w-full mt-1 rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500";
const modalTextareaClass = `${modalFieldClass} min-h-[110px]`;
const modalSelectClass =
    "w-full mt-1 rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500 py-3 pl-4 pr-10 min-h-[44px]";

export default function ProductFormBasicDetails({
    data,
    setData,
    errors,
    categories,
    activationReadiness,
    handleStatusChange,
    selectedProduct,
    subscription,
    setActiveFormTab,
}) {
    const { auth } = usePage().props;
    const isVatRegistered = Boolean(auth?.user?.is_vat_registered);
    const numPrice = Number(data.price) || 0;
    const numCost = Number(data.cost_price) || 0;

    let vatableSales = 0;
    let vatAmount = 0;
    let netRevenue = 0;

    if (isVatRegistered) {
        vatableSales = numPrice > 0 ? Math.round((numPrice / 1.12) * 100) / 100 : 0;
        vatAmount = numPrice > 0 ? Math.round((numPrice - vatableSales) * 100) / 100 : 0;
        netRevenue = vatableSales;
    } else {
        netRevenue = numPrice;
    }

    const estimatedProfit = numPrice > 0 && numCost > 0 ? Math.round((netRevenue - numCost) * 100) / 100 : null;
    const profitMarginPercent = numPrice > 0 && estimatedProfit !== null && netRevenue > 0
        ? Math.round((estimatedProfit / netRevenue) * 1000) / 10 
        : null;

    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                        <InputLabel value="Product Name *" />
                        <span className={`text-[10px] font-bold ${(data.name || '').length < 10 || (data.name || '').length > 60 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {(data.name || '').length} / 60 chars (Min 10)
                        </span>
                    </div>
                    <TextInput
                        className={`${modalFieldClass} text-lg font-bold min-h-[44px] sm:min-h-0`}
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder="e.g. Handcrafted Stoneware Vase"
                        maxLength={60}
                        autoFocus
                    />
                    <InputError message={errors.name} className="mt-2" />
                </div>

                <div className="md:col-span-2">
                    <InputLabel value="Description" />
                    <TextAreaWithCounter
                        className={modalTextareaClass}
                        rows="4"
                        value={data.description}
                        onChange={(e) => setData("description", e.target.value)}
                        placeholder="Describe the texture, story, and details..."
                        maxLength={500}
                    />
                </div>

                <div className={data.id ? "" : "md:col-span-2"}>
                    <InputLabel value="Category *" />
                    <select
                        className={modalSelectClass}
                        value={data.category}
                        onChange={(e) => setData("category", e.target.value)}
                    >
                        <option value="" disabled>
                            Select Category
                        </option>
                        {categories.map((c) => {
                            const name = typeof c === 'object' ? c.name : c;
                            return (
                                <option key={name} value={name}>
                                    {name}
                                </option>
                            );
                        })}
                    </select>
                    <InputError message={errors.category} className="mt-2" />
                </div>

                {data.id && (
                    <div>
                        <InputLabel value="Status" />
                    {(() => {
                        const isAlreadyActive = selectedProduct?.status === "Active";
                        const isPending = selectedProduct?.status === "pending_review";
                        const isRejected = selectedProduct?.status === "rejected" || selectedProduct?.status === "flagged";
                        const isOverPlanLimit = !isAlreadyActive && Boolean(subscription && subscription.limit && (subscription.activeCount >= subscription.limit));
                        const cannotBeActive = !activationReadiness.canActivate || isOverPlanLimit;

                        return (
                            <>
                                <select
                                    id="status"
                                    className={modalSelectClass}
                                    value={data.status}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                >
                                    {/* If currently under admin review */}
                                    {isPending && (
                                        <option value="pending_review">Pending Review (Under Moderation)</option>
                                    )}

                                    {/* If already approved and live */}
                                    {isAlreadyActive && (
                                        <option value="Active">Active (Live in Shop)</option>
                                    )}

                                    {/* If in draft or archived, allow submitting for review */}
                                    {!isAlreadyActive && !isPending && !isRejected && (
                                        <option value="Active" disabled={cannotBeActive}>
                                            {isOverPlanLimit
                                                ? "Submit for Review (Plan limit reached)"
                                                : !activationReadiness.canActivate
                                                ? "Submit for Review (Missing required media)"
                                                : "Submit for Review"}
                                        </option>
                                    )}

                                    {/* If rejected / needs revision */}
                                    {isRejected && (
                                        <option value={selectedProduct.status}>
                                            {selectedProduct.status === "rejected" ? "Needs Revision" : "Flagged"}
                                        </option>
                                    )}

                                    <option value="Draft">
                                        {isPending ? "Withdraw to Draft" : "Draft"}
                                    </option>
                                    <option value="Archived">Archived</option>
                                </select>

                                {/* Explanatory notification when Submit for Review cannot be selected */}
                                {!isPending && !isRejected && cannotBeActive && data.status !== "Active" && (
                                    <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1.5 animate-fadeIn">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                            <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                            <span>Why can't this product be submitted?</span>
                                        </div>
                                        <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 pl-0.5 font-medium">
                                            {!activationReadiness.canActivate && (
                                                <li>
                                                    <span>Missing required listing media: </span>
                                                    <span className="font-semibold text-amber-950">
                                                        {activationReadiness.missingLabels.join(", ")}
                                                    </span>
                                                    {setActiveFormTab && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveFormTab("Media")}
                                                            className="ml-1.5 inline font-bold text-clay-700 underline hover:text-clay-900"
                                                        >
                                                            Go to Media tab &rarr;
                                                        </button>
                                                    )}
                                                </li>
                                            )}
                                            {isOverPlanLimit && (
                                                <li>
                                                    <span>Active product limit reached: </span>
                                                    <span className="font-semibold text-amber-950">
                                                        {subscription.activeCount} of {subscription.limit} active slots used
                                                    </span>
                                                    . Move another active item to Draft or upgrade your plan to activate this product.
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                )}

                                {data.status === "Active" && isAlreadyActive && (
                                    <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2">
                                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                                        <p className="text-[11px] font-bold text-emerald-700">
                                            Live on marketplace
                                        </p>
                                    </div>
                                )}
                            </>
                        );
                    })()}
                    {(data.status === 'rejected' || data.status === 'flagged') && (
                        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-[11px] font-bold text-red-700">
                                Listing {data.status === 'rejected' ? 'Needs Revision' : 'Flagged'}
                            </p>
                            {selectedProduct?.rejection_reason && (
                                <p className="mt-1 text-[10px] text-red-600 font-semibold">
                                    Reason: {selectedProduct.rejection_reason}
                                </p>
                            )}
                            <p className="mt-1 text-[10px] text-stone-500 font-medium">
                                Saving updates will keep this listing as {data.status === 'rejected' ? 'Needs Revision' : 'Flagged'}. Resubmit the listing once your changes are ready.
                            </p>
                        </div>
                    )}
                    {data.status === 'pending_review' && (
                        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                            <p className="text-[11px] font-bold text-amber-700">
                                Pending Review
                            </p>
                            <p className="mt-1 text-[10px] text-stone-600 font-medium">
                                This listing is currently being reviewed by administrators and is hidden from the catalog.
                            </p>
                        </div>
                    )}
                </div>
                )}

                <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                        Inventory & Pricing
                    </h3>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <InputLabel value="Price (₱) *" />
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold z-10 select-none pointer-events-none">
                                    ₱
                                </span>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500 pl-7 min-h-[44px] sm:min-h-0"
                                    value={data.price}
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={(e) => setData("price", e.target.value.replace(/-/g, ""))}
                                    placeholder="0.00"
                                />
                            </div>
                            <InputError message={errors.price} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel value="Cost Price (₱) *" />
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold z-10 select-none pointer-events-none">
                                    ₱
                                </span>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500 pl-7 min-h-[44px] sm:min-h-0"
                                    value={data.cost_price}
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={(e) => setData("cost_price", e.target.value.replace(/-/g, ""))}
                                    placeholder="0.00"
                                />
                            </div>
                            <InputError message={errors.cost_price} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel value="Stock *" />
                            <TextInput
                                type="number"
                                min="0"
                                step="1"
                                className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                                value={data.stock}
                                onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                onChange={(e) => setData("stock", e.target.value.replace(/[-.]/g, ""))}
                                placeholder="0"
                            />
                            <InputError message={errors.stock} className="mt-2" />
                        </div>
                    </div>

                    {/* Live VAT & Profit Margin Transparency Widget */}
                    {numPrice > 0 && (
                        <div className="mt-4 rounded-xl border border-stone-200/90 bg-stone-50/70 p-3.5 sm:p-4 text-xs transition-all">
                            <div className="flex items-center justify-between border-b border-stone-200/60 pb-2 mb-2.5">
                                <span className="font-bold text-stone-700 text-xs">
                                    What You Earn from This Price
                                </span>
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    isVatRegistered 
                                        ? 'bg-clay-100 text-clay-800 border border-clay-200' 
                                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                    {isVatRegistered ? 'VAT-Registered Shop (12%)' : 'Non-VAT Shop (VAT-Exempt)'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-stone-600">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 block">Customer Pays</span>
                                    <span className="font-mono font-bold text-stone-900 text-sm">
                                        ₱{numPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-[10px] text-stone-500 block mt-0.5">
                                        Final price in your store
                                    </span>
                                </div>

                                {isVatRegistered ? (
                                    <>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-stone-400 block">12% VAT for BIR</span>
                                            <span className="font-mono font-bold text-amber-700 text-sm">
                                                ₱{vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-stone-500 block mt-0.5">Set aside for taxes</span>
                                        </div>

                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-stone-400 block">What Your Shop Keeps</span>
                                            <span className="font-mono font-bold text-stone-900 text-sm">
                                                ₱{netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                            <span className="text-[10px] text-stone-500 block mt-0.5">Sales before expenses</span>
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-stone-400 block">What Your Shop Keeps</span>
                                        <span className="font-mono font-bold text-stone-900 text-sm">
                                            ₱{netRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">100% yours • No added VAT</span>
                                    </div>
                                )}

                                {estimatedProfit !== null ? (
                                    <div>
                                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Your Estimated Profit</span>
                                        <span className={`font-mono font-bold text-sm ${estimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                                            ₱{estimatedProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-[10px] text-stone-500 block mt-0.5">
                                            {profitMarginPercent !== null ? `${profitMarginPercent}% profit margin` : 'Earnings minus costs'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center text-[10px] text-stone-400 leading-tight">
                                        <span>Add a Cost Price above to see your estimated profit.</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

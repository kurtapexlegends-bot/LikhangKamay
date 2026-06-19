import React from "react";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import TextAreaWithCounter from "@/Components/TextAreaWithCounter";

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
}) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <InputLabel value="Product Name *" />
                    <TextInput
                        className={`${modalFieldClass} text-lg font-bold min-h-[44px] sm:min-h-0`}
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder="e.g. Handcrafted Stoneware Vase"
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

                <div>
                    <InputLabel value="Category *" />
                    <select
                        className={modalSelectClass}
                        value={data.category}
                        onChange={(e) => setData("category", e.target.value)}
                    >
                        <option value="" disabled>
                            Select Category
                        </option>
                        {categories.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.category} className="mt-2" />
                </div>

                <div>
                    <InputLabel value="Status" />
                    <select
                        className={modalSelectClass}
                        value={data.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                    >
                        <option value="Active" disabled={!activationReadiness.canActivate}>
                            Active
                        </option>
                        <option value="Draft">Draft</option>
                        <option value="Archived">Archived</option>
                        {data.status === "pending_review" && (
                            <option value="pending_review">Pending Review</option>
                        )}
                        {data.status === "rejected" && (
                            <option value="rejected">Rejected</option>
                        )}
                        {data.status === "flagged" && (
                            <option value="flagged">Flagged</option>
                        )}
                    </select>
                    {data.status === "Active" && (
                        <div className={`mt-2 rounded-xl border px-3 py-2 ${activationReadiness.canActivate ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                            <p className={`text-[11px] font-bold ${activationReadiness.canActivate ? "text-emerald-700" : "text-amber-700"}`}>
                                {activationReadiness.canActivate
                                    ? "Ready for Active listing"
                                    : `Still needed for Active: ${activationReadiness.missingLabels.join(", ")}`}
                            </p>
                            <p className={`mt-1 text-[10px] ${activationReadiness.canActivate ? "text-emerald-600" : "text-amber-600"}`}>
                                {activationReadiness.canActivate
                                    ? "Activation requirements are complete."
                                    : "Active stays locked until the required media is uploaded."}
                            </p>
                        </div>
                    )}
                    {(data.status === 'rejected' || data.status === 'flagged') && (
                        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                            <p className="text-[11px] font-bold text-red-700">
                                Listing {data.status === 'rejected' ? 'Rejected' : 'Flagged'}
                            </p>
                            {selectedProduct?.rejection_reason && (
                                <p className="mt-1 text-[10px] text-red-600 font-semibold">
                                    Reason: {selectedProduct.rejection_reason}
                                </p>
                            )}
                            <p className="mt-1 text-[10px] text-stone-500 font-medium">
                                Saving updates will keep the listing as {data.status === 'rejected' ? 'Rejected' : 'Flagged'}. You must explicitly click the status in the products table to resubmit it.
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

                <div className="md:col-span-2 border-t border-gray-100 pt-6 mt-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                        Inventory & Pricing
                    </h3>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <InputLabel value="Price (₱) *" />
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                    ₱
                                </span>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full pl-7 min-h-[44px] sm:min-h-0"
                                    value={data.price}
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={(e) => setData("price", e.target.value.replace(/-/g, ""))}
                                />
                            </div>
                            <InputError message={errors.price} className="mt-2" />
                        </div>
                        <div>
                            <InputLabel value="Cost Price (₱) *" />
                            <div className="relative mt-1">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                    ₱
                                </span>
                                <TextInput
                                    type="number"
                                    min="0"
                                    step="any"
                                    className={`${modalFieldClass} pl-7 min-h-[44px] sm:min-h-0`}
                                    value={data.cost_price}
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={(e) => setData("cost_price", e.target.value.replace(/-/g, ""))}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div>
                            <InputLabel value="Stock *" />
                            <TextInput
                                type="number"
                                min="0"
                                step="1"
                                className="w-full mt-1 min-h-[44px] sm:min-h-0"
                                value={data.stock}
                                onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                onChange={(e) => setData("stock", e.target.value.replace(/[-.]/g, ""))}
                            />
                            <InputError message={errors.stock} className="mt-2" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

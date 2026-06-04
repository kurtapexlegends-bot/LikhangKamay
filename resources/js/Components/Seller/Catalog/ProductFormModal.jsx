import React from "react";
import Modal from "@/Components/Modal";
import TextInput from "@/Components/TextInput";
import InputLabel from "@/Components/InputLabel";
import InputError from "@/Components/InputError";
import PrimaryButton from "@/Components/PrimaryButton";
import TextAreaWithCounter from "@/Components/TextAreaWithCounter";
import Checkbox from "@/Components/Checkbox";
import External3DToolLink from "@/Components/ThreeD/External3DToolLink";
import {
    X,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Check,
    CheckCircle,
    ListTodo,
    Settings,
    Store,
    Cuboid,
    Trash2
} from "lucide-react";

const modalFieldClass =
    "w-full mt-1 rounded-xl border-gray-300 bg-white text-sm text-gray-900 shadow-none focus:border-clay-500 focus:ring-clay-500";
const modalTextareaClass = `${modalFieldClass} min-h-[110px]`;
const modalCloseButtonClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-400 transition hover:border-gray-300 hover:text-gray-700 min-h-[44px] min-w-[44px]";

export default function ProductFormModal({
    isOpen,
    onClose,
    data,
    setData,
    processing,
    errors,
    activeFormTab,
    setActiveFormTab,
    submitProduct,
    categories,
    supplies,
    canEditProducts,
    activationReadiness,
    skuValidation,
    shouldValidateSku,
    previews,
    handleFileChange,
    handleModelAssetFolderChange,
    handleRemoveGalleryImage,
    handleStatusChange,
    addRecipeItem,
    removeRecipeItem,
    updateRecipeItem,
    selectedProduct,
}) {
    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <form
                onSubmit={submitProduct}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.tagName !== "TEXTAREA") {
                        e.preventDefault();
                        if (activeFormTab !== "Media") {
                            const tabs = ["Essentials", "Details", "Production", "Media"];
                            const currentIndex = tabs.indexOf(activeFormTab);
                            setActiveFormTab(tabs[currentIndex + 1]);
                        } else {
                            submitProduct(e);
                        }
                    }
                }}
                className="flex max-h-[85vh] flex-col"
            >
                <div className="shrink-0 border-b border-gray-100 px-5 py-5 sm:px-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {data.id ? "Edit Product" : "New Product"}
                            </h2>
                            <div className="mt-2 flex flex-col gap-1.5">
                                <div className="relative max-w-[200px]">
                                    <input
                                        type="text"
                                        className={`w-full rounded-lg border-gray-300 bg-white px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-gray-700 shadow-none focus:border-clay-500 focus:ring-clay-500 min-h-[36px] sm:min-h-0 ${skuValidation.isValid === false ? 'border-red-300 bg-red-50' : ''}`}
                                        value={data.sku}
                                        onChange={(e) => setData("sku", e.target.value.toUpperCase())}
                                        placeholder="LK-XXXX"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                        {shouldValidateSku && data.sku && (
                                            skuValidation.isValid === null ? (
                                                <Loader2 size={12} className="animate-spin text-stone-400" />
                                            ) : skuValidation.isValid ? (
                                                <CheckCircle2 size={12} className="text-emerald-500" />
                                            ) : (
                                                <AlertTriangle size={12} className="text-red-500" />
                                            )
                                        )}
                                    </div>
                                </div>
                                {skuValidation.isValid === false && (
                                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">
                                        {skuValidation.message}
                                    </p>
                                )}
                                {errors.sku && <p className="text-[10px] text-red-500 font-medium">{errors.sku}</p>}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className={modalCloseButtonClass}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="mt-4 flex rounded-xl bg-gray-100 p-1 overflow-x-auto no-scrollbar">
                        {[
                            "Essentials",
                            "Details",
                            "Production",
                            "Media",
                        ].map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveFormTab(tab)}
                                className={`px-4 py-2.5 sm:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap min-h-[40px] sm:min-h-0 flex-1 ${activeFormTab === tab ? "bg-white text-clay-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                    {/* TAB 1: ESSENTIALS */}
                    {activeFormTab === "Essentials" && (
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
                                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
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
                                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
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
                                                Saving updates to this product will automatically resubmit it for review.
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
                    )}

                    {/* TAB 2: DETAILS */}
                    {activeFormTab === "Details" && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <InputLabel value="Clay Type" />
                                    <select
                                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                                        value={data.clay_type}
                                        onChange={(e) => setData("clay_type", e.target.value)}
                                    >
                                        {["Stoneware", "Porcelain", "Terracotta", "Earthenware"].map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel value="Glaze Type" />
                                    <select
                                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                                        value={data.glaze_type}
                                        onChange={(e) => setData("glaze_type", e.target.value)}
                                    >
                                        {["Matte", "Glossy", "Satin", "Crystalline", "Unglazed"].map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <InputLabel value="Firing Method" />
                                    <select
                                        className={`${modalFieldClass} min-h-[44px] sm:min-h-0`}
                                        value={data.firing_method}
                                        onChange={(e) => setData("firing_method", e.target.value)}
                                    >
                                        {["Electric Kiln", "Gas Kiln", "Wood Fired", "Raku"].map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center">
                                    <label className="group flex cursor-pointer items-center gap-3">
                                        <Checkbox
                                            name="food_safe"
                                            checked={data.food_safe}
                                            onChange={(e) => setData("food_safe", e.target.checked)}
                                        />
                                        <div>
                                            <span className="text-sm font-bold text-gray-700 transition group-hover:text-clay-600">
                                                Food Safe
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Safe for eating / Lead-free
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                    Dimensions
                                </h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <div>
                                        <InputLabel value="Height (cm)" />
                                        <TextInput
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                                            value={data.height}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => setData("height", e.target.value.replace(/-/g, ""))}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Width (cm)" />
                                        <TextInput
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                                            value={data.width}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => setData("width", e.target.value.replace(/-/g, ""))}
                                        />
                                    </div>
                                    <div>
                                        <InputLabel value="Weight (g)" />
                                        <TextInput
                                            type="number"
                                            min="0"
                                            step="any"
                                            className="w-full mt-1 min-h-[44px] sm:min-h-0"
                                            value={data.weight}
                                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                            onChange={(e) => setData("weight", e.target.value.replace(/-/g, ""))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PRODUCTION */}
                    {activeFormTab === "Production" && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                                <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            <Settings size={18} className="text-stone-400" />
                                            Production Method
                                        </h3>
                                        <p className="mt-1 text-xs text-stone-500">
                                            Define how this product is sourced and managed.
                                        </p>
                                    </div>
                                    <div className="flex bg-stone-100 p-1 rounded-xl shrink-0 w-fit select-none">
                                        <button
                                            type="button"
                                            onClick={() => setData("production_method", "resell")}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${data.production_method === "resell" ? "bg-white text-clay-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                                        >
                                            Resell
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setData("production_method", "manufactured")}
                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition min-h-[36px] ${data.production_method === "manufactured" ? "bg-white text-clay-700 shadow-sm" : "text-stone-500 hover:text-stone-700"}`}
                                        >
                                            Manufactured
                                        </button>
                                    </div>
                                </div>

                                {data.production_method === "manufactured" ? (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                                                Bill of Materials (Recipe)
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={addRecipeItem}
                                                className="flex items-center gap-1.5 text-xs font-bold text-clay-600 hover:text-clay-700 transition p-1"
                                            >
                                                <Plus size={14} /> Add Ingredient
                                            </button>
                                        </div>

                                        {data.recipes.length > 0 ? (
                                            <div className="space-y-3">
                                                {data.recipes.map((item, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 animate-fadeIn">
                                                        <div className="flex-1">
                                                            <select
                                                                className="w-full rounded-xl border-gray-300 text-sm focus:border-clay-500 focus:ring-clay-500 min-h-[44px] sm:min-h-0"
                                                                value={item.supply_id}
                                                                onChange={(e) => updateRecipeItem(idx, "supply_id", e.target.value)}
                                                            >
                                                                <option value="" disabled>
                                                                    Select Material
                                                                </option>
                                                                {supplies.map((s) => (
                                                                    <option key={s.id} value={s.id}>
                                                                        {s.name} ({s.unit || "pcs"})
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="w-24">
                                                            <input
                                                                type="number"
                                                                className="w-full rounded-xl border-gray-300 text-sm focus:border-clay-500 focus:ring-clay-500 min-h-[44px] sm:min-h-0"
                                                                placeholder="Qty"
                                                                value={item.quantity_required}
                                                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                                                onChange={(e) => updateRecipeItem(idx, "quantity_required", e.target.value.replace(/-/g, ""))}
                                                                min="0.01"
                                                                step="any"
                                                            />
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRecipeItem(idx)}
                                                            className="text-stone-400 hover:text-rose-600 p-2 rounded-lg transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50">
                                                <p className="text-xs text-stone-500">
                                                    No materials added yet. Add materials from your supplies.
                                                </p>
                                            </div>
                                        )}

                                        <div className="border-t border-stone-150 pt-4 flex flex-col gap-4">
                                            <div className="flex items-center gap-3">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <Checkbox
                                                        name="track_as_supply"
                                                        checked={data.track_as_supply}
                                                        onChange={(e) => setData("track_as_supply", e.target.checked)}
                                                    />
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-700 transition group-hover:text-clay-600">
                                                            Auto-Deduct Supplies
                                                        </span>
                                                        <p className="text-xs text-gray-500">
                                                            Deduct materials automatically upon successful production runs.
                                                        </p>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-stone-50 p-6 text-center border border-stone-100">
                                        <Store className="mx-auto text-stone-400 mb-3" size={32} />
                                        <h4 className="text-sm font-bold text-gray-900">
                                            Resell Mode Active
                                        </h4>
                                        <p className="mt-2 text-xs text-stone-500 max-w-xs mx-auto">
                                            In resell mode, you simply manage stock and prices without a bill of materials. Perfect for finished goods sourced from other artisans.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB 4: MEDIA */}
                    {activeFormTab === "Media" && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden mb-6">
                                <div className={`px-6 py-5 border-b ${activationReadiness.canActivate ? "bg-emerald-50/50 border-emerald-100" : "bg-stone-50/50 border-stone-100"}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                {activationReadiness.canActivate ? (
                                                    <CheckCircle size={18} className="text-emerald-500" />
                                                ) : (
                                                    <ListTodo size={18} className="text-stone-400" />
                                                )}
                                                Activation Checklist
                                            </h3>
                                            <p className="mt-1 text-xs text-stone-500">
                                                {activationReadiness.canActivate
                                                    ? "All media requirements met. This product is ready for activation."
                                                    : "Complete these requirements before listing this product as Active."}
                                            </p>
                                        </div>
                                        <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide border shrink-0 ${activationReadiness.canActivate ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
                                            {activationReadiness.canActivate ? "Ready" : "Draft only"}
                                        </div>
                                    </div>

                                    {!activationReadiness.canActivate && (
                                        <div className="mt-5">
                                            <div className="flex justify-between text-[10px] font-bold text-stone-500 mb-1.5">
                                                <span>Progress</span>
                                                <span>
                                                    {activationReadiness.items.filter((i) => i.complete).length} of {activationReadiness.items.length} completed
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-clay-500 transition-all duration-500 ease-out"
                                                    style={{
                                                        width: `${(activationReadiness.items.filter((i) => i.complete).length / activationReadiness.items.length) * 100}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 sm:p-6 bg-white">
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 select-none">
                                        {activationReadiness.items.map((item) => (
                                            <div
                                                key={item.key}
                                                className={`relative rounded-xl border p-4 transition-all ${item.complete ? "border-emerald-100 bg-emerald-50/30" : "border-stone-200 bg-white hover:border-stone-300"}`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 shrink-0">
                                                        {item.complete ? (
                                                            <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                                                <Check size={12} strokeWidth={3} />
                                                            </div>
                                                        ) : (
                                                            <div className="h-5 w-5 rounded-full border-2 border-stone-300 flex items-center justify-center">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-stone-300"></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${item.complete ? "text-gray-900" : "text-gray-700"}`}>
                                                            {item.label}
                                                        </p>
                                                        <p className={`mt-0.5 text-xs ${item.complete ? "text-emerald-600 font-medium" : "text-stone-500"}`}>
                                                            {item.complete ? "Completed" : item.detail}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Cover Photo */}
                                <div>
                                    <InputLabel value="Cover Photo (Main)" className="mb-2" />
                                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-clay-400 transition group bg-gray-50">
                                        {previews.cover ? (
                                            <>
                                                <img
                                                    src={previews.cover}
                                                    alt="Cover"
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setData("cover_photo", null);
                                                            handleFileChange({ target: { files: [] } }, "cover_photo");
                                                        }}
                                                        className="bg-white text-rose-600 px-4 py-3.5 rounded-xl text-xs font-bold shadow-lg hover:bg-rose-50 transition min-h-[44px]"
                                                    >
                                                        Remove Photo
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer min-h-[44px]">
                                                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                                                    <Plus className="text-clay-600" />
                                                </div>
                                                <span className="text-sm font-bold text-gray-600">
                                                    Upload Cover
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-1">
                                                    JPG/PNG, Max 5MB
                                                </span>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileChange(e, "cover_photo")}
                                                />
                                            </label>
                                        )}
                                    </div>
                                    <InputError message={errors.cover_photo} className="mt-2" />
                                </div>

                                {/* Gallery & 3D */}
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <InputLabel value="Gallery Images" />
                                            <span className={`text-[10px] font-bold ${previews.gallery.length < 3 ? "text-orange-500" : previews.gallery.length > 5 ? "text-rose-500" : "text-emerald-600"}`}>
                                                {previews.gallery.length < 3
                                                    ? `Add ${3 - previews.gallery.length} more (Min 3)`
                                                    : previews.gallery.length > 5
                                                    ? `Exceeds max (Max 5)`
                                                    : "Perfect (3-5 images)"}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                            {previews.gallery.map((preview, idx) => (
                                                <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                                    <img
                                                        src={preview}
                                                        className="w-full h-full object-cover"
                                                        alt={`Preview ${idx + 1}`}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveGalleryImage(idx)}
                                                            className="w-10 h-10 flex items-center justify-center bg-white text-rose-600 rounded-full shadow-lg hover:bg-rose-50 transition drop-shadow min-h-[44px] min-w-[44px]"
                                                            title="Remove image"
                                                        >
                                                            <X size={16} strokeWidth={3} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}

                                            {previews.gallery.length < 5 && (
                                                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-clay-400 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition min-h-[44px]">
                                                    <Plus size={20} className="text-gray-400 mb-1" />
                                                    <span className="text-[10px] font-bold text-gray-500">
                                                        Add
                                                    </span>
                                                    <input
                                                        type="file"
                                                        multiple
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(e, "gallery")}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <InputLabel value="3D Model" className="mb-2" />
                                        {data.model_3d ? (
                                            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg text-emerald-600 shadow-sm">
                                                        <Check size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-bold text-emerald-800 truncate max-w-[150px]">
                                                            {data.model_3d.name}
                                                        </p>
                                                        <p className="text-[10px] text-emerald-600">
                                                            Ready to upload
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setData("model_3d", null)}
                                                    className="text-emerald-600 hover:text-emerald-800 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : data.model_3d_path ? (
                                            <div className="flex items-center justify-between p-3 bg-sky-50 border border-sky-100 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg text-sky-600 shadow-sm">
                                                        <Cuboid size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-sky-800">
                                                            Current Model
                                                        </p>
                                                        <p className="text-[10px] text-sky-600">
                                                            Replace it with a new file.
                                                        </p>
                                                    </div>
                                                </div>
                                                <label className="cursor-pointer text-xs font-bold text-sky-600 hover:underline min-h-[44px] min-w-[44px] flex items-center justify-center">
                                                    Replace
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept=".glb,.gltf"
                                                        onChange={(e) => handleFileChange(e, "model_3d")}
                                                    />
                                                </label>
                                            </div>
                                        ) : (
                                            <label className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-clay-400 hover:bg-gray-50 transition group min-h-[44px]">
                                                <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-white group-hover:shadow-sm transition">
                                                    <Cuboid size={20} className="text-gray-400 group-hover:text-clay-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-gray-700">
                                                        Upload .glb / .gltf
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 group-hover:text-clay-500">
                                                        Required before the product can be listed as Active.
                                                    </p>
                                                </div>
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".glb,.gltf"
                                                    onChange={(e) => handleFileChange(e, "model_3d")}
                                                />
                                            </label>
                                        )}
                                        <InputError message={errors.model_3d} className="mt-2" />

                                        {/* Optional 3D Assets Directory Selection */}
                                        {Boolean(data.model_3d) && (
                                            <div className="mt-4 animate-fadeIn border-t border-stone-150 pt-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div>
                                                        <InputLabel value="Model Textures / Assets Folder (Optional)" />
                                                        <p className="text-[10px] text-stone-500">
                                                            Required if your model references external textures (.bin, images).
                                                        </p>
                                                    </div>
                                                    <External3DToolLink />
                                                </div>
                                                <label className="flex items-center gap-3 p-3 border border-stone-250 bg-stone-50/50 rounded-xl cursor-pointer hover:border-stone-400 hover:bg-stone-50 transition group min-h-[44px]">
                                                    <div className="flex-1">
                                                        <p className="text-xs font-bold text-stone-700">
                                                            {data.model_3d_assets?.length > 0
                                                                ? `${data.model_3d_assets.length} external assets loaded`
                                                                : "Select asset folder (with textures/bins)"}
                                                        </p>
                                                        {data.model_3d_asset_paths?.length > 0 && (
                                                            <p className="text-[10px] text-stone-500 mt-1 max-h-16 overflow-y-auto font-mono">
                                                                {data.model_3d_asset_paths.slice(0, 3).join(", ")}
                                                                {data.model_3d_asset_paths.length > 3 ? "..." : ""}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-clay-600 hover:text-clay-700">
                                                        Browse
                                                    </span>
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        webkitdirectory="true"
                                                        directory="true"
                                                        multiple
                                                        onChange={handleModelAssetFolderChange}
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="shrink-0 sticky bottom-0 z-20 border-t border-gray-100 bg-white/80 backdrop-blur-md px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-gray-50 min-h-[44px] sm:min-h-0"
                    >
                        Cancel
                    </button>

                    <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                        {activeFormTab !== "Essentials" && (
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs = ["Essentials", "Details", "Production", "Media"];
                                    const currentIndex = tabs.indexOf(activeFormTab);
                                    setActiveFormTab(tabs[currentIndex - 1]);
                                }}
                                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition min-h-[44px] sm:min-h-0"
                            >
                                Previous
                            </button>
                        )}

                        {activeFormTab === "Media" ? (
                            <PrimaryButton
                                type="submit"
                                className="px-8 py-2.5 rounded-xl shadow-lg shadow-clay-500/20 min-h-[44px] sm:min-h-0"
                                disabled={!canEditProducts || processing}
                            >
                                {processing
                                    ? "Saving..."
                                    : data.id
                                    ? "Save Changes"
                                    : "Publish Product"}
                            </PrimaryButton>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const tabs = ["Essentials", "Details", "Production", "Media"];
                                    const currentIndex = tabs.indexOf(activeFormTab);
                                    setActiveFormTab(tabs[currentIndex + 1]);
                                }}
                                className="px-6 py-2.5 bg-clay-600 text-white rounded-xl text-sm font-bold hover:bg-clay-700 transition shadow-lg shadow-clay-500/20 min-h-[44px] sm:min-h-0"
                            >
                                Next Step
                            </button>
                        )}
                    </div>
                </div>
            </form>
        </Modal>
    );
}

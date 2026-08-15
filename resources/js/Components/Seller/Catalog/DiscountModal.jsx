import React, { useState, useEffect } from "react";
import Modal from "@/Components/Modal";
import DiscountScheduleCard from "./DiscountModal/DiscountScheduleCard";
import DiscountStrategySelector from "./DiscountModal/DiscountStrategySelector";
import DiscountProductTable from "./DiscountModal/DiscountProductTable";
import { Tag, AlertCircle, CheckCircle2, Loader2, X, Users } from "lucide-react";
import { router } from "@inertiajs/react";

export default function DiscountModal({
    isOpen,
    onClose,
    selectedProducts = [],
    allProducts = [],
    canEdit = true,
    discountToEdit = null,
}) {
    // Target Product IDs
    const [targetProductIds, setTargetProductIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Campaign Schedule & Mode
    const [name, setName] = useState("");
    const [startAt, setStartAt] = useState("");
    const [endAt, setEndAt] = useState("");
    const [mode, setMode] = useState("global"); // 'global' | 'individual'

    // Global settings
    const [globalType, setGlobalType] = useState("percentage");
    const [globalValue, setGlobalValue] = useState("");

    // Followers-Exclusive toggle
    const [isFollowersOnly, setIsFollowersOnly] = useState(false);

    // Individual settings: { [productId]: { type: 'percentage'|'fixed', value: '' } }
    const [individualMap, setIndividualMap] = useState({});

    const [maxPurchaseLimit, setMaxPurchaseLimit] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Initialize defaults or discountToEdit on modal open
    useEffect(() => {
        if (!isOpen) return;

        setSearchQuery("");
        setErrorMsg(null);

        const formatForInput = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        if (discountToEdit) {
            setName(discountToEdit.name || "");
            setStartAt(discountToEdit.start_at ? formatForInput(new Date(discountToEdit.start_at)) : formatForInput(new Date()));
            setEndAt(discountToEdit.end_at ? formatForInput(new Date(discountToEdit.end_at)) : formatForInput(new Date(Date.now() + 7 * 86400000)));
            setGlobalType(discountToEdit.type || "percentage");
            setGlobalValue(discountToEdit.value ? String(discountToEdit.value) : "");
            setIsFollowersOnly(Boolean(discountToEdit.is_followers_only));
            setMaxPurchaseLimit(discountToEdit.max_purchase_limit ? String(discountToEdit.max_purchase_limit) : "");

            const existingPids = discountToEdit.products ? discountToEdit.products.map((p) => p.id) : [];
            setTargetProductIds(existingPids);

            // Populate individual map for existing linked products
            const initialIndiv = {};
            existingPids.forEach((pid) => {
                initialIndiv[pid] = {
                    type: discountToEdit.type || "percentage",
                    value: discountToEdit.value ? String(discountToEdit.value) : "",
                };
            });
            setIndividualMap(initialIndiv);
        } else {
            setName("");
            const now = new Date();
            const defaultEnd = new Date(Date.now() + 7 * 86400000);
            setStartAt(formatForInput(now));
            setEndAt(formatForInput(defaultEnd));
            setMode("global");
            setGlobalType("percentage");
            setGlobalValue("");
            setIsFollowersOnly(false);
            setMaxPurchaseLimit("");

            const preselectedPids = selectedProducts.length > 0
                ? selectedProducts.map((p) => p.id)
                : allProducts.map((p) => p.id);
            setTargetProductIds(preselectedPids);

            const initialIndiv = {};
            preselectedPids.forEach((pid) => {
                initialIndiv[pid] = { type: "percentage", value: "10" };
            });
            setIndividualMap(initialIndiv);
        }
    }, [isOpen, discountToEdit, selectedProducts, allProducts]);

    // Handle product selection toggles
    const handleToggleProduct = (id) => {
        setTargetProductIds((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
        if (!individualMap[id]) {
            setIndividualMap((prev) => ({
                ...prev,
                [id]: { type: "percentage", value: "10" },
            }));
        }
    };

    const handleToggleSelectAll = (filteredList) => {
        const filteredIds = filteredList.map((p) => p.id);
        const allSelected = filteredIds.every((id) => targetProductIds.includes(id));

        if (allSelected) {
            setTargetProductIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
        } else {
            setTargetProductIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
            setIndividualMap((prev) => {
                const updated = { ...prev };
                filteredIds.forEach((id) => {
                    if (!updated[id]) updated[id] = { type: "percentage", value: "10" };
                });
                return updated;
            });
        }
    };

    const updateIndividualSetting = (id, field, val) => {
        setIndividualMap((prev) => ({
            ...prev,
            [id]: {
                ...(prev[id] || { type: "percentage", value: "" }),
                [field]: val,
            },
        }));
    };

    // Calculate preview price
    const getCalculatedPrice = (productPrice, type, valStr) => {
        const price = Number(productPrice) || 0;
        const val = Number(valStr) || 0;
        if (val <= 0) return price;

        if (type === "percentage") {
            const discount = price * (val / 100);
            return Math.max(0, price - discount);
        } else {
            if (val < price) return Math.max(0, val);
            return Math.max(0, price - val);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (targetProductIds.length === 0) return;

        setIsSubmitting(true);
        setErrorMsg(null);

        const payloadStartAt = startAt ? new Date(startAt).toISOString() : new Date().toISOString();
        const payloadEndAt = endAt ? new Date(endAt).toISOString() : new Date(Date.now() + 7 * 86400000).toISOString();

        let payload = {
            name: name || undefined,
            start_at: payloadStartAt,
            end_at: payloadEndAt,
            is_followers_only: isFollowersOnly,
            max_purchase_limit: maxPurchaseLimit ? Number(maxPurchaseLimit) : null,
        };

        if (mode === "global") {
            payload.type = globalType;
            payload.value = Number(globalValue);
            payload.product_ids = targetProductIds;
        } else {
            payload.items = targetProductIds.map((pid) => {
                const setting = individualMap[pid] || { type: "percentage", value: "10" };
                return {
                    product_id: pid,
                    type: setting.type,
                    value: Number(setting.value),
                };
            });
        }

        const handleSuccess = () => {
            setIsSubmitting(false);
            onClose();
        };

        const handleError = (errors) => {
            setIsSubmitting(false);
            const firstError = Object.values(errors)[0];
            setErrorMsg(firstError || "Failed to save discount campaign. Please check inputs.");
        };

        if (discountToEdit) {
            router.put(route("discounts.update", discountToEdit.id), payload, {
                preserveScroll: true,
                onSuccess: handleSuccess,
                onError: handleError,
            });
        } else {
            router.post(route("discounts.store"), payload, {
                preserveScroll: true,
                onSuccess: handleSuccess,
                onError: handleError,
            });
        }
    };

    const filteredProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const nowBuffer = new Date(Date.now() - 60000);
    const isEditingExistingActive = Boolean(discountToEdit && discountToEdit.start_at && new Date(discountToEdit.start_at) <= new Date());
    const isInvalidStartTime = !isEditingExistingActive && startAt && new Date(startAt) < nowBuffer;
    const isInvalidSchedule = startAt && endAt && new Date(endAt) <= new Date(startAt);
    const numGlobalVal = Number(globalValue) || 0;
    const isInvalidGlobalValue = mode === "global" && (numGlobalVal <= 0 || (globalType === "percentage" && numGlobalVal >= 100));
    const hasInvalidItemValue = mode === "individual" && targetProductIds.some((id) => {
        const setting = individualMap[id];
        if (!setting) return true;
        const numVal = Number(setting.value) || 0;
        const prod = allProducts.find((p) => p.id === id);
        if (numVal <= 0) return true;
        if (setting.type === "percentage" && numVal >= 100) return true;
        if (prod && setting.type === "fixed" && numVal >= Number(prod.price)) return true;
        return false;
    });

    const isSubmitDisabled = isSubmitting || !canEdit || targetProductIds.length === 0 || isInvalidStartTime || isInvalidSchedule || isInvalidGlobalValue || (mode === "global" && !globalValue) || hasInvalidItemValue;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">
                {/* Mobile Drag Indicator */}
                <div className="w-12 h-1 bg-stone-300 rounded-full mx-auto my-2 shrink-0 sm:hidden" />

                {/* Modal Header */}
                <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-50 border-b border-stone-200/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                            <Tag size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
                                {discountToEdit ? "Edit Discount Campaign" : "Create Discount Campaign"}
                            </h2>
                            <p className="text-[11px] sm:text-xs text-stone-500">Apply percentage rates or fixed promo prices to your products.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full hover:bg-stone-200/60 flex items-center justify-center text-stone-400 hover:text-stone-600 transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                    {/* Error Banner */}
                    {errorMsg && (
                        <div className="mx-5 sm:mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium shrink-0 animate-in fade-in">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Modal Main Body */}
                    <div className="grid grid-cols-12 flex-1 overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-stone-200/70">
                        {/* LEFT SIDEBAR: SCHEDULE & STRATEGY */}
                        <div className="col-span-12 lg:col-span-4 p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 bg-stone-50/40">
                            <DiscountScheduleCard
                                name={name}
                                setName={setName}
                                startAt={startAt}
                                setStartAt={setStartAt}
                                endAt={endAt}
                                setEndAt={setEndAt}
                                isEditingExisting={isEditingExistingActive}
                            />

                            <DiscountStrategySelector
                                mode={mode}
                                setMode={setMode}
                                globalType={globalType}
                                setGlobalType={setGlobalType}
                                globalValue={globalValue}
                                setGlobalValue={setGlobalValue}
                                maxPurchaseLimit={maxPurchaseLimit}
                                setMaxPurchaseLimit={setMaxPurchaseLimit}
                            />

                            {/* Followers-Exclusive Toggle Card */}
                            <div className="p-3.5 bg-white border border-stone-200/80 rounded-xl space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={15} className="text-clay-600 shrink-0" />
                                        <label htmlFor="followers-only-toggle" className="text-xs font-bold text-stone-900 cursor-pointer">
                                            Followers Exclusive
                                        </label>
                                    </div>
                                    <input
                                        id="followers-only-toggle"
                                        type="checkbox"
                                        checked={isFollowersOnly}
                                        onChange={(e) => setIsFollowersOnly(e.target.checked)}
                                        className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                    />
                                </div>
                                <p className="text-[11px] text-stone-500 leading-relaxed">
                                    Only registered buyers who follow your shop can unlock and claim this discount rate.
                                </p>
                            </div>
                        </div>

                        {/* RIGHT MAIN PANEL: PRODUCT SELECTION & TABLE */}
                        <DiscountProductTable
                            filteredProducts={filteredProducts}
                            targetProductIds={targetProductIds}
                            handleToggleProduct={handleToggleProduct}
                            handleToggleSelectAll={handleToggleSelectAll}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            mode={mode}
                            globalValue={globalValue}
                            globalType={globalType}
                            individualMap={individualMap}
                            updateIndividualSetting={updateIndividualSetting}
                            getCalculatedPrice={getCalculatedPrice}
                        />
                    </div>

                    {/* MODAL FOOTER */}
                    <div className="px-5 py-3.5 sm:px-6 sm:py-4 bg-stone-50 border-t border-stone-200/70 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
                            <span className="w-2 h-2 rounded-full bg-clay-600" />
                            <span>
                                <strong className="text-stone-900 font-bold">{targetProductIds.length}</strong> product(s) selected
                            </span>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-200/60 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 min-h-[42px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Publishing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={15} />
                                        Publish Discount ({targetProductIds.length})
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

import React, { useState, useEffect } from "react";
import Modal from "@/Components/Modal";
import DiscountScheduleCard from "./DiscountModal/DiscountScheduleCard";
import DiscountStrategySelector from "./DiscountModal/DiscountStrategySelector";
import DiscountProductTable from "./DiscountModal/DiscountProductTable";
import { Tag, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
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
            setMaxPurchaseLimit(discountToEdit.max_purchase_limit ? String(discountToEdit.max_purchase_limit) : "");
            setMode("global");

            const attachedIds = discountToEdit.products ? discountToEdit.products.map((p) => p.id) : [];
            setTargetProductIds(attachedIds);

            const initMap = {};
            allProducts.forEach((p) => {
                const isAttached = attachedIds.includes(p.id);
                initMap[p.id] = {
                    type: isAttached ? discountToEdit.type : "percentage",
                    value: isAttached ? String(discountToEdit.value) : "",
                };
            });
            setIndividualMap(initMap);
        } else {
            const now = new Date();
            const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

            setStartAt(formatForInput(now));
            setEndAt(formatForInput(future));
            setName("");
            setGlobalType("percentage");
            setGlobalValue("");
            setMaxPurchaseLimit("");
            setMode("global");

            const initialIds = selectedProducts.length > 0 ? selectedProducts.map((p) => p.id) : [];
            setTargetProductIds(initialIds);

            const initMap = {};
            allProducts.forEach((p) => {
                initMap[p.id] = { type: "percentage", value: "" };
            });
            setIndividualMap(initMap);
        }
    }, [isOpen, discountToEdit]);

    const handleToggleProduct = (productId) => {
        setTargetProductIds((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    const handleToggleSelectAll = () => {
        if (targetProductIds.length === filteredProducts.length && filteredProducts.length > 0) {
            setTargetProductIds([]);
        } else {
            setTargetProductIds(filteredProducts.map((p) => p.id));
        }
    };

    const updateIndividualSetting = (productId, key, val) => {
        setIndividualMap((prev) => ({
            ...prev,
            [productId]: {
                ...prev[productId],
                [key]: val,
            },
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!targetProductIds.length) {
            setErrorMsg("Please select at least one product to apply the discount.");
            return;
        }

        if (new Date(endAt) <= new Date(startAt)) {
            setErrorMsg("Expiration end date must be after the start date.");
            return;
        }

        let payload = {
            name: name || null,
            start_at: startAt ? new Date(startAt).toISOString() : null,
            end_at: endAt ? new Date(endAt).toISOString() : null,
            max_purchase_limit: maxPurchaseLimit ? parseInt(maxPurchaseLimit) : null,
        };

        if (mode === "global") {
            const numVal = parseFloat(globalValue);
            if (isNaN(numVal) || numVal <= 0) {
                setErrorMsg("Please enter a valid positive discount value.");
                return;
            }
            if (globalType === "percentage" && numVal > 99) {
                setErrorMsg("Percentage discount cannot exceed 99%.");
                return;
            }
            payload.type = globalType;
            payload.value = numVal;
            payload.product_ids = targetProductIds;
        } else {
            const items = [];
            for (const pid of targetProductIds) {
                const setting = individualMap[pid] || { type: "percentage", value: "" };
                const numVal = parseFloat(setting.value);
                if (isNaN(numVal) || numVal <= 0) {
                    const prodName = allProducts.find((p) => p.id === pid)?.name || "selected product";
                    setErrorMsg(`Enter a valid discount for "${prodName}".`);
                    return;
                }
                if (setting.type === "percentage" && numVal > 99) {
                    const prodName = allProducts.find((p) => p.id === pid)?.name || "selected product";
                    setErrorMsg(`Percentage discount for "${prodName}" cannot exceed 99%.`);
                    return;
                }

                // Guard Clause: Check if fixed discount or target price >= product original price
                const targetProd = allProducts.find((p) => p.id === pid);
                if (targetProd && setting.type === "fixed" && numVal >= Number(targetProd.price)) {
                    setErrorMsg(`Fixed promo price for "${targetProd.name}" (₱${numVal}) cannot equal or exceed its original price (₱${Number(targetProd.price).toLocaleString()}).`);
                    return;
                }

                items.push({
                    product_id: pid,
                    type: setting.type,
                    value: numVal,
                });
            }
            payload.items = items;
        }

        setIsSubmitting(true);

        const options = {
            onSuccess: () => {
                setIsSubmitting(false);
                onClose();
            },
            onError: (errors) => {
                setIsSubmitting(false);
                const firstErr = Object.values(errors)[0];
                setErrorMsg(typeof firstErr === "string" ? firstErr : "Failed to apply discount.");
            },
            onFinish: () => setIsSubmitting(false),
        };

        if (discountToEdit) {
            router.put(route("discounts.update", discountToEdit.id), payload, options);
        } else {
            router.post(route("discounts.store"), payload, options);
        }
    };

    const filteredProducts = allProducts.filter(
        (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getCalculatedPrice = (product) => {
        const orig = Number(product.price);
        if (mode === "global") {
            const val = parseFloat(globalValue);
            if (isNaN(val) || val <= 0) return { final: orig, saved: 0, badge: null };
            if (globalType === "percentage") {
                const final = Math.max(0, orig * (1 - val / 100));
                return { final, saved: orig - final, badge: `-${val}%` };
            } else if (globalType === "fixed_amount") {
                const final = Math.max(0, orig - val);
                return { final, saved: orig - final, badge: `-₱${val}` };
            } else {
                const final = val < orig ? val : Math.max(0, orig - val);
                return { final, saved: orig - final, badge: `PROMO` };
            }
        } else {
            const setting = individualMap[product.id] || { type: "percentage", value: "" };
            const val = parseFloat(setting.value);
            if (isNaN(val) || val <= 0) return { final: orig, saved: 0, badge: null };
            if (setting.type === "percentage") {
                const final = Math.max(0, orig * (1 - val / 100));
                return { final, saved: orig - final, badge: `-${val}%` };
            } else if (setting.type === "fixed_amount") {
                const final = Math.max(0, orig - val);
                return { final, saved: orig - final, badge: `-₱${val}` };
            } else {
                const final = val < orig ? val : Math.max(0, orig - val);
                return { final, saved: orig - final, badge: `PROMO` };
            }
        }
    };

    const isInvalidStartTime = Boolean(startAt && new Date(startAt) < new Date(Date.now() - 60 * 1000));
    const isInvalidSchedule = Boolean(startAt && endAt && new Date(endAt) <= new Date(startAt));
    const isInvalidGlobalValue = mode === "global" && globalValue !== "" && (
        (globalType === "percentage" && (parseFloat(globalValue) <= 0 || parseFloat(globalValue) >= 100)) ||
        (globalType === "fixed" && parseFloat(globalValue) <= 0)
    );
    const hasInvalidItemValue = mode === "individual" && targetProductIds.some((pid) => {
        const setting = individualMap[pid] || { type: "percentage", value: "" };
        const numVal = parseFloat(setting.value);
        const prod = allProducts.find((p) => p.id === pid);
        if (!setting.value || isNaN(numVal) || numVal <= 0) return true;
        if (setting.type === "percentage" && numVal >= 100) return true;
        if (prod && setting.type === "fixed" && numVal >= Number(prod.price)) return true;
        return false;
    });

    const isSubmitDisabled = isSubmitting || !canEdit || targetProductIds.length === 0 || isInvalidStartTime || isInvalidSchedule || isInvalidGlobalValue || (mode === "global" && !globalValue) || hasInvalidItemValue;

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="5xl">
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="px-6 py-4 bg-stone-50 border-b border-stone-200/70 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center shrink-0">
                            <Tag size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-stone-900">Create Discount Campaign</h2>
                            <p className="text-xs text-stone-500">Apply percentage rates or fixed promo prices to your products.</p>
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
                        <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium shrink-0 animate-in fade-in">
                            <AlertCircle size={14} className="shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Modal Main Body */}
                    <div className="grid grid-cols-12 flex-1 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-stone-200/70">
                        {/* LEFT SIDEBAR: SCHEDULE & STRATEGY */}
                        <div className="col-span-12 lg:col-span-4 p-6 overflow-y-auto space-y-6 bg-stone-50/40">
                            <DiscountScheduleCard
                                name={name}
                                setName={setName}
                                startAt={startAt}
                                setStartAt={setStartAt}
                                endAt={endAt}
                                setEndAt={setEndAt}
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
                    <div className="px-6 py-4 bg-stone-50 border-t border-stone-200/70 flex items-center justify-between shrink-0">
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
                                className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-200/60 rounded-xl transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitDisabled}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 min-h-[42px]"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Publishing Campaign...
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

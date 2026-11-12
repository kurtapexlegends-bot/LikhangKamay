import React from "react";
import VoucherProductPicker from "@/Components/Seller/Marketing/VoucherProductPicker";
import {
    blockInvalidNumericKeys,
    sanitizeNumericInput,
    normalizeNumericBlur,
    sanitizePromoCode,
} from "@/Components/Seller/Marketing/voucherInputGuards";
import { Sparkles, Percent, PhilippinePeso, ShoppingBag } from "lucide-react";

export default function VoucherCoreFields({
    data,
    setData,
    errors,
    products = [],
    shopCategories = [],
    onGenerateCode,
}) {
    const isPercentage = data.discount_type === "percentage";
    const rateMax = isPercentage ? 90 : 100000;
    const minSpendBelowFixed =
        !isPercentage &&
        data.min_requirement_type === "spend" &&
        data.min_spend !== "" &&
        Number(data.min_spend) > 0 &&
        Number(data.discount_value || 0) > Number(data.min_spend);

    const handleSwitchDiscountType = (nextType) => {
        setData((curr) => {
            if (nextType === "percentage") {
                const currentNum = Number(curr.discount_value || 10);
                const clamped = Number.isNaN(currentNum) || currentNum < 1
                    ? "10"
                    : String(Math.min(90, Math.floor(currentNum)));
                return {
                    ...curr,
                    discount_type: "percentage",
                    discount_value: clamped,
                };
            }
            return {
                ...curr,
                discount_type: "fixed_amount",
                max_discount: "",
            };
        });
    };

    return (
        <>
            {/* 1. Voucher Identity */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Voucher Identity
                </span>

                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <label className="block font-semibold text-stone-700">
                            Promo Code *
                        </label>
                        <button
                            type="button"
                            onClick={onGenerateCode}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 hover:text-clay-900 cursor-pointer"
                        >
                            <Sparkles size={12} />
                            <span>Auto-Generate</span>
                        </button>
                    </div>
                    <input
                        type="text"
                        value={data.code}
                        onChange={(e) => setData("code", sanitizePromoCode(e.target.value))}
                        placeholder="E.G. CAVITE10"
                        required
                        minLength={3}
                        maxLength={50}
                        className="w-full font-mono uppercase tracking-wider rounded-xl border border-stone-250 px-3.5 py-2 font-bold text-stone-900 focus:border-clay-500 focus:ring-0"
                    />
                    {errors.code && <p className="text-rose-600 text-[11px] font-medium">{errors.code}</p>}
                </div>

                <div className="space-y-1">
                    <label className="block font-semibold text-stone-700">
                        Voucher Label *
                    </label>
                    <input
                        type="text"
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        placeholder="e.g. Pottery Studio Welcome Promo"
                        required
                        maxLength={255}
                        className="w-full rounded-xl border border-stone-250 px-3.5 py-2 font-medium text-stone-900 focus:border-clay-500 focus:ring-0"
                    />
                    {errors.name && <p className="text-rose-600 text-[11px] font-medium">{errors.name}</p>}
                </div>
            </div>

            {/* 2. Discount Reward */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Discount Reward
                </span>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => handleSwitchDiscountType("percentage")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition min-h-[40px] ${
                            isPercentage
                                ? "border-clay-600 bg-clay-50 text-clay-800 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <Percent size={14} />
                        <span>Percentage (%)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchDiscountType("fixed_amount")}
                        className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition min-h-[40px] ${
                            !isPercentage
                                ? "border-clay-600 bg-clay-50 text-clay-800 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <PhilippinePeso size={14} />
                        <span>Fixed Amount (PHP)</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            {isPercentage ? "Rate (1% - 90%) *" : "Discount Amount (PHP 1 - 100,000) *"}
                        </label>
                        <input
                            type="number"
                            inputMode={isPercentage ? "numeric" : "decimal"}
                            step={isPercentage ? "1" : "0.01"}
                            min={1}
                            max={rateMax}
                            value={data.discount_value}
                            onKeyDown={(e) => blockInvalidNumericKeys(e, { integerOnly: isPercentage })}
                            onChange={(e) =>
                                setData(
                                    "discount_value",
                                    sanitizeNumericInput(e.target.value, {
                                        max: rateMax,
                                        integerOnly: isPercentage,
                                    })
                                )
                            }
                            onBlur={() =>
                                setData(
                                    "discount_value",
                                    normalizeNumericBlur(data.discount_value, {
                                        min: 1,
                                        max: rateMax,
                                        integerOnly: isPercentage,
                                        fallbackEmpty: "1",
                                    })
                                )
                            }
                            required
                            className="w-full rounded-xl border border-stone-250 px-3.5 py-2 font-bold text-stone-900 focus:border-clay-500 focus:ring-0"
                        />
                        {errors.discount_value && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.discount_value}</p>}
                    </div>

                    {isPercentage && (
                        <div>
                            <label className="block font-semibold text-stone-700 mb-1">
                                Max Discount Cap (PHP, Optional)
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="1"
                                min={1}
                                max={1000000}
                                value={data.max_discount}
                                onKeyDown={(e) => blockInvalidNumericKeys(e)}
                                onChange={(e) =>
                                    setData(
                                        "max_discount",
                                        sanitizeNumericInput(e.target.value, { max: 1000000 })
                                    )
                                }
                                onBlur={() =>
                                    setData(
                                        "max_discount",
                                        normalizeNumericBlur(data.max_discount, {
                                            min: 1,
                                            max: 1000000,
                                            fallbackEmpty: "",
                                        })
                                    )
                                }
                                placeholder="Leave empty for no cap"
                                className="w-full rounded-xl border border-stone-250 px-3.5 py-2 font-medium text-stone-900 focus:border-clay-500 focus:ring-0"
                            />
                            {errors.max_discount && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.max_discount}</p>}
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Product Applicability & Scope */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Product Applicability
                </span>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/60">
                    <button
                        type="button"
                        onClick={() => setData("scope_type", "all")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                            data.scope_type === "all"
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        Entire Shop
                    </button>
                    <button
                        type="button"
                        onClick={() => setData("scope_type", "specific_products")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                            data.scope_type === "specific_products"
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        Specific Items
                    </button>
                    <button
                        type="button"
                        onClick={() => setData("scope_type", "category")}
                        className={`py-2 text-xs font-bold rounded-lg transition ${
                            data.scope_type === "category"
                                ? "bg-white text-stone-900 shadow-2xs"
                                : "text-stone-500 hover:text-stone-800"
                        }`}
                    >
                        By Category
                    </button>
                </div>

                {data.scope_type === "specific_products" && (
                    <div className="pt-1">
                        <VoucherProductPicker
                            products={products}
                            selectedProductIds={data.applicable_products}
                            onChangeSelectedIds={(ids) => setData("applicable_products", ids)}
                        />
                        {errors.applicable_products && (
                            <p className="text-rose-600 text-[11px] font-medium pt-1">
                                {errors.applicable_products}
                            </p>
                        )}
                    </div>
                )}

                {data.scope_type === "category" && (
                    <div className="space-y-1.5 pt-1">
                        <label className="block font-semibold text-stone-700">
                            Workshop Category *
                        </label>
                        <select
                            value={data.applicable_category}
                            onChange={(e) => setData("applicable_category", e.target.value)}
                            className="w-full rounded-xl border border-stone-250 pl-3.5 pr-9 py-2 font-medium text-stone-900 bg-white focus:border-clay-500 focus:ring-0"
                        >
                            <option value="">Choose a category</option>
                            {shopCategories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                        {errors.applicable_category && (
                            <p className="text-rose-600 text-[11px] font-medium">
                                {errors.applicable_category}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 4. Minimum Condition Requirement */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Minimum Condition
                </span>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setData("min_requirement_type", "spend")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition min-h-[40px] ${
                            data.min_requirement_type === "spend"
                                ? "border-clay-600 bg-clay-50 text-clay-800 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <PhilippinePeso size={13} />
                        <span>Min. Spend (PHP)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setData("min_requirement_type", "quantity")}
                        className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-bold transition min-h-[40px] ${
                            data.min_requirement_type === "quantity"
                                ? "border-clay-600 bg-clay-50 text-clay-800 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <ShoppingBag size={13} />
                        <span>Min. Quantity (Items)</span>
                    </button>
                </div>

                {data.min_requirement_type === "spend" ? (
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            Minimum Basket Spend (PHP)
                        </label>
                        <input
                            type="number"
                            inputMode="decimal"
                            step="1"
                            min={0}
                            max={1000000}
                            value={data.min_spend}
                            onKeyDown={(e) => blockInvalidNumericKeys(e)}
                            onChange={(e) =>
                                setData(
                                    "min_spend",
                                    sanitizeNumericInput(e.target.value, { max: 1000000 })
                                )
                            }
                            onBlur={() =>
                                setData(
                                    "min_spend",
                                    normalizeNumericBlur(data.min_spend, {
                                        min: 0,
                                        max: 1000000,
                                        fallbackEmpty: "",
                                    })
                                )
                            }
                            placeholder="Leave empty for no minimum spend"
                            className={`w-full rounded-xl border px-3.5 py-2 font-medium text-stone-900 focus:ring-0 ${
                                minSpendBelowFixed
                                    ? "border-amber-400 focus:border-amber-500"
                                    : "border-stone-250 focus:border-clay-500"
                            }`}
                        />
                        {minSpendBelowFixed && (
                            <p className="text-amber-700 text-[11px] font-medium mt-1">
                                Minimum spend must be at least PHP {Number(data.discount_value).toLocaleString()} (or leave empty for no minimum).
                            </p>
                        )}
                        {errors.min_spend && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.min_spend}</p>}
                    </div>
                ) : (
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            Minimum Qualifying Items (1 - 1,000) *
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min={1}
                            max={1000}
                            value={data.min_quantity}
                            onKeyDown={(e) => blockInvalidNumericKeys(e, { integerOnly: true })}
                            onChange={(e) =>
                                setData(
                                    "min_quantity",
                                    sanitizeNumericInput(e.target.value, {
                                        max: 1000,
                                        integerOnly: true,
                                    })
                                )
                            }
                            onBlur={() =>
                                setData(
                                    "min_quantity",
                                    normalizeNumericBlur(data.min_quantity, {
                                        min: 1,
                                        max: 1000,
                                        integerOnly: true,
                                        fallbackEmpty: "1",
                                    })
                                )
                            }
                            placeholder="e.g. 2"
                            required
                            className="w-full rounded-xl border border-stone-250 px-3.5 py-2 font-medium text-stone-900 focus:border-clay-500 focus:ring-0"
                        />
                        {errors.min_quantity && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.min_quantity}</p>}
                    </div>
                )}
            </div>
        </>
    );
}

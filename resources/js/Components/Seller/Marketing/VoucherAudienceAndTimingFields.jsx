import React from "react";
import {
    blockInvalidNumericKeys,
    sanitizeNumericInput,
    normalizeNumericBlur,
} from "@/Components/Seller/Marketing/voucherInputGuards";
import { Users, Heart, UserPlus, UserCheck, Globe, Lock } from "lucide-react";

export default function VoucherAudienceAndTimingFields({ data, setData, errors, showStatusToggle = true }) {
    const totalPoolNum = data.usage_limit_total !== "" ? Number(data.usage_limit_total) : null;
    const perUserMax = totalPoolNum && totalPoolNum >= 1 ? Math.min(100, totalPoolNum) : 100;
    const invalidDateRange =
        Boolean(data.starts_at) &&
        Boolean(data.expires_at) &&
        new Date(data.expires_at) <= new Date(data.starts_at);

    const handlePoolChange = (raw) => {
        const cleaned = sanitizeNumericInput(raw, { max: 1000000, integerOnly: true });
        setData((curr) => {
            const nextPool = cleaned !== "" ? Number(cleaned) : null;
            const currentPerUser = Number(curr.usage_limit_per_user || 1);
            const nextPerUser =
                nextPool && nextPool >= 1 && currentPerUser > nextPool
                    ? String(Math.min(100, nextPool))
                    : curr.usage_limit_per_user;
            return {
                ...curr,
                usage_limit_total: cleaned,
                usage_limit_per_user: nextPerUser,
            };
        });
    };

    return (
        <>
            {/* 5. Target Customer Audience */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Target Customer Audience
                </span>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setData("target_audience", "all")}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition min-h-[44px] ${
                            data.target_audience === "all"
                                ? "border-clay-600 bg-clay-50/70 text-clay-900 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <Users size={16} className={data.target_audience === "all" ? "text-clay-700 shrink-0" : "text-stone-400 shrink-0"} />
                        <span className="font-bold text-xs">All Shoppers</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setData("target_audience", "followers")}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition min-h-[44px] ${
                            data.target_audience === "followers"
                                ? "border-clay-600 bg-clay-50/70 text-clay-900 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <Heart size={16} className={data.target_audience === "followers" ? "text-rose-600 shrink-0" : "text-stone-400 shrink-0"} />
                        <span className="font-bold text-xs">Followers Only</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setData("target_audience", "new_customers")}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition min-h-[44px] ${
                            data.target_audience === "new_customers"
                                ? "border-clay-600 bg-clay-50/70 text-clay-900 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <UserPlus size={16} className={data.target_audience === "new_customers" ? "text-amber-600 shrink-0" : "text-stone-400 shrink-0"} />
                        <span className="font-bold text-xs">New Buyers Only</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setData("target_audience", "repeat_customers")}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition min-h-[44px] ${
                            data.target_audience === "repeat_customers"
                                ? "border-clay-600 bg-clay-50/70 text-clay-900 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <UserCheck size={16} className={data.target_audience === "repeat_customers" ? "text-clay-700 shrink-0" : "text-stone-400 shrink-0"} />
                        <span className="font-bold text-xs">Loyal Buyers Only</span>
                    </button>
                </div>
                {errors.target_audience && <p className="text-rose-600 text-[11px] font-medium">{errors.target_audience}</p>}
            </div>

            {/* 6. Redemption Limits & Timing */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Redemption & Timing
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            Valid From
                        </label>
                        <input
                            type="datetime-local"
                            value={data.starts_at}
                            onChange={(e) => setData("starts_at", e.target.value)}
                            className="w-full rounded-xl border border-stone-250 px-3 py-2 font-medium text-stone-900 text-xs focus:border-clay-500 focus:ring-0"
                        />
                        {errors.starts_at && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.starts_at}</p>}
                    </div>
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            Expires On
                        </label>
                        <input
                            type="datetime-local"
                            min={data.starts_at || undefined}
                            value={data.expires_at}
                            onChange={(e) => setData("expires_at", e.target.value)}
                            className={`w-full rounded-xl border px-3 py-2 font-medium text-stone-900 text-xs focus:ring-0 ${
                                invalidDateRange
                                    ? "border-rose-400 focus:border-rose-500"
                                    : "border-stone-250 focus:border-clay-500"
                            }`}
                        />
                        {invalidDateRange && (
                            <p className="text-rose-600 text-[11px] font-medium mt-1">
                                Expiration must be later than start date.
                            </p>
                        )}
                        {errors.expires_at && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.expires_at}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            Total Redemption Pool
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min={1}
                            max={1000000}
                            value={data.usage_limit_total}
                            onKeyDown={(e) => blockInvalidNumericKeys(e, { integerOnly: true })}
                            onChange={(e) => handlePoolChange(e.target.value)}
                            onBlur={() =>
                                setData(
                                    "usage_limit_total",
                                    normalizeNumericBlur(data.usage_limit_total, {
                                        min: 1,
                                        max: 1000000,
                                        integerOnly: true,
                                        fallbackEmpty: "",
                                    })
                                )
                            }
                            placeholder="Unlimited (optional)"
                            className="w-full rounded-xl border border-stone-250 px-3.5 py-2 font-medium text-stone-900 focus:border-clay-500 focus:ring-0"
                        />
                        {errors.usage_limit_total && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.usage_limit_total}</p>}
                    </div>
                    <div>
                        <label className="block font-semibold text-stone-700 mb-1">
                            Uses Per Buyer (1 - {perUserMax}) *
                        </label>
                        <input
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min={1}
                            max={perUserMax}
                            value={data.usage_limit_per_user}
                            onKeyDown={(e) => blockInvalidNumericKeys(e, { integerOnly: true })}
                            onChange={(e) =>
                                setData(
                                    "usage_limit_per_user",
                                    sanitizeNumericInput(e.target.value, {
                                        max: perUserMax,
                                        integerOnly: true,
                                    })
                                )
                            }
                            onBlur={() =>
                                setData(
                                    "usage_limit_per_user",
                                    normalizeNumericBlur(data.usage_limit_per_user, {
                                        min: 1,
                                        max: perUserMax,
                                        integerOnly: true,
                                        fallbackEmpty: "1",
                                    })
                                )
                            }
                            required
                            className="w-full rounded-xl border border-stone-250 px-3.5 py-2 font-medium text-stone-900 focus:border-clay-500 focus:ring-0"
                        />
                        {errors.usage_limit_per_user && <p className="text-rose-600 text-[11px] font-medium mt-1">{errors.usage_limit_per_user}</p>}
                    </div>
                </div>
            </div>

            {/* 7. Discovery Mode */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                    Buyer Discovery Mode
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        onClick={() => setData("is_public", true)}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                            data.is_public
                                ? "border-clay-600 bg-clay-50/50 text-stone-900 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <Globe size={16} className={data.is_public ? "text-clay-700 shrink-0 mt-0.5" : "text-stone-400 shrink-0 mt-0.5"} />
                        <div>
                            <span className="font-bold block text-xs text-stone-900">Public Claimable</span>
                            <span className="text-[11px] text-stone-500 leading-snug">
                                Listed in Checkout Voucher Drawer
                            </span>
                        </div>
                    </button>

                    <button
                        type="button"
                        onClick={() => setData("is_public", false)}
                        className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition ${
                            !data.is_public
                                ? "border-clay-600 bg-clay-50/50 text-stone-900 shadow-2xs"
                                : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                        }`}
                    >
                        <Lock size={16} className={!data.is_public ? "text-clay-700 shrink-0 mt-0.5" : "text-stone-400 shrink-0 mt-0.5"} />
                        <div>
                            <span className="font-bold block text-xs text-stone-900">Private Code-Only</span>
                            <span className="text-[11px] text-stone-500 leading-snug">
                                Buyer types exact code manually
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* 8. Voucher Status */}
            {showStatusToggle && (
                <div className="rounded-xl border border-stone-200/80 bg-white p-4 space-y-3 shadow-2xs">
                    <span className="block font-bold text-stone-900 text-xs uppercase tracking-wider">
                        Voucher Status
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                        <button
                            type="button"
                            onClick={() => setData("is_active", true)}
                            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition min-h-[44px] ${
                                data.is_active
                                    ? "border-emerald-600 bg-emerald-50/60 text-emerald-900 shadow-2xs"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${data.is_active ? "bg-emerald-600" : "bg-stone-300"}`} />
                            <span>Active</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setData("is_active", false)}
                            className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition min-h-[44px] ${
                                !data.is_active
                                    ? "border-amber-600 bg-amber-50/70 text-amber-900 shadow-2xs"
                                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${!data.is_active ? "bg-amber-600" : "bg-stone-300"}`} />
                            <span>Paused</span>
                        </button>
                    </div>
                    {errors.is_active && <p className="text-rose-600 text-[11px] font-medium">{errors.is_active}</p>}
                </div>
            )}
        </>
    );
}

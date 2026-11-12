import React, { useEffect, useMemo } from "react";
import { useForm } from "@inertiajs/react";
import Modal from "@/Components/Modal";
import VoucherCoreFields from "@/Components/Seller/Marketing/VoucherCoreFields";
import VoucherAudienceAndTimingFields from "@/Components/Seller/Marketing/VoucherAudienceAndTimingFields";
import VoucherTicketPreview from "@/Components/Seller/Marketing/VoucherTicketPreview";
import { X, Ticket, CheckCircle2 } from "lucide-react";

const toLocalDatetimeInput = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const toUtcIsoString = (localDatetimeStr) => {
    if (!localDatetimeStr) return null;
    const d = new Date(localDatetimeStr);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

export default function VoucherModal({
    isOpen,
    onClose,
    voucherToEdit = null,
    products = [],
    storeRouteName = "vouchers.store",
    updateRouteName = "vouchers.update",
}) {
    const isEditing = Boolean(voucherToEdit);

    const { data, setData, post, put, transform, processing, errors, reset, clearErrors, setError } = useForm({
        code: "",
        name: "",
        description: "",
        discount_type: "percentage",
        discount_value: "10",
        scope_type: "all",
        applicable_products: [],
        applicable_category: "",
        min_requirement_type: "spend",
        min_spend: "",
        min_quantity: "1",
        max_discount: "",
        usage_limit_total: "",
        usage_limit_per_user: "1",
        target_audience: "all",
        is_public: true,
        is_active: true,
        starts_at: "",
        expires_at: "",
    });

    const shopCategories = useMemo(() => {
        const set = new Set();
        products.forEach((p) => {
            if (p.category) set.add(p.category);
        });
        return Array.from(set);
    }, [products]);

    useEffect(() => {
        if (!isOpen) return;
        clearErrors();

        if (voucherToEdit) {
            setData({
                code: voucherToEdit.code || "",
                name: voucherToEdit.name || "",
                description: voucherToEdit.description || "",
                discount_type: voucherToEdit.discount_type || "percentage",
                discount_value: String(voucherToEdit.discount_value ?? "10"),
                scope_type: voucherToEdit.scope_type || "all",
                applicable_products: Array.isArray(voucherToEdit.applicable_products)
                    ? voucherToEdit.applicable_products
                    : [],
                applicable_category: voucherToEdit.applicable_category || "",
                min_requirement_type: voucherToEdit.min_requirement_type || "spend",
                min_spend: Number(voucherToEdit.min_spend || 0) > 0 ? String(voucherToEdit.min_spend) : "",
                min_quantity: String(voucherToEdit.min_quantity || "1"),
                max_discount: Number(voucherToEdit.max_discount || 0) > 0 ? String(voucherToEdit.max_discount) : "",
                usage_limit_total: Number(voucherToEdit.usage_limit_total || 0) > 0 ? String(voucherToEdit.usage_limit_total) : "",
                usage_limit_per_user: String(voucherToEdit.usage_limit_per_user ?? "1"),
                target_audience: voucherToEdit.target_audience || "all",
                is_public: Boolean(voucherToEdit.is_public ?? true),
                is_active: Boolean(voucherToEdit.is_active ?? true),
                starts_at: toLocalDatetimeInput(voucherToEdit.starts_at),
                expires_at: toLocalDatetimeInput(voucherToEdit.expires_at),
            });
        } else {
            const now = new Date();
            const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            setData({
                code: "",
                name: "",
                description: "",
                discount_type: "percentage",
                discount_value: "10",
                scope_type: "all",
                applicable_products: [],
                applicable_category: shopCategories[0] || "",
                min_requirement_type: "spend",
                min_spend: "",
                min_quantity: "1",
                max_discount: "",
                usage_limit_total: "",
                usage_limit_per_user: "1",
                target_audience: "all",
                is_public: true,
                is_active: true,
                starts_at: toLocalDatetimeInput(now.toISOString()),
                expires_at: toLocalDatetimeInput(nextMonth.toISOString()),
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, voucherToEdit, shopCategories]);

    const generateRandomCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let suffix = "";
        for (let i = 0; i < 5; i += 1) {
            suffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setData("code", `CRAFT-${suffix}`);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        clearErrors();

        let hasLocalError = false;
        const discountVal = Number(data.discount_value || 0);
        const minSpendVal = data.min_spend !== "" ? Number(data.min_spend) : 0;
        const totalPoolVal = data.usage_limit_total !== "" ? Number(data.usage_limit_total) : null;
        const perUserVal = Number(data.usage_limit_per_user || 1);

        if (data.scope_type === "specific_products" && (!Array.isArray(data.applicable_products) || data.applicable_products.length === 0)) {
            setError("applicable_products", "Select at least one product for this voucher.");
            hasLocalError = true;
        }
        if (data.scope_type === "category" && !String(data.applicable_category || "").trim()) {
            setError("applicable_category", "Select a workshop category for this voucher.");
            hasLocalError = true;
        }
        if (data.discount_type === "fixed_amount" && data.min_requirement_type === "spend" && minSpendVal > 0 && discountVal > minSpendVal) {
            setError("min_spend", `Minimum spend must be at least PHP ${discountVal.toLocaleString()} (or leave empty for no minimum).`);
            hasLocalError = true;
        }
        if (totalPoolVal !== null && perUserVal > totalPoolVal) {
            setError("usage_limit_per_user", `Uses per buyer (${perUserVal}) cannot exceed total pool (${totalPoolVal}).`);
            hasLocalError = true;
        }
        if (data.starts_at && data.expires_at && new Date(data.expires_at) <= new Date(data.starts_at)) {
            setError("expires_at", "Expiration date must be strictly later than start date.");
            hasLocalError = true;
        }

        if (hasLocalError) {
            return;
        }

        transform((formData) => ({
            ...formData,
            starts_at: toUtcIsoString(formData.starts_at),
            expires_at: toUtcIsoString(formData.expires_at),
        }));

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        };

        if (isEditing) {
            put(route(updateRouteName, voucherToEdit.id), options);
        } else {
            post(route(storeRouteName), options);
        }
    };

    const discountSummary = useMemo(() => {
        const val = Number(data.discount_value || 0);
        if (data.discount_type === "percentage") {
            return `${val}% OFF`;
        }
        return `PHP ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} OFF`;
    }, [data.discount_type, data.discount_value]);

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="4xl">
            <div className="flex flex-col max-h-[92vh] bg-stone-50 overflow-hidden rounded-3xl">
                {/* Fixed Header */}
                <div className="px-5 sm:px-6 py-4 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-clay-50 border border-clay-200/80 flex items-center justify-center text-clay-700 shadow-2xs">
                            <Ticket size={20} />
                        </div>
                        <h2 className="text-base font-bold text-stone-900 leading-tight">
                            {isEditing ? "Edit Shop Voucher" : "Create Shop Voucher"}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                        aria-label="Close voucher modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <form
                    id="voucher-form"
                    onSubmit={handleSubmit}
                    className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 text-xs text-stone-700 space-y-6"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                        <div className="lg:col-span-7 space-y-4">
                            <VoucherCoreFields
                                data={data}
                                setData={setData}
                                errors={errors}
                                products={products}
                                shopCategories={shopCategories}
                                onGenerateCode={generateRandomCode}
                            />
                            <VoucherAudienceAndTimingFields
                                data={data}
                                setData={setData}
                                errors={errors}
                            />
                        </div>

                        <VoucherTicketPreview data={data} discountSummary={discountSummary} />
                    </div>
                </form>

                {/* Fixed Footer */}
                <div className="px-5 sm:px-6 py-3.5 bg-stone-50/90 border-t border-stone-200/80 flex items-center justify-between shrink-0 pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]">
                    <div className="flex items-center gap-2 text-xs text-stone-600">
                        <span className="h-2 w-2 rounded-full bg-clay-600" />
                        <span className="font-semibold text-stone-900">
                            {data.code ? data.code : "New Voucher"}
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="font-bold text-clay-700">
                            {discountSummary}
                        </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            className="px-4 py-2 min-h-[44px] sm:min-h-[40px] text-xs font-bold text-stone-600 hover:bg-stone-200/60 rounded-xl transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="voucher-form"
                            disabled={processing}
                            className="inline-flex items-center gap-2 px-5 py-2 min-h-[44px] sm:min-h-[40px] text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <CheckCircle2 size={15} />
                            <span>{processing ? "Saving..." : isEditing ? "Save Changes" : "Create Voucher"}</span>
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

import React, { useState, useMemo } from "react";
import { router } from "@inertiajs/react";
import KPICard from "@/Components/KPICard";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import ConfirmationModal from "@/Components/ConfirmationModal";
import FilterToolbarHeader from "@/Components/Seller/Shared/FilterToolbarHeader";
import VoucherModal from "@/Components/Seller/Marketing/VoucherModal";
import VoucherScopeTags, { formatVoucherRequirement } from "@/Components/Seller/Marketing/VoucherScopeTags";
import {
    Ticket,
    Plus,
    PowerOff,
    CheckCircle2,
    Clock,
    TrendingUp,
    Edit3,
    Globe,
    Lock,
    Award,
    Copy,
    Check,
} from "lucide-react";

const formatDate = (dateString) => {
    if (!dateString) return "No Expiry";
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

export default function VoucherManagementPanel({
    vouchers = [],
    stats = {},
    quota = null,
    isPlatformMode = false,
    canEdit = true,
    initialSearch = "",
    products = [],
    storeRouteName = "vouchers.store",
    updateRouteName = "vouchers.update",
    destroyRouteName = "vouchers.destroy",
}) {
    const [statusTab, setStatusTab] = useState("ongoing");
    const [searchQuery, setSearchQuery] = useState(initialSearch || "");
    const [typeFilter, setTypeFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [deactivatingId, setDeactivatingId] = useState(null);
    const [copiedCode, setCopiedCode] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        voucherId: null,
        voucherCode: "",
    });

    const filteredVouchers = useMemo(() => {
        const list = Array.isArray(vouchers) ? vouchers : [];
        return list.filter((voucher) => {
            const label = voucher.status_label || "ongoing";
            if (statusTab === "ongoing" && label !== "ongoing") return false;
            if (statusTab === "upcoming" && label !== "upcoming") return false;
            if (statusTab === "expired" && !["expired", "depleted", "inactive"].includes(label)) return false;

            if (typeFilter !== "all" && voucher.discount_type !== typeFilter) {
                return false;
            }

            if (searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const codeMatch = (voucher.code || "").toLowerCase().includes(q);
                const nameMatch = (voucher.name || "").toLowerCase().includes(q);
                return codeMatch || nameMatch;
            }

            return true;
        });
    }, [vouchers, statusTab, typeFilter, searchQuery]);

    const handleCopyCode = (code) => {
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            navigator.clipboard.writeText(code);
            setCopiedCode(code);
            setTimeout(() => setCopiedCode(null), 1800);
        }
    };

    const handleOpenCreate = () => {
        if (!canEdit) return;
        setEditingVoucher(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (voucher) => {
        if (!canEdit) return;
        setEditingVoucher(voucher);
        setIsModalOpen(true);
    };

    const handleConfirmDeactivate = () => {
        if (!confirmModal.voucherId) return;
        setDeactivatingId(confirmModal.voucherId);

        router.delete(route(destroyRouteName, confirmModal.voucherId), {
            preserveScroll: true,
            onFinish: () => {
                setDeactivatingId(null);
                setConfirmModal({ isOpen: false, voucherId: null, voucherCode: "" });
            },
        });
    };

    const canCreateNew = isPlatformMode || (quota ? Boolean(quota.can_create) : true);

    return (
        <div className="space-y-6">
            {/* KPI Strip */}
            <div className="flex overflow-x-auto pb-2 gap-3 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Active Vouchers"
                        value={stats?.ongoing_count || 0}
                        subtitle={
                            !isPlatformMode && quota
                                ? quota.is_elite
                                    ? "Unlimited (Elite)"
                                    : `${quota.active_count} of ${quota.limit} active slots`
                                : undefined
                        }
                        icon={CheckCircle2}
                        color="text-emerald-600"
                        bg="bg-emerald-50"
                    />
                </div>
                <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Scheduled"
                        value={stats?.upcoming_count || 0}
                        icon={Clock}
                        color="text-amber-600"
                        bg="bg-amber-50"
                    />
                </div>
                <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Ended / Depleted"
                        value={stats?.expired_count || 0}
                        icon={PowerOff}
                        color="text-stone-600"
                        bg="bg-stone-100"
                    />
                </div>
                <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Total Redemptions"
                        value={stats?.total_redeemed || 0}
                        icon={TrendingUp}
                        color="text-clay-600"
                        bg="bg-clay-50"
                    />
                </div>
            </div>

            {/* Main List Card */}
            <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm relative">
                <FilterToolbarHeader
                    tabs={[
                        { key: "ongoing", label: "Active", count: stats?.ongoing_count || 0 },
                        { key: "upcoming", label: "Scheduled", count: stats?.upcoming_count || 0 },
                        { key: "expired", label: "Ended / Depleted", count: stats?.expired_count || 0 },
                    ]}
                    activeTab={statusTab}
                    onTabChange={setStatusTab}
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    searchPlaceholder="Search promo code or label..."
                    activeFiltersCount={typeFilter !== "all" ? 1 : 0}
                    filterPopoverTitle="Filter Vouchers"
                    filterPopoverFields={
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                                Discount Type
                            </label>
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                            >
                                <option value="all">All Types</option>
                                <option value="percentage">Percentage (-X%)</option>
                                <option value="fixed_amount">Fixed Amount (PHP)</option>
                            </select>
                        </div>
                    }
                    onApplyFilters={() => {}}
                    onResetFilters={() => {
                        setSearchQuery("");
                        setTypeFilter("all");
                    }}
                    beforeSearch={
                        !isPlatformMode && quota ? (
                            <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 bg-stone-100/80 px-2.5 py-1.5 rounded-xl border border-stone-200/60 shrink-0">
                                {quota.is_elite ? (
                                    <>
                                        <Award size={13} className="text-clay-600 shrink-0" />
                                        <span>Elite · Unlimited</span>
                                    </>
                                ) : (
                                    <span>{quota.active_count} / {quota.limit} Active</span>
                                )}
                            </span>
                        ) : null
                    }
                    extraActions={
                        canEdit ? (
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                disabled={!canCreateNew}
                                title={!canCreateNew ? "Active voucher limit reached" : "Create Voucher"}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-11 sm:h-[38px] min-h-[44px] sm:min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-700 disabled:opacity-50 active:scale-95 shrink-0"
                            >
                                <Plus size={14} />
                                <span>New Voucher</span>
                            </button>
                        ) : null
                    }
                    containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                />

                {/* Mobile & Tablet Cards (< lg) */}
                <div className="block lg:hidden p-3.5 sm:p-4 space-y-3.5 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 bg-stone-50/40 rounded-b-3xl">
                    {filteredVouchers.length > 0 ? (
                        filteredVouchers.map((voucher) => {
                            const isOngoing = voucher.status_label === "ongoing";
                            return (
                                <div
                                    key={voucher.id}
                                    className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-3 hover:border-clay-200 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-extrabold text-sm text-stone-900 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200">
                                                    {voucher.code}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyCode(voucher.code)}
                                                    className="p-1 text-stone-400 hover:text-stone-700"
                                                    aria-label="Copy promo code"
                                                >
                                                    {copiedCode === voucher.code ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                </button>
                                            </div>
                                            <h4 className="font-bold text-stone-800 text-xs mt-1">{voucher.name}</h4>
                                            <VoucherScopeTags voucher={voucher} />
                                        </div>
                                        <span className="bg-clay-50 text-clay-800 border border-clay-200/80 px-2.5 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap">
                                            {voucher.discount_type === "percentage"
                                                ? `${Number(voucher.discount_value)}% OFF`
                                                : `PHP ${Number(voucher.discount_value).toLocaleString()} OFF`}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-[11px]">
                                        <div>
                                            <span className="text-stone-400 uppercase text-[9px] font-extrabold block">Requirement</span>
                                            <span className="font-semibold text-stone-800">
                                                {formatVoucherRequirement(voucher)}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-stone-400 uppercase text-[9px] font-extrabold block">Redeemed</span>
                                            <span className="font-semibold text-stone-800">
                                                {voucher.used_count || 0} {voucher.usage_limit_total ? `/ ${voucher.usage_limit_total}` : "uses"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600">
                                            {voucher.is_public ? <Globe size={12} className="text-emerald-600" /> : <Lock size={12} className="text-amber-600" />}
                                            {voucher.is_public ? "Public Claimable" : "Code-Only"}
                                        </span>
                                        {canEdit ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(voucher)}
                                                    className="w-9 h-9 rounded-xl bg-stone-50 text-stone-700 border border-stone-200 flex items-center justify-center"
                                                    aria-label="Edit Voucher"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                {isOngoing && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setConfirmModal({
                                                                isOpen: true,
                                                                voucherId: voucher.id,
                                                                voucherCode: voucher.code,
                                                            })
                                                        }
                                                        className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center"
                                                        aria-label="Deactivate Voucher"
                                                    >
                                                        <PowerOff size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-[11px] font-medium text-stone-400">Read-only</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="sm:col-span-2">
                            <WorkspaceEmptyState
                                compact
                                align="top"
                                icon={Ticket}
                                title="No promotional vouchers found"
                                description="Issue claimable vouchers or private promo codes for shoppers at checkout."
                            />
                        </div>
                    )}
                </div>

                {/* Desktop Table (>= lg) */}
                <div className="hidden lg:block overflow-x-auto rounded-b-3xl">
                    <table className="w-full min-w-[920px] text-left text-xs border-collapse">
                        <thead className="bg-stone-50 border-b border-stone-200/70 text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                            <tr>
                                <th className="py-3 px-5">Code & Label</th>
                                <th className="py-3 px-4 text-center">Discount</th>
                                <th className="py-3 px-4 text-center">Condition / Cap</th>
                                <th className="py-3 px-4 text-center">Discovery</th>
                                <th className="py-3 px-4 text-center">Redemptions</th>
                                <th className="py-3 px-4">Validity</th>
                                <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                            {filteredVouchers.length > 0 ? (
                                filteredVouchers.map((voucher) => {
                                    const isOngoing = voucher.status_label === "ongoing";
                                    return (
                                        <tr key={voucher.id} className="hover:bg-stone-50/50 transition">
                                            <td className="py-3.5 px-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-extrabold text-xs text-stone-900 bg-stone-100 px-2.5 py-1 rounded-lg border border-stone-200">
                                                        {voucher.code}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyCode(voucher.code)}
                                                        className="text-stone-400 hover:text-stone-700"
                                                        title="Copy code"
                                                    >
                                                        {copiedCode === voucher.code ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                                    </button>
                                                </div>
                                                <span className="block font-bold text-stone-800 mt-1">{voucher.name}</span>
                                                <VoucherScopeTags voucher={voucher} />
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="bg-clay-50 text-clay-800 border border-clay-200/80 px-2.5 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap inline-block">
                                                    {voucher.discount_type === "percentage"
                                                        ? `${Number(voucher.discount_value)}% OFF`
                                                        : `PHP ${Number(voucher.discount_value).toLocaleString()} OFF`}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center text-[11px] text-stone-700">
                                                <span className="font-semibold block">
                                                    {formatVoucherRequirement(voucher)}
                                                </span>
                                                {voucher.max_discount && voucher.discount_type === "percentage" && (
                                                    <span className="text-[10px] text-stone-400">
                                                        Cap: PHP {Number(voucher.max_discount).toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                                                    {voucher.is_public ? <Globe size={11} className="text-emerald-600" /> : <Lock size={11} className="text-amber-600" />}
                                                    {voucher.is_public ? "Public" : "Code-Only"}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-stone-800">
                                                {voucher.used_count || 0} {voucher.usage_limit_total ? `/ ${voucher.usage_limit_total}` : "unlimited"}
                                            </td>
                                            <td className="py-3.5 px-4 text-[11px] text-stone-600 whitespace-nowrap">
                                                <div>From: <strong className="text-stone-800">{formatDate(voucher.starts_at)}</strong></div>
                                                <div>Until: <strong className="text-stone-800">{formatDate(voucher.expires_at)}</strong></div>
                                            </td>
                                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                                {canEdit ? (
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEdit(voucher)}
                                                            className="p-2 text-clay-700 hover:bg-clay-50 border border-stone-200 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center bg-white"
                                                            title="Edit Voucher"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                        {isOngoing && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setConfirmModal({
                                                                        isOpen: true,
                                                                        voucherId: voucher.id,
                                                                        voucherCode: voucher.code,
                                                                    })
                                                                }
                                                                disabled={deactivatingId === voucher.id}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center bg-white"
                                                                title="Deactivate Voucher"
                                                            >
                                                                <PowerOff size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-[11px] font-medium text-stone-400">Read-only</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center">
                                        <WorkspaceEmptyState
                                            compact
                                            align="top"
                                            icon={Ticket}
                                            title="No promotional vouchers found"
                                            description="Create your first claimable voucher or private promo code."
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, voucherId: null, voucherCode: "" })}
                onConfirm={handleConfirmDeactivate}
                title="Deactivate Promotional Voucher?"
                message={`Deactivating "${confirmModal.voucherCode}" will prevent any new buyers from claiming or applying it at checkout.`}
                icon={PowerOff}
                iconBg="bg-rose-100 text-rose-700"
                confirmText="Deactivate Voucher"
                confirmColor="bg-rose-600 hover:bg-rose-700"
                processing={deactivatingId !== null}
            />

            <VoucherModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingVoucher(null);
                }}
                voucherToEdit={editingVoucher}
                products={products}
                storeRouteName={storeRouteName}
                updateRouteName={updateRouteName}
            />
        </div>
    );
}

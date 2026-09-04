import React, { useState, useMemo } from "react";
import { Head, Link, router } from "@inertiajs/react";
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from "@/Layouts/SellerWorkspaceLayout";
import SellerHeader from "@/Layouts/SellerHeader";
import DiscountModal from "@/Components/Seller/Catalog/DiscountModal";
import KPICard from "@/Components/KPICard";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import ConfirmationModal from "@/Components/ConfirmationModal";
import FilterToolbarHeader from "@/Components/Seller/Shared/FilterToolbarHeader";
import { Tag, Plus, PowerOff, CheckCircle2, Clock, TrendingUp, Edit3 } from "lucide-react";

export default function DiscountManager({ discounts, stats, filters, products, auth }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState(null);
    const [deactivatingId, setDeactivatingId] = useState(null);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        discountId: null,
        discountName: "",
    });

    const [searchQuery, setSearchQuery] = useState(filters?.search || "");
    const [typeFilter, setTypeFilter] = useState(filters?.type || "all");

    const rawList = useMemo(() => {
        return Array.isArray(discounts) ? discounts : (discounts?.data || []);
    }, [discounts]);

    const filteredDiscounts = useMemo(() => {
        return rawList.filter((discount) => {
            if (typeFilter !== "all" && discount.type !== typeFilter) {
                return false;
            }
            if (searchQuery && searchQuery.trim() !== "") {
                const q = searchQuery.toLowerCase();
                const nameMatch = (discount.name || "").toLowerCase().includes(q);
                const valueMatch = String(discount.value).includes(q);
                const productMatch = discount.products?.some((p) => p.name?.toLowerCase().includes(q));
                return nameMatch || valueMatch || productMatch;
            }
            return true;
        });
    }, [rawList, typeFilter, searchQuery]);

    const activeStatus = filters?.status || "ongoing";

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const d = new Date(dateString);
        return d.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
    };

    const handleOpenCreate = () => {
        setEditingDiscount(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (discount) => {
        setEditingDiscount(discount);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDiscount(null);
    };

    const openConfirmDeactivate = (discount) => {
        setConfirmModal({
            isOpen: true,
            discountId: discount.id,
            discountName: discount.name || `Discount Campaign #${discount.id}`,
        });
    };

    const handleConfirmDeactivate = () => {
        if (!confirmModal.discountId) return;

        setDeactivatingId(confirmModal.discountId);

        router.delete(route("discounts.destroy", confirmModal.discountId), {
            preserveScroll: true,
            onFinish: () => {
                setDeactivatingId(null);
                setConfirmModal({ isOpen: false, discountId: null, discountName: "" });
            },
        });
    };

    return (
        <>
            <Head title="Discount Campaigns Manager" />

            <SellerHeader
                title="Discounts"
                subtitle="Manage promotional pricing campaigns, scheduled discounts, and seller flash sales."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto space-y-6 pb-28 sm:pb-20">
                {/* Standardized Horizontal Swiping KPI Cards on Mobile, 2x2 Grid on iPad/Tablet, 4-Col Row on Desktop */}
                <div className="flex overflow-x-auto pb-2 gap-3 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Ongoing Campaigns"
                            value={stats?.ongoing_count || 0}
                            icon={CheckCircle2}
                            color="text-emerald-600"
                            bg="bg-emerald-50"
                        />
                    </div>
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Upcoming Scheduled"
                            value={stats?.upcoming_count || 0}
                            icon={Clock}
                            color="text-amber-600"
                            bg="bg-amber-50"
                        />
                    </div>
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Expired / Ended"
                            value={stats?.expired_count || 0}
                            icon={PowerOff}
                            color="text-stone-600"
                            bg="bg-stone-100"
                        />
                    </div>
                    <div className="w-[82vw] max-w-[260px] shrink-0 snap-center sm:w-auto">
                        <KPICard
                            title="Total Promo Sold"
                            value={stats?.total_promo_sold || 0}
                            icon={TrendingUp}
                            color="text-clay-600"
                            bg="bg-clay-50"
                        />
                    </div>
                </div>

                {/* Status Tabs & Content Container */}
                <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm relative">
                    {/* Standardized Single-Row Filter Toolbar Header */}
                    <FilterToolbarHeader
                        tabs={[
                            { key: "ongoing", label: "Ongoing Active", count: stats?.ongoing_count || 0 },
                            { key: "upcoming", label: "Upcoming Scheduled", count: stats?.upcoming_count || 0 },
                            { key: "expired", label: "Expired / Past", count: stats?.expired_count || 0 },
                        ]}
                        activeTab={activeStatus}
                        onTabChange={(statusKey) => {
                            router.get(
                                route("discounts.index"),
                                { status: statusKey },
                                { preserveState: true, preserveScroll: true }
                            );
                        }}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        searchPlaceholder="Search campaign name, rate, product..."
                        activeFiltersCount={typeFilter !== "all" ? 1 : 0}
                        filterPopoverTitle="Filter Campaigns"
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
                                    <option value="all">All Discount Types</option>
                                    <option value="percentage">Percentage Discount (-X%)</option>
                                    <option value="fixed">Fixed Amount Discount (₱X)</option>
                                </select>
                            </div>
                        }
                        onApplyFilters={() => {}}
                        onResetFilters={() => {
                            setSearchQuery("");
                            setTypeFilter("all");
                        }}
                        extraActions={
                            <button
                                type="button"
                                onClick={handleOpenCreate}
                                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-clay-600 px-3.5 h-[38px] min-h-[38px] text-xs font-bold text-white shadow-2xs transition hover:bg-clay-700 active:scale-95 shrink-0"
                            >
                                <Plus size={14} />
                                <span className="hidden sm:inline">Create Campaign</span>
                                <span className="sm:hidden">Create</span>
                            </button>
                        }
                        activeFilterTags={
                            typeFilter !== "all"
                                ? [
                                      {
                                          label: `Type: ${typeFilter === "percentage" ? "Percentage (-X%)" : "Fixed Amount (₱X)"}`,
                                          onRemove: () => setTypeFilter("all"),
                                      },
                                  ]
                                : []
                        }
                        containerClassName="rounded-t-3xl border-x-0 border-t-0 border-b border-stone-200/80 shadow-none bg-stone-50/40"
                    />

                    {/* MOBILE & TABLET CARD LIST VIEW (< lg) */}
                    <div className="block lg:hidden p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 bg-stone-50/40 rounded-b-3xl">
                        {filteredDiscounts.length > 0 ? (
                            filteredDiscounts.map((discount) => {
                                const now = new Date();
                                const start = new Date(discount.start_at);
                                const end = new Date(discount.end_at);
                                const isActive = discount.is_active && start <= now && end >= now;
                                const isUpcoming = discount.is_active && start > now;

                                return (
                                    <div
                                        key={discount.id}
                                        className="bg-white rounded-2xl border border-stone-200/80 p-4 shadow-xs space-y-3 hover:border-clay-200 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="font-bold text-stone-900 text-sm sm:text-base leading-tight">
                                                    {discount.name || `Discount Campaign #${discount.id}`}
                                                </h4>
                                                <span className="text-[10px] sm:text-xs text-stone-400 font-mono block mt-0.5">
                                                    Created {new Date(discount.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap shrink-0 shadow-2xs">
                                                {discount.type === "percentage" ? `-${discount.value}% OFF` : `₱${Number(discount.value).toLocaleString(undefined, { minimumFractionDigits: 2 })} Fixed`}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-100 text-[11px] sm:text-xs">
                                            <div>
                                                <span className="text-stone-400 uppercase text-[9px] sm:text-[10px] font-extrabold block">Start Date</span>
                                                <span className="font-semibold text-stone-800 leading-tight block">{formatDate(discount.start_at)}</span>
                                            </div>
                                            <div>
                                                <span className="text-stone-400 uppercase text-[9px] sm:text-[10px] font-extrabold block">End Date</span>
                                                <span className="font-semibold text-stone-800 leading-tight block">{formatDate(discount.end_at)}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                                            <div className="flex items-center gap-2">
                                                {discount.products && discount.products.length > 0 ? (
                                                    <div className="flex -space-x-1.5 items-center">
                                                        {discount.products.slice(0, 3).map((p) => {
                                                            const imgUrl = p.cover_photo_path ? (p.cover_photo_path.startsWith('http') ? p.cover_photo_path : `/storage/${p.cover_photo_path}`) : '/images/no-image.png';
                                                            return (
                                                                <img
                                                                    key={p.id}
                                                                    src={imgUrl}
                                                                    alt={p.name}
                                                                    className="h-5 w-5 rounded-full ring-1 ring-white object-cover bg-stone-100 border border-stone-200"
                                                                />
                                                            );
                                                        })}
                                                        <span className="text-[11px] font-bold text-stone-700 ml-1">
                                                            {discount.products.length} {discount.products.length === 1 ? "product" : "products"}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-stone-400 text-[11px]">No products</span>
                                                )}
                                            </div>

                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                isActive
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                    : isUpcoming
                                                    ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                                                    : "bg-stone-100 text-stone-600 border border-stone-200"
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : isUpcoming ? "bg-amber-500" : "bg-stone-400"}`} />
                                                {isActive ? "Active" : isUpcoming ? "Scheduled" : "Expired"}
                                            </span>
                                        </div>

                                        {/* Mobile/Tablet Card Footer Actions */}
                                        <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                                            <span className="text-[11px] sm:text-xs font-bold text-stone-500">
                                                Sales: <strong className="text-stone-800">{discount.promo_sold || 0} units</strong>
                                            </span>

                                            <div className="flex items-center gap-2">
                                                {discount.is_active && end >= now && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(discount)}
                                                        className="w-8 h-8 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/70 flex items-center justify-center active:scale-95 shadow-2xs"
                                                        title="Edit Campaign"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                )}
                                                {discount.is_active && end >= now && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openConfirmDeactivate(discount)}
                                                        disabled={deactivatingId === discount.id}
                                                        className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 border border-rose-200/70 flex items-center justify-center active:scale-95 disabled:opacity-40 shadow-2xs"
                                                        title="End Early"
                                                    >
                                                        <PowerOff size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <WorkspaceEmptyState
                                compact
                                align="top"
                                icon={Tag}
                                title="No promotional campaigns found"
                                description="Create your first promotional discount campaign to boost seller sales."
                            />
                        )}
                    </div>

                    {/* DESKTOP TABLE VIEW (>= lg) */}
                    <div className="hidden lg:block overflow-x-auto rounded-b-3xl">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-stone-50 border-b border-stone-200/70 text-[10px] uppercase tracking-wider font-extrabold text-stone-400">
                                <tr>
                                    <th className="py-3 px-5">Campaign / Discount</th>
                                    <th className="py-3 px-4 text-center">Type & Rate</th>
                                    <th className="py-3 px-4">Effective Schedule</th>
                                    <th className="py-3 px-4 text-center">Linked Products</th>
                                    <th className="py-3 px-4 text-center">Order Limit</th>
                                    <th className="py-3 px-4 text-center">Promo Sales</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100">
                                {filteredDiscounts.length > 0 ? (
                                    filteredDiscounts.map((discount) => {
                                        const now = new Date();
                                        const start = new Date(discount.start_at);
                                        const end = new Date(discount.end_at);
                                        const isActive = discount.is_active && start <= now && end >= now;
                                        const isUpcoming = discount.is_active && start > now;

                                        return (
                                            <tr key={discount.id} className="hover:bg-stone-50/50 transition">
                                                {/* Campaign Name */}
                                                <td className="py-3.5 px-5 font-bold text-stone-900">
                                                    <div>
                                                        <span className="block">{discount.name || `Discount Campaign #${discount.id}`}</span>
                                                        <span className="text-[10px] text-stone-400 font-mono">Created {new Date(discount.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </td>

                                                {/* Rate */}
                                                <td className="py-3.5 px-4 text-center font-extrabold text-clay-700 whitespace-nowrap">
                                                    <span className="bg-amber-50 text-amber-800 border border-amber-200/80 px-2.5 py-1 rounded-xl text-xs font-extrabold whitespace-nowrap inline-block shadow-sm">
                                                        {discount.type === "percentage" ? `-${discount.value}% OFF` : `₱${Number(discount.value).toLocaleString(undefined, { minimumFractionDigits: 2 })} Fixed`}
                                                    </span>
                                                </td>

                                                {/* Dates */}
                                                <td className="py-3.5 px-4 text-stone-600 text-[11px] whitespace-nowrap">
                                                    <div className="space-y-0.5">
                                                        <p><span className="text-stone-400 uppercase text-[9px] font-extrabold mr-1">Start:</span><span className="font-semibold text-stone-800">{formatDate(discount.start_at)}</span></p>
                                                        <p><span className="text-stone-400 uppercase text-[9px] font-extrabold mr-1.5">End:</span><span className="font-semibold text-stone-800">{formatDate(discount.end_at)}</span></p>
                                                    </div>
                                                </td>

                                                {/* Linked Products */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {discount.products && discount.products.length > 0 ? (
                                                        <div className="flex items-center justify-center gap-2" title={discount.products.map(p => p.name).join(", ")}>
                                                            <div className="flex -space-x-2 items-center">
                                                                {discount.products.slice(0, 3).map((p) => {
                                                                    const imgUrl = p.cover_photo_path ? (p.cover_photo_path.startsWith('http') ? p.cover_photo_path : `/storage/${p.cover_photo_path}`) : '/images/no-image.png';
                                                                    return (
                                                                        <img
                                                                            key={p.id}
                                                                            src={imgUrl}
                                                                            alt={p.name}
                                                                            title={p.name}
                                                                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover bg-stone-100 border border-stone-200"
                                                                        />
                                                                    );
                                                                })}
                                                                {discount.products.length > 3 && (
                                                                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-stone-200 text-stone-700 font-extrabold text-[9px] border border-stone-300">
                                                                        +{discount.products.length - 3}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-stone-800 text-xs">
                                                                {discount.products.length} {discount.products.length === 1 ? "product" : "products"}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-stone-400 text-xs font-medium">No products</span>
                                                    )}
                                                </td>

                                                {/* Purchase Limit */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {discount.max_purchase_limit ? (
                                                        <span className="bg-stone-100 text-stone-700 font-bold px-2.5 py-1 rounded-lg text-[11px] whitespace-nowrap border border-stone-200/60">
                                                            Max {discount.max_purchase_limit} / order
                                                        </span>
                                                    ) : (
                                                        <span className="text-stone-300 text-[11px]">No Limit</span>
                                                    )}
                                                </td>

                                                {/* Promo Sold */}
                                                <td className="py-3.5 px-4 text-center font-bold text-stone-700 whitespace-nowrap">
                                                    {discount.promo_sold || 0} units
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${
                                                        isActive
                                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                            : isUpcoming
                                                            ? "bg-amber-50 text-amber-800 border border-amber-200/60"
                                                            : "bg-stone-100 text-stone-600 border border-stone-200"
                                                    }`}>
                                                        {isActive ? "Ongoing Active" : isUpcoming ? "Upcoming Scheduled" : "Expired / Ended"}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {discount.is_active && end >= now && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEdit(discount)}
                                                                className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs"
                                                                title="Edit Campaign"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                        )}
                                                        {discount.is_active && end >= now ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => openConfirmDeactivate(discount)}
                                                                disabled={deactivatingId === discount.id}
                                                                className="p-2 text-rose-600 hover:bg-rose-50 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:opacity-40"
                                                                title="End Early"
                                                            >
                                                                <PowerOff size={14} />
                                                            </button>
                                                        ) : (
                                                            <span className="text-[11px] text-stone-400 font-medium">—</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="py-12 text-center text-xs text-stone-400">
                                            <WorkspaceEmptyState
                                                compact
                                                align="top"
                                                icon={Tag}
                                                title="No promotional campaigns found"
                                                description="Create your first promotional discount campaign to boost seller sales."
                                            />
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Mobile Floating Action Button (FAB) */}
            <button
                type="button"
                onClick={handleOpenCreate}
                className="fixed bottom-6 right-4 z-40 bg-clay-600 text-white rounded-full p-4 shadow-xl active:scale-90 transition-transform sm:hidden flex items-center justify-center min-h-[52px] min-w-[52px]"
                title="Create Discount Campaign"
            >
                <Plus size={22} />
            </button>

            {/* Confirmation Modal for End Early */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, discountId: null, discountName: "" })}
                onConfirm={handleConfirmDeactivate}
                title="End Promotional Campaign Early?"
                message={`Are you sure you want to end "${confirmModal.discountName}" early? Affected products will immediately revert to their standard prices.`}
                icon={PowerOff}
                iconBg="bg-rose-100 text-rose-700"
                confirmText="End Campaign Early"
                confirmColor="bg-rose-600 hover:bg-rose-700"
                processing={deactivatingId !== null}
            />

            {/* Discount Creation / Editing Modal */}
            <DiscountModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                allProducts={products}
                selectedProducts={[]}
                canEdit={true}
                discountToEdit={editingDiscount}
            />
        </>
    );
}

DiscountManager.layout = (page) => <SellerWorkspaceLayout active="discounts">{page}</SellerWorkspaceLayout>;

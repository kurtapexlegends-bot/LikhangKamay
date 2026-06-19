import React from "react";
import Checkbox from "@/Components/Checkbox";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import { AlertTriangle, Edit3, Package } from "lucide-react";

export default function ProductMobileCard({
    products,
    selectedProductIds,
    toggleProductSelection,
    canEditProducts,
    openEditModal,
    openAddModal,
    onResubmitClick,
}) {
    return (
        <div className="space-y-3 p-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 md:hidden">
            {products.length > 0 ? (
                products.map((product) => (
                    <div
                        key={product.id}
                        className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm flex flex-col justify-between"
                    >
                        <div className="flex gap-4">
                            <div className="pt-1 select-none min-w-[44px] min-h-[44px] flex items-start justify-center shrink-0">
                                <Checkbox
                                    checked={selectedProductIds.includes(product.id)}
                                    onChange={() => toggleProductSelection(product.id)}
                                />
                            </div>
                            <img
                                src={product.img || "/images/no-image.png"}
                                alt={product.name}
                                className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 bg-gray-100 object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="truncate pr-2 text-sm font-bold text-gray-900">
                                            {product.name}
                                        </h3>
                                        <p className="text-[10px] font-mono tracking-wide text-gray-400">
                                            {product.sku}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                        <span
                                            onClick={() => {
                                                if (product.status === "rejected" || product.status === "flagged") {
                                                    onResubmitClick?.(product);
                                                }
                                            }}
                                            title={
                                                product.status === "rejected" || product.status === "flagged"
                                                    ? "Click to view reason and resubmit"
                                                    : undefined
                                            }
                                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                                                product.status === "rejected" || product.status === "flagged"
                                                    ? "cursor-pointer hover:opacity-85 transition-opacity"
                                                    : ""
                                            } ${
                                                product.status === "Active"
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                    : product.status === "Archived"
                                                    ? "bg-gray-100 text-gray-600 border-gray-200"
                                                    : product.status === "pending_review"
                                                    ? "bg-amber-50 text-amber-700 border-amber-100"
                                                    : product.status === "rejected"
                                                    ? "bg-rose-50 text-rose-700 border-rose-100"
                                                    : product.status === "flagged"
                                                    ? "bg-orange-50 text-orange-700 border-orange-100"
                                                    : "bg-stone-50 text-stone-700 border-stone-200"
                                            }`}
                                        >
                                            {product.status === "pending_review"
                                                ? "Pending Review"
                                                : product.status === "rejected"
                                                ? "Rejected"
                                                : product.status === "flagged"
                                                ? "Flagged"
                                                : product.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                                            Price
                                        </p>
                                        <p className="mt-1 font-bold text-stone-900">
                                            ₱{Number(product.price).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-stone-100 bg-stone-50 px-3 py-2">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                                            Stock
                                        </p>
                                        <p className="mt-1 font-bold text-stone-900">
                                            {product.stock}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                    <span>Sold: {product.sold}</span>
                                    {product.stock < 10 && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600">
                                            <AlertTriangle size={10} /> Low Stock
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                            <button
                                type="button"
                                disabled={!canEditProducts}
                                onClick={() => openEditModal(product)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-sky-700 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] select-none active:scale-98 active:bg-sky-100 transition-all"
                            >
                                <Edit3 size={14} /> Edit Product
                            </button>
                        </div>
                    </div>
                ))
            ) : (
                <div className="px-4 py-8 bg-white border border-stone-100 rounded-2xl">
                    <WorkspaceEmptyState
                        compact
                        align="top"
                        icon={Package}
                        title="No products found"
                        description="Create your first product or adjust the current filters."
                    />
                </div>
            )}
        </div>
    );
}

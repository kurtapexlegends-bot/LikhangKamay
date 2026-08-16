import React from "react";
import Checkbox from "@/Components/Checkbox";
import SortableHeader from "@/Components/SortableHeader";
import QuickRestock from "@/Components/Seller/Shared/QuickRestock";
import WorkspaceEmptyState from "@/Components/WorkspaceEmptyState";
import {
    AlertCircle,
    Tag,
    AlertTriangle,
    RefreshCw,
    TrendingUp,
    Edit3,
    RotateCcw,
    Archive,
    Package
} from "lucide-react";

export default function ProductTable({
    products,
    selectedProductIds,
    toggleProductSelection,
    allVisibleSelected,
    toggleVisibleSelection,
    canEditProducts,
    handleQuickRestock,
    openRestockModal,
    openDeductModal,
    openDiscountModal,
    openEditModal,
    openArchiveModal,
    sortConfig,
    requestSort,
    openAddModal,
    onResubmitClick,
}) {
    return (
        <table className="w-full min-w-[900px] text-left">
            <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider select-none">
                <tr>
                    <th className="px-5 py-4 w-12">
                        <Checkbox
                            checked={allVisibleSelected}
                            onChange={toggleVisibleSelection}
                        />
                    </th>
                    <SortableHeader
                        label="Product"
                        sortKey="name"
                        currentSort={sortConfig}
                        onSort={requestSort}
                        align="left"
                    />
                    <SortableHeader
                        label="Price"
                        sortKey="price"
                        currentSort={sortConfig}
                        onSort={requestSort}
                        align="center"
                    />
                    <SortableHeader
                        label="Cost"
                        sortKey="cost_price"
                        currentSort={sortConfig}
                        onSort={requestSort}
                        align="center"
                    />
                    <SortableHeader
                        label="Stock"
                        sortKey="stock"
                        currentSort={sortConfig}
                        onSort={requestSort}
                        align="center"
                    />
                    <SortableHeader
                        label="Sold"
                        sortKey="sold"
                        currentSort={sortConfig}
                        onSort={requestSort}
                        align="center"
                    />
                    <th className="px-5 py-4 text-center">Status</th>
                    <th className="px-5 py-4 text-center">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {products.length > 0 ? (
                    products.map((product) => (
                        <tr
                            key={product.id}
                            className="hover:bg-gray-50/50 transition"
                        >
                            <td className="px-5 py-3">
                                <Checkbox
                                    checked={selectedProductIds.includes(product.id)}
                                    onChange={() => toggleProductSelection(product.id)}
                                />
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={product.img || "/images/no-image.png"}
                                        alt={product.name}
                                        className="w-10 h-10 rounded-lg object-cover bg-gray-100 border border-gray-200"
                                    />
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">
                                            {product.name}
                                        </p>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Tag size={10} className="text-gray-400" />
                                            <p className="text-[10px] text-gray-400 font-mono tracking-wide">
                                                {product.sku}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-5 py-3 font-bold text-gray-700 text-sm text-center">
                                {product.has_discount ? (
                                    <div>
                                        <span className="text-clay-700 font-bold">₱{Number(product.effective_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        <div className="flex items-center justify-center gap-1 mt-0.5">
                                            <span className="text-[10px] text-gray-400 line-through">₱{Number(product.price).toLocaleString()}</span>
                                            <span className="text-[9px] bg-clay-100 text-clay-700 px-1 py-0.2 rounded font-bold">
                                                -{product.discount_info?.percentage_off}%
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    `₱${Number(product.price).toLocaleString()}`
                                )}
                            </td>
                            <td className="px-5 py-3 font-semibold text-gray-500 text-sm text-center">
                                ₱{Number(product.cost_price || 0).toLocaleString()}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex items-center justify-center">
                                    <QuickRestock
                                        item={product}
                                        canEdit={canEditProducts}
                                        onRestock={handleQuickRestock}
                                        unit="units"
                                        type="product"
                                    />
                                </div>
                            </td>
                            <td className="px-5 py-3 font-medium text-gray-600 text-sm text-center">
                                {product.sold || 0}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
                                    <span
                                        className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                            product.status === "Active"
                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                                : product.status === "Draft"
                                                ? "bg-gray-100 text-gray-600 border border-gray-200"
                                                : product.status === "Archived"
                                                ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                                : product.status === "pending_review"
                                                ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                                                : product.status === "rejected"
                                                ? "bg-rose-50 text-rose-700 border border-rose-200/60"
                                                : product.status === "flagged"
                                                ? "bg-purple-50 text-purple-700 border border-purple-200/60"
                                                : "bg-gray-50 text-gray-600 border border-gray-200"
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
                            </td>
                            <td className="px-5 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openRestockModal(product)}
                                        className="p-2 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:opacity-40"
                                        title={canEditProducts ? "Restock" : "Read only"}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openDeductModal(product)}
                                        className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:opacity-40"
                                        title={canEditProducts ? "Manual Deduct" : "Read only"}
                                    >
                                        <TrendingUp size={14} className="rotate-180" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openEditModal(product)}
                                        className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:opacity-40"
                                        title={canEditProducts ? "Edit" : "Read only"}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    {product.status === "Archived" ? (
                                        <button
                                            type="button"
                                            disabled={!canEditProducts}
                                            onClick={() => openArchiveModal(product)}
                                            className="p-2 text-amber-700 hover:text-amber-900 hover:bg-amber-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:opacity-40"
                                            title={canEditProducts ? "Unarchive" : "Read only"}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!canEditProducts}
                                            onClick={() => openArchiveModal(product)}
                                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:opacity-40"
                                            title={canEditProducts ? "Archive" : "Read only"}
                                        >
                                            <Archive size={14} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="7" className="px-6 py-12 text-center align-top">
                            <WorkspaceEmptyState
                                compact
                                align="top"
                                icon={Package}
                                title="No products found"
                                description="Create your first product or adjust the current filters."
                            />
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

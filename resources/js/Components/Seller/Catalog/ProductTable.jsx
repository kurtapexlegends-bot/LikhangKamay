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
                                ₱{Number(product.price).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 font-semibold text-gray-500 text-sm text-center">
                                {product.cost_price ? `₱${Number(product.cost_price).toLocaleString()}` : "—"}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex items-center justify-center gap-2">
                                    <QuickRestock
                                        item={product}
                                        canEdit={canEditProducts}
                                        onRestock={handleQuickRestock}
                                        unit="units"
                                        type="product"
                                    />
                                    {product.stock < 10 && (
                                        <AlertCircle size={12} className="text-rose-500" />
                                    )}
                                </div>
                            </td>
                            <td className="px-5 py-3 text-sm font-medium text-gray-600 text-center">
                                {product.sold}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex flex-col items-center gap-1">
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
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
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
                            </td>
                            <td className="px-5 py-3 text-center">
                                <div className="flex justify-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openRestockModal(product)}
                                        className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canEditProducts ? "Restock" : "Read only"}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openDeductModal(product)}
                                        className="p-2 rounded-xl text-orange-600 hover:bg-orange-50 border border-transparent hover:border-orange-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canEditProducts ? "Manual Deduct" : "Read only"}
                                    >
                                        <TrendingUp size={14} className="rotate-180" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openEditModal(product)}
                                        className="p-2 rounded-xl text-sky-600 hover:bg-sky-50 border border-transparent hover:border-sky-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canEditProducts ? "Edit" : "Read only"}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    {product.status === "Archived" ? (
                                        <button
                                            type="button"
                                            disabled={!canEditProducts}
                                            onClick={() => openArchiveModal(product)}
                                            className="p-2 rounded-xl text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            title={canEditProducts ? "Unarchive" : "Read only"}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!canEditProducts}
                                            onClick={() => openArchiveModal(product)}
                                            className="p-2 rounded-xl text-clay-600 hover:bg-clay-50 border border-transparent hover:border-clay-100/30 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 disabled:cursor-not-allowed disabled:opacity-40"
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

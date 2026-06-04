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
                    />
                    <SortableHeader
                        label="Price"
                        sortKey="price"
                        currentSort={sortConfig}
                        onSort={requestSort}
                    />
                    <SortableHeader
                        label="Stock"
                        sortKey="stock"
                        currentSort={sortConfig}
                        onSort={requestSort}
                    />
                    <SortableHeader
                        label="Sold"
                        sortKey="sold"
                        currentSort={sortConfig}
                        onSort={requestSort}
                    />
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {products.length > 0 ? (
                    products.map((product) => (
                        <tr
                            key={product.id}
                            className="hover:bg-gray-50/50 transition"
                        >
                            <td className="px-5 py-3 align-top">
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
                            <td className="px-5 py-3 font-bold text-gray-700 text-sm">
                                ₱{Number(product.price).toLocaleString()}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex items-center gap-2">
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
                            <td className="px-5 py-3 text-sm font-medium text-gray-600">
                                {product.sold}
                            </td>
                            <td className="px-5 py-3">
                                <div className="flex flex-col items-start gap-1">
                                    {product.stock < 10 && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-600 border border-rose-200 uppercase tracking-wide whitespace-nowrap">
                                            Low Stock
                                        </span>
                                    )}
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${
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
                                    {(product.status === "rejected" || product.status === "flagged") &&
                                        product.rejection_reason && (
                                            <div className="mt-1 flex items-start gap-1 text-[10px] text-rose-600 bg-rose-50/50 p-1.5 rounded-lg border border-rose-100 max-w-[180px] break-words">
                                                <AlertTriangle size={10} className="shrink-0 mt-0.5" />
                                                <span>Reason: {product.rejection_reason}</span>
                                            </div>
                                        )}
                                </div>
                            </td>
                            <td className="px-5 py-3 text-right">
                                <div className="flex justify-end gap-1.5">
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openRestockModal(product)}
                                        className="rounded-md p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canEditProducts ? "Restock" : "Read only"}
                                    >
                                        <RefreshCw size={14} />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openDeductModal(product)}
                                        className="rounded-md p-1.5 text-orange-600 transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canEditProducts ? "Manual Deduct" : "Read only"}
                                    >
                                        <TrendingUp size={14} className="rotate-180" />
                                    </button>
                                    <button
                                        type="button"
                                        disabled={!canEditProducts}
                                        onClick={() => openEditModal(product)}
                                        className="rounded-md p-1.5 text-sky-600 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                        title={canEditProducts ? "Edit" : "Read only"}
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                    {product.status === "Archived" ? (
                                        <button
                                            type="button"
                                            disabled={!canEditProducts}
                                            onClick={() => openArchiveModal(product)}
                                            className="rounded-md p-1.5 text-amber-500 transition-colors hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                                            title={canEditProducts ? "Unarchive" : "Read only"}
                                        >
                                            <RotateCcw size={14} />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={!canEditProducts}
                                            onClick={() => openArchiveModal(product)}
                                            className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
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
                        <td colSpan="7" className="px-6 py-12 text-center">
                            <WorkspaceEmptyState
                                compact
                                icon={Package}
                                title="No products found"
                                description="Create your first product or adjust the current filters."
                                actionLabel="Create Product"
                                onAction={openAddModal}
                            />
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
}

import React from 'react';
import { Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, AlertTriangle, Store, Pencil, Banknote, Trash2 } from 'lucide-react';
import QuickRestock from '@/Components/Seller/Shared/QuickRestock';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { TableBodySkeleton } from '@/Components/Skeleton';

export default function SuppliesDesktopTable({
    filteredSupplies = [],
    isNavigating = false,
    canEditProcurement = false,
    canEditStockRequests = false,
    onQuickRestock,
    onEdit,
    onRequestRestock,
    onDelete,
    onOpenAddSupply,
}) {
    return (
        <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-stone-200/80 bg-stone-50/50 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                        <th className="px-4 py-3 font-semibold">SKU</th>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Category</th>
                        <th className="px-4 py-3 font-semibold text-center">Stock</th>
                        <th className="px-4 py-3 font-semibold">Unit Cost</th>
                        <th className="px-4 py-3 font-semibold">Supplier</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs">
                    {isNavigating && filteredSupplies.length === 0 ? (
                        <TableBodySkeleton rows={5} cols={8} />
                    ) : filteredSupplies.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            {filteredSupplies.map(supply => (
                                <motion.tr 
                                    layout
                                    key={supply.id} 
                                    className="hover:bg-stone-50/80 transition-colors group"
                                >
                                    <td className="px-4 py-3 font-mono text-[11px] text-stone-400 font-bold">{supply.sku || '-'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-clay-100 flex items-center justify-center text-clay-700 overflow-hidden border border-clay-200 shrink-0">
                                                {supply.product && supply.product.img ? (
                                                    <img src={supply.product.img} alt={supply.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                                ) : supply.image ? (
                                                    <img src={supply.image} alt={supply.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                                ) : (
                                                    <Package size={14} />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-stone-900 text-xs">{supply.name}</p>
                                                {supply.notes && <p className="text-[10px] text-stone-500 truncate max-w-[200px]">{supply.notes}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                            {supply.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <QuickRestock 
                                            item={supply}
                                            canEdit={canEditProcurement}
                                            onRestock={onQuickRestock}
                                            unit={supply.unit}
                                            type="supply"
                                        />
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-stone-700">
                                        {supply.unit_cost ? `₱${parseFloat(supply.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-stone-600 font-medium">{supply.supplier || '-'}</td>
                                    <td className="px-4 py-3">
                                        {supply.quantity <= supply.min_stock ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                                <AlertTriangle size={10} /> Low Stock
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                                In Stock
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Link
                                                href={route('seller.supply-hub.index', { search: supply.name })}
                                                className="p-2 text-stone-700 hover:text-white hover:bg-stone-900 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs"
                                                title="Source on Supply Hub"
                                            >
                                                <Store size={14} />
                                            </Link>
                                            <button
                                                disabled={!canEditProcurement}
                                                onClick={() => onEdit(supply)}
                                                className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                                title="Edit Supply"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                disabled={!canEditStockRequests}
                                                onClick={() => onRequestRestock(supply)}
                                                className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                                title="Request Restock"
                                            >
                                                <Banknote size={14} />
                                            </button>
                                            <button
                                                disabled={!canEditProcurement}
                                                onClick={() => onDelete(supply)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <tr>
                            <td colSpan="8" className="px-6 py-20 text-center">
                                <WorkspaceEmptyState
                                    icon={Package}
                                    title="No supplies found"
                                    description="Add materials and raw supplies to track stock levels, product recipes, and restock requests."
                                    actionLabel={canEditProcurement ? 'Add New Material' : 'Read Only'}
                                    onAction={canEditProcurement ? onOpenAddSupply : undefined}
                                />
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

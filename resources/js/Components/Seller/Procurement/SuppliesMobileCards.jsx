import React from 'react';
import { Link } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, AlertTriangle, Store, Pencil, Banknote, Trash2 } from 'lucide-react';
import QuickRestock from '@/Components/Seller/Shared/QuickRestock';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { TableBodySkeleton } from '@/Components/Skeleton';

export default function SuppliesMobileCards({
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
        <div className="block lg:hidden divide-y divide-stone-100">
            {isNavigating && filteredSupplies.length === 0 ? (
                <div className="p-4">
                    <TableBodySkeleton rows={4} cols={1} />
                </div>
            ) : filteredSupplies.length > 0 ? (
                <AnimatePresence mode="popLayout">
                    {filteredSupplies.map(supply => (
                        <motion.div 
                            layout
                            key={supply.id} 
                            className="p-4 space-y-3 hover:bg-stone-50/50 transition-colors"
                        >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-clay-100 flex items-center justify-center text-clay-700 overflow-hidden border border-clay-200 shrink-0">
                                        {supply.product && supply.product.img ? (
                                            <img src={supply.product.img} alt={supply.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                        ) : supply.image ? (
                                            <img src={supply.image} alt={supply.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                            <Package size={16} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-stone-900 text-xs truncate">{supply.name}</h3>
                                        <p className="font-mono text-[10px] text-stone-400 font-bold">{supply.sku || 'NO SKU'}</p>
                                    </div>
                                </div>
                                <div>
                                    {supply.quantity <= supply.min_stock ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-700 border border-red-200 shrink-0">
                                            <AlertTriangle size={9} /> Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-200 shrink-0">
                                            In Stock
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50/60 p-2.5 rounded-xl border border-stone-150">
                                <div>
                                    <span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block">Category</span>
                                    <span className="font-semibold text-stone-700">{supply.category}</span>
                                </div>
                                <div>
                                    <span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block">Unit Cost</span>
                                    <span className="font-semibold text-stone-700">
                                        {supply.unit_cost ? `₱${parseFloat(supply.unit_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-stone-400 font-bold uppercase tracking-wider text-[9px] block">Supplier</span>
                                    <span className="font-semibold text-stone-700 truncate block">{supply.supplier || 'Not specified'}</span>
                                </div>
                            </div>

                            {/* Stock & Quick Restock */}
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-xs font-bold text-stone-600">Current Stock:</span>
                                <QuickRestock 
                                    item={supply}
                                    canEdit={canEditProcurement}
                                    onRestock={onQuickRestock}
                                    unit={supply.unit}
                                    type="supply"
                                />
                            </div>

                            {/* Actions Toolbar */}
                            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-stone-100">
                                <Link
                                    href={route('seller.supply-hub.index', { search: supply.name })}
                                    className="p-2 text-stone-700 hover:text-white hover:bg-stone-900 border border-stone-200 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center bg-white"
                                    title="Source on Supply Hub"
                                >
                                    <Store size={14} />
                                </Link>
                                <button
                                    disabled={!canEditProcurement}
                                    onClick={() => onEdit(supply)}
                                    className="p-2 text-clay-700 hover:bg-clay-50 border border-stone-200 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center bg-white disabled:opacity-50 cursor-pointer"
                                    title="Edit Supply"
                                >
                                    <Pencil size={14} />
                                </button>
                                <button
                                    disabled={!canEditStockRequests}
                                    onClick={() => onRequestRestock(supply)}
                                    className="p-2 text-stone-500 hover:bg-stone-100 border border-stone-200 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center bg-white disabled:opacity-50 cursor-pointer"
                                    title="Request Restock"
                                >
                                    <Banknote size={14} />
                                </button>
                                <button
                                    disabled={!canEditProcurement}
                                    onClick={() => onDelete(supply)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-xl transition min-w-[36px] min-h-[36px] flex items-center justify-center bg-white disabled:opacity-50 cursor-pointer"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            ) : (
                <div className="p-8 text-center">
                    <WorkspaceEmptyState
                        icon={Package}
                        title="No supplies found"
                        description="Add materials and raw supplies to track stock levels and recipes."
                        actionLabel={canEditProcurement ? 'Add New Material' : 'Read Only'}
                        onAction={canEditProcurement ? onOpenAddSupply : undefined}
                    />
                </div>
            )}
        </div>
    );
}

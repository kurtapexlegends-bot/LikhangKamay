import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, AlertTriangle, Search, X, Banknote, Trash2 } from 'lucide-react';
import QuickRestock from '@/Components/Seller/Shared/QuickRestock';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { TableBodySkeleton } from '@/Components/Skeleton';

export default function SuppliesTable({
    supplies,
    categoriesList,
    canEditProcurement,
    canEditStockRequests,
    isNavigating,
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    onQuickRestock,
    onRequestRestock,
    onDelete,
    onOpenAddSupply
}) {
    // Filter supplies locally based on props
    const filteredSupplies = supplies.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (s.supplier && s.supplier.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchCategory = filterCategory === 'all' || s.category === filterCategory;
        return matchSearch && matchCategory;
    });

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            {/* Table Header / Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-gray-900 text-xs">Supply Inventory</h3>
                    <select 
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="text-[11px] font-bold border border-gray-200 bg-white rounded-xl focus:ring-clay-500 focus:border-clay-500 px-3 py-1.5 text-gray-600 transition-colors cursor-pointer min-h-[36px]"
                    >
                        <option value="all">All Categories</option>
                        {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                    <input 
                        type="text" 
                        disabled={!canEditProcurement}
                        placeholder="Search supplies..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-clay-500 focus:border-clay-500 transition-shadow min-h-[38px]"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
                            title="Clear search"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Mobile View Layout (Cards) */}
            <div className="space-y-3 p-4 sm:hidden">
                {filteredSupplies.length > 0 ? (
                    filteredSupplies.map((supply) => (
                        <div key={supply.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-clay-100 flex items-center justify-center text-clay-700 overflow-hidden border border-clay-200 shrink-0">
                                        {supply.product && supply.product.img ? (
                                            <img src={supply.product.img} alt={supply.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                        ) : (
                                            <Package size={14} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-900">{supply.name}</p>
                                        <p className="mt-1 text-[11px] text-gray-500">{supply.category}</p>
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    {supply.quantity <= supply.min_stock ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                                            <AlertTriangle size={10} /> Low Stock
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                                            In Stock
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-3 text-xs">
                                <div>
                                    <p className="font-bold uppercase tracking-wide text-gray-400">Stock</p>
                                    <div className="mt-1">
                                        <QuickRestock 
                                            item={supply}
                                            canEdit={canEditProcurement}
                                            onRestock={onQuickRestock}
                                            unit={supply.unit}
                                            type="supply"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <p className="font-bold uppercase tracking-wide text-gray-400">Unit Cost</p>
                                    <p className="mt-1 font-semibold text-gray-700">{supply.unit_cost ? `₱${parseFloat(supply.unit_cost).toLocaleString()}` : '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="font-bold uppercase tracking-wide text-gray-400">Supplier</p>
                                    <p className="mt-1 font-semibold text-gray-700">{supply.supplier || '-'}</p>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-end gap-2">
                                <button
                                    disabled={!canEditStockRequests}
                                    onClick={() => onRequestRestock(supply)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Request Restock"
                                >
                                    <Banknote size={16} />
                                </button>
                                <button
                                    disabled={!canEditProcurement}
                                    onClick={() => onDelete(supply)}
                                    className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <WorkspaceEmptyState
                        icon={Package}
                        title="No supplies found"
                        description="Start by adding inventory items so Procurement can track stock levels, restocks, and accounting requests."
                        actionLabel={canEditProcurement ? 'Add New Supply' : 'Read Only'}
                        onAction={canEditProcurement ? onOpenAddSupply : undefined}
                    />
                )}
            </div>

            {/* Desktop View Layout (Table) */}
            <div className="hidden overflow-x-auto flex-1 sm:block">
                <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-4 py-3">Item Name</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Stock</th>
                            <th className="px-4 py-3">Unit Cost</th>
                            <th className="px-4 py-3">Supplier</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isNavigating && filteredSupplies.length === 0 ? (
                            <TableBodySkeleton rows={5} cols={7} />
                        ) : filteredSupplies.length > 0 ? (
                            <AnimatePresence initial={false}>
                                {filteredSupplies.map((supply) => (
                                    <motion.tr 
                                        key={supply.id} 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="hover:bg-gray-50/50 transition duration-150"
                                    >
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-clay-100 flex items-center justify-center text-clay-700 overflow-hidden border border-clay-200">
                                                    {supply.product && supply.product.img ? (
                                                        <img src={supply.product.img} alt={supply.name} className="w-full h-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                                    ) : (
                                                        <Package size={14} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-xs">{supply.name}</p>
                                                    {supply.notes && <p className="text-[10px] text-gray-500">{supply.notes}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-gray-600">{supply.category}</td>
                                        <td className="px-4 py-3">
                                            <QuickRestock 
                                                item={supply}
                                                canEdit={canEditProcurement}
                                                onRestock={onQuickRestock}
                                                unit={supply.unit}
                                                type="supply"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-gray-600">
                                            {supply.unit_cost ? `₱${parseFloat(supply.unit_cost).toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-[10px] text-gray-600">{supply.supplier || '-'}</td>
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
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    disabled={!canEditStockRequests}
                                                    onClick={() => onRequestRestock(supply)}
                                                    className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                                                    title="Request Restock"
                                                >
                                                    <Banknote size={14} />
                                                </button>
                                                <button
                                                    disabled={!canEditProcurement}
                                                    onClick={() => onDelete(supply)}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
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
                                <td colSpan="7" className="px-6 py-20 text-center">
                                    <WorkspaceEmptyState
                                        icon={Package}
                                        title="No supplies found"
                                        description="Start by adding inventory items so Procurement can track stock levels, restocks, and accounting requests."
                                        actionLabel={canEditProcurement ? 'Add New Supply' : 'Read Only'}
                                        onAction={canEditProcurement ? onOpenAddSupply : undefined}
                                    />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, AlertTriangle, Search, X, Banknote, Trash2, Pencil, SlidersHorizontal, ChevronDown, RotateCcw, Filter } from 'lucide-react';
import QuickRestock from '@/Components/Seller/Shared/QuickRestock';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { TableBodySkeleton } from '@/Components/Skeleton';

export default function SuppliesTable({
    supplies,
    categoriesList = [],
    unitsList = [],
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
    const [stockStatus, setStockStatus] = useState('all');
    const [unitType, setUnitType] = useState('all');

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Staged local draft filter state
    const [draftCategory, setDraftCategory] = useState(filterCategory || 'all');
    const [draftStockStatus, setDraftStockStatus] = useState(stockStatus);
    const [draftUnitType, setDraftUnitType] = useState(unitType);

    const availableUnits = unitsList.length > 0
        ? unitsList
        : Array.from(new Set(supplies.map(s => s.unit).filter(Boolean)));

    // Sync draft states when popover/drawer opens
    useEffect(() => {
        if (isPopoverOpen || isDrawerOpen) {
            setDraftCategory(filterCategory || 'all');
            setDraftStockStatus(stockStatus);
            setDraftUnitType(unitType);
        }
    }, [isPopoverOpen, isDrawerOpen, filterCategory, stockStatus, unitType]);

    // Outside click detection for desktop popover
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsPopoverOpen(false);
            }
        };
        if (isPopoverOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen]);

    const handleOpenFilters = () => {
        setDraftCategory(filterCategory || 'all');
        setDraftStockStatus(stockStatus);
        setDraftUnitType(unitType);
        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen((prev) => !prev);
        }
    };

    const applyDraftFilters = () => {
        setFilterCategory(draftCategory);
        setStockStatus(draftStockStatus);
        setUnitType(draftUnitType);
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    const resetFilters = () => {
        setDraftCategory('all');
        setDraftStockStatus('all');
        setDraftUnitType('all');
        setFilterCategory('all');
        setStockStatus('all');
        setUnitType('all');
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);
    };

    // Filter supplies locally based on props & popover filters
    const filteredSupplies = useMemo(() => {
        if (!Array.isArray(supplies) || supplies.length === 0) return [];
        const searchLower = searchTerm ? searchTerm.toLowerCase().trim() : '';

        return supplies.filter(s => {
            const matchSearch = !searchLower ||
                s.name.toLowerCase().includes(searchLower) || 
                (s.supplier && s.supplier.toLowerCase().includes(searchLower));
            const matchCategory = filterCategory === 'all' || s.category === filterCategory;
            const matchStock = stockStatus === 'all' ||
                               (stockStatus === 'low_stock' && s.quantity <= s.min_stock) ||
                               (stockStatus === 'in_stock' && s.quantity > s.min_stock);
            const matchUnit = unitType === 'all' || s.unit === unitType;
            return matchSearch && matchCategory && matchStock && matchUnit;
        });
    }, [supplies, searchTerm, filterCategory, stockStatus, unitType]);

    const activeFiltersCount = [
        filterCategory && filterCategory !== 'all',
        stockStatus && stockStatus !== 'all',
        unitType && unitType !== 'all'
    ].filter(Boolean).length;

    const draftActiveCount = [
        draftCategory && draftCategory !== 'all',
        draftStockStatus && draftStockStatus !== 'all',
        draftUnitType && draftUnitType !== 'all'
    ].filter(Boolean).length;

    const filterFieldsGrid = (
        <div className="space-y-4">
            {/* 1. Category Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Category
                </label>
                <div className="relative">
                    <select
                        value={draftCategory}
                        onChange={(e) => setDraftCategory(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Categories ({categoriesList.length})</option>
                        {categoriesList.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 2. Stock Warning Status */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Stock Alert Status
                </label>
                <div className="relative">
                    <select
                        value={draftStockStatus}
                        onChange={(e) => setDraftStockStatus(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Stock Levels</option>
                        <option value="low_stock">Low Stock (At or Below Min)</option>
                        <option value="in_stock">In Stock (Sufficient)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Measurement Unit */}
            {availableUnits.length > 0 && (
                <div>
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                        Unit of Measure
                    </label>
                    <div className="relative">
                        <select
                            value={draftUnitType}
                            onChange={(e) => setDraftUnitType(e.target.value)}
                            className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                        >
                            <option value="all">All Units ({availableUnits.length})</option>
                            {availableUnits.map((u) => (
                                <option key={u} value={u}>
                                    {u}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col min-h-[400px] relative">
            {/* Table Header / Toolbar */}
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-gray-50/30 rounded-t-2xl">
                <h3 className="font-bold text-gray-900 text-xs shrink-0">Supply Inventory</h3>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:w-64">
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

                    {/* Unified Popover Filter Button (Right Aligned) */}
                    <div className="relative inline-block text-left" ref={popoverRef}>
                        <button
                            type="button"
                            onClick={handleOpenFilters}
                            className={`inline-flex h-[38px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-3.5 text-xs font-bold transition-all shadow-sm active:scale-95 ${
                                activeFiltersCount > 0
                                    ? 'bg-clay-700 text-white border-clay-800 shadow-clay-200 hover:bg-clay-800'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                            }`}
                        >
                            <SlidersHorizontal size={14} strokeWidth={2.2} />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="ml-0.5 inline-flex items-center justify-center rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-black text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${isPopoverOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Desktop Popover Card */}
                        {isPopoverOpen && (
                            <div className="hidden lg:flex flex-col absolute right-0 z-[100] mt-2 w-[380px] max-h-[calc(100vh-180px)] rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <Filter size={15} className="text-clay-700" />
                                        <h3 className="text-sm font-bold text-stone-900">Filter Supplies</h3>
                                    </div>
                                    {draftActiveCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDraftCategory('all');
                                                setDraftStockStatus('all');
                                                setDraftUnitType('all');
                                            }}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                        >
                                            <RotateCcw size={12} />
                                            <span>Reset Selection</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto pr-1 space-y-4 max-h-[50vh] no-scrollbar">
                                    {filterFieldsGrid}
                                </div>

                                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between shrink-0 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => setIsPopoverOpen(false)}
                                        className="rounded-xl border border-stone-200 px-3.5 py-2 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={applyDraftFilters}
                                        className="rounded-xl bg-clay-700 px-5 py-2 text-xs font-bold text-white shadow-md shadow-clay-200 hover:bg-clay-800 transition active:scale-95"
                                    >
                                        Apply & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Active Filter Tag Pills */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 py-2 px-4 bg-gray-50/50 border-b border-gray-100">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {filterCategory && filterCategory !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Category: {filterCategory}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setFilterCategory('all');
                                    setDraftCategory('all');
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {stockStatus && stockStatus !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Status: {stockStatus === 'low_stock' ? 'Low Stock Alert' : 'In Stock'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setStockStatus('all');
                                    setDraftStockStatus('all');
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {unitType && unitType !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Unit: {unitType}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setUnitType('all');
                                    setDraftUnitType('all');
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="text-[11px] font-bold text-clay-700 hover:underline ml-1"
                    >
                        Clear All
                    </button>
                </div>
            )}

            {/* Mobile Bottom-Sheet Filter Drawer */}
            <SlideOverDrawer
                show={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                title="Filter Supplies"
                position="bottom"
                widthClass="max-w-md"
                footer={
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 min-h-[44px]"
                        >
                            Reset All
                        </button>
                        <button
                            type="button"
                            onClick={applyDraftFilters}
                            className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-lg shadow-clay-200 min-h-[44px]"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="py-2">
                    {filterFieldsGrid}
                </div>
            </SlideOverDrawer>

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
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    disabled={!canEditProcurement}
                                                    onClick={() => onEdit(supply)}
                                                    className="p-2 text-clay-700 hover:text-clay-900 hover:bg-clay-50/60 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
                                                    title="Edit Supply"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    disabled={!canEditProcurement}
                                                    onClick={() => onRestockRequest(supply)}
                                                    className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
                                                    title="Request Restock"
                                                >
                                                    <Banknote size={14} />
                                                </button>
                                                <button
                                                    disabled={!canEditProcurement}
                                                    onClick={() => onDelete(supply)}
                                                    className="p-2 text-rose-600 hover:bg-rose-50 border border-stone-200/60 rounded-xl transition-all duration-200 min-w-[36px] min-h-[36px] flex items-center justify-center bg-white shadow-2xs disabled:cursor-not-allowed disabled:opacity-50"
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

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Search, Filter, Plus, Store, 
    X, RotateCcw, ChevronDown
} from 'lucide-react';
import { Link } from '@inertiajs/react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import SuppliesFilterPopover from '@/Components/Seller/Procurement/SuppliesFilterPopover';
import SuppliesDesktopTable from '@/Components/Seller/Procurement/SuppliesDesktopTable';
import SuppliesMobileCards from '@/Components/Seller/Procurement/SuppliesMobileCards';

export default function SuppliesTable({
    supplies = [],
    isNavigating = false,
    canEditProcurement = false,
    canEditStockRequests = false,
    categoriesList = [],
    availableUnits = [],
    onQuickRestock,
    onEdit,
    onRequestRestock,
    onDelete,
    onOpenAddSupply,
    initialCategory = 'all',
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
    const [stockStatusFilter, setStockStatusFilter] = useState('all');
    const [unitTypeFilter, setUnitTypeFilter] = useState('all');

    // Popover / Drawer state
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
    const filterContainerRef = useRef(null);

    // Draft filter state
    const [draftCategory, setDraftCategory] = useState(selectedCategory);
    const [draftStockStatus, setDraftStockStatus] = useState(stockStatusFilter);
    const [draftUnitType, setDraftUnitType] = useState(unitTypeFilter);

    // Sync draft on open
    const openDesktopPopover = () => {
        setDraftCategory(selectedCategory);
        setDraftStockStatus(stockStatusFilter);
        setDraftUnitType(unitTypeFilter);
        setIsFilterOpen(prev => !prev);
    };

    const openMobileDrawer = () => {
        setDraftCategory(selectedCategory);
        setDraftStockStatus(stockStatusFilter);
        setDraftUnitType(unitTypeFilter);
        setIsMobileFilterOpen(true);
    };

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterContainerRef.current && !filterContainerRef.current.contains(event.target)) {
                setIsFilterOpen(false);
            }
        };
        if (isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isFilterOpen]);

    const handleApplyFilters = () => {
        setSelectedCategory(draftCategory);
        setStockStatusFilter(draftStockStatus);
        setUnitTypeFilter(draftUnitType);
        setIsFilterOpen(false);
        setIsMobileFilterOpen(false);
    };

    const handleResetFilters = () => {
        setDraftCategory('all');
        setDraftStockStatus('all');
        setDraftUnitType('all');
        setSelectedCategory('all');
        setStockStatusFilter('all');
        setUnitTypeFilter('all');
        setIsFilterOpen(false);
        setIsMobileFilterOpen(false);
    };

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedCategory !== 'all') count++;
        if (stockStatusFilter !== 'all') count++;
        if (unitTypeFilter !== 'all') count++;
        return count;
    }, [selectedCategory, stockStatusFilter, unitTypeFilter]);

    const draftActiveCount = useMemo(() => {
        let count = 0;
        if (draftCategory !== 'all') count++;
        if (draftStockStatus !== 'all') count++;
        if (draftUnitType !== 'all') count++;
        return count;
    }, [draftCategory, draftStockStatus, draftUnitType]);

    // Client-side filtering logic
    const filteredSupplies = useMemo(() => {
        return supplies.filter(supply => {
            const matchesSearch = 
                (supply.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (supply.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (supply.supplier || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesCategory = selectedCategory === 'all' || supply.category === selectedCategory;
            
            const matchesStockStatus = 
                stockStatusFilter === 'all' ? true :
                stockStatusFilter === 'low_stock' ? supply.quantity <= supply.min_stock :
                stockStatusFilter === 'in_stock' ? supply.quantity > supply.min_stock : true;

            const matchesUnit = unitTypeFilter === 'all' || supply.unit === unitTypeFilter;

            return matchesSearch && matchesCategory && matchesStockStatus && matchesUnit;
        });
    }, [supplies, searchTerm, selectedCategory, stockStatusFilter, unitTypeFilter]);

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            {/* Header & Filter Controls */}
            <div className="p-4 sm:p-5 border-b border-stone-200/80 bg-[#FDFBF9] flex flex-col md:flex-row gap-3 items-center justify-between">
                {/* Search Bar */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                    <input
                        type="text"
                        placeholder="Search supplies, SKU, supplier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-stone-200 hover:border-stone-300 rounded-xl text-xs font-semibold placeholder:text-stone-400 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all shadow-2xs"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                {/* Actions & Filters */}
                <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
                    <Link
                        href={route('seller.supply-hub.index')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-bold transition shadow-2xs shrink-0"
                    >
                        <Store size={14} className="text-clay-600" />
                        <span className="hidden sm:inline">Supply Hub</span>
                    </Link>

                    {/* Filter Trigger */}
                    <div className="relative" ref={filterContainerRef}>
                        <button
                            type="button"
                            onClick={() => {
                                if (window.innerWidth < 1024) {
                                    openMobileDrawer();
                                } else {
                                    openDesktopPopover();
                                }
                            }}
                            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-bold transition shadow-2xs shrink-0 cursor-pointer ${
                                activeFiltersCount > 0
                                    ? 'border-clay-300 bg-clay-50/50 text-clay-900'
                                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                            }`}
                        >
                            <Filter size={14} className={activeFiltersCount > 0 ? 'text-clay-700' : 'text-stone-500'} />
                            <span>Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clay-700 text-[10px] font-bold text-white">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        {/* Desktop Popover */}
                        <SuppliesFilterPopover
                            isOpen={isFilterOpen}
                            onClose={() => setIsFilterOpen(false)}
                            draftCategory={draftCategory}
                            setDraftCategory={setDraftCategory}
                            draftStockStatus={draftStockStatus}
                            setDraftStockStatus={setDraftStockStatus}
                            draftUnitType={draftUnitType}
                            setDraftUnitType={setDraftUnitType}
                            categoriesList={categoriesList}
                            availableUnits={availableUnits}
                            draftActiveCount={draftActiveCount}
                            onApply={handleApplyFilters}
                            onReset={handleResetFilters}
                        />
                    </div>

                    {/* Add Supply Action */}
                    {canEditProcurement && (
                        <button
                            type="button"
                            onClick={onOpenAddSupply}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-700 hover:bg-clay-800 active:scale-95 text-white text-xs font-bold transition shadow-md shadow-clay-200 shrink-0 cursor-pointer"
                        >
                            <Plus size={14} />
                            <span>Add Supply</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
                <div className="px-5 py-2.5 bg-stone-50/80 border-b border-stone-150 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">Active Filters:</span>
                    {selectedCategory !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-clay-50 border border-clay-200 text-clay-800 text-[11px] font-bold">
                            Category: {selectedCategory}
                            <button onClick={() => setSelectedCategory('all')} className="hover:text-clay-950"><X size={12} /></button>
                        </span>
                    )}
                    {stockStatusFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                            Status: {stockStatusFilter === 'low_stock' ? 'Low Stock' : 'In Stock'}
                            <button onClick={() => setStockStatusFilter('all')} className="hover:text-amber-950"><X size={12} /></button>
                        </span>
                    )}
                    {unitTypeFilter !== 'all' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200 text-stone-800 text-[11px] font-bold">
                            Unit: {unitTypeFilter}
                            <button onClick={() => setUnitTypeFilter('all')} className="hover:text-stone-950"><X size={12} /></button>
                        </span>
                    )}
                    <button
                        onClick={handleResetFilters}
                        className="text-[11px] font-bold text-stone-500 hover:text-clay-700 underline underline-offset-2 ml-1"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Desktop Table View */}
            <SuppliesDesktopTable
                filteredSupplies={filteredSupplies}
                isNavigating={isNavigating}
                canEditProcurement={canEditProcurement}
                canEditStockRequests={canEditStockRequests}
                onQuickRestock={onQuickRestock}
                onEdit={onEdit}
                onRequestRestock={onRequestRestock}
                onDelete={onDelete}
                onOpenAddSupply={onOpenAddSupply}
            />

            {/* Mobile Cards View */}
            <SuppliesMobileCards
                filteredSupplies={filteredSupplies}
                isNavigating={isNavigating}
                canEditProcurement={canEditProcurement}
                canEditStockRequests={canEditStockRequests}
                onQuickRestock={onQuickRestock}
                onEdit={onEdit}
                onRequestRestock={onRequestRestock}
                onDelete={onDelete}
                onOpenAddSupply={onOpenAddSupply}
            />

            {/* Mobile Filter Drawer */}
            <SlideOverDrawer
                show={isMobileFilterOpen}
                onClose={() => setIsMobileFilterOpen(false)}
                title="Filter Supplies"
                subtitle="Select criteria to narrow down material inventory."
                footer={
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={handleResetFilters}
                            className="inline-flex items-center gap-1 text-xs font-bold text-stone-500 hover:text-stone-800"
                        >
                            <RotateCcw size={13} />
                            <span>Reset All</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyFilters}
                            className="px-6 py-2.5 bg-clay-700 text-white rounded-xl text-xs font-bold shadow-md shadow-clay-200"
                        >
                            Apply Filters
                        </button>
                    </div>
                }
            >
                <div className="space-y-4 py-2">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Category</label>
                        <select
                            value={draftCategory}
                            onChange={(e) => setDraftCategory(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs font-semibold text-stone-800"
                        >
                            <option value="all">All Categories</option>
                            {categoriesList.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Stock Alert Status</label>
                        <select
                            value={draftStockStatus}
                            onChange={(e) => setDraftStockStatus(e.target.value)}
                            className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs font-semibold text-stone-800"
                        >
                            <option value="all">All Stock Levels</option>
                            <option value="low_stock">Low Stock (At or Below Min)</option>
                            <option value="in_stock">In Stock (Sufficient)</option>
                        </select>
                    </div>

                    {availableUnits.length > 0 && (
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">Unit of Measure</label>
                            <select
                                value={draftUnitType}
                                onChange={(e) => setDraftUnitType(e.target.value)}
                                className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs font-semibold text-stone-800"
                            >
                                <option value="all">All Units</option>
                                {availableUnits.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </SlideOverDrawer>
        </div>
    );
}

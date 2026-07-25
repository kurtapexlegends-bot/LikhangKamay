import React, { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Search, X, Filter, ChevronDown, Store, Users, Shield, SlidersHorizontal, RotateCcw } from 'lucide-react';
import Dropdown from '@/Components/Dropdown';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import { roleTabs } from '@/utils/userManagerHelpers';

export default function UserManagerFilters({
    filters = {},
    search = '',
    setSearch,
    handleSearch,
    handleRoleFilter,
    clearSearch,
    quickView,
    setQuickView,
    visibleNestedStaffCount = 0,
    usersTotal = 0,
    deferredSearch = '',
}) {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const popoverRef = useRef(null);

    // Local staged draft filter states
    const [draftStatus, setDraftStatus] = useState(filters.status || 'all');
    const [draftVerification, setDraftVerification] = useState(filters.verification || 'all');
    const [draftStartDate, setDraftStartDate] = useState(filters.start_date || '');
    const [draftEndDate, setDraftEndDate] = useState(filters.end_date || '');

    // Sync draft states whenever popover/drawer opens or props change
    useEffect(() => {
        if (isPopoverOpen || isDrawerOpen) {
            setDraftStatus(filters.status || 'all');
            setDraftVerification(filters.verification || 'all');
            setDraftStartDate(filters.start_date || '');
            setDraftEndDate(filters.end_date || '');
        }
    }, [isPopoverOpen, isDrawerOpen, filters.status, filters.verification, filters.start_date, filters.end_date]);

    // Handle outside clicks to close desktop popover
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
        setDraftStatus(filters.status || 'all');
        setDraftVerification(filters.verification || 'all');
        setDraftStartDate(filters.start_date || '');
        setDraftEndDate(filters.end_date || '');

        if (window.innerWidth < 1024) {
            setIsDrawerOpen(true);
        } else {
            setIsPopoverOpen((prev) => !prev);
        }
    };

    const applyDraftFilters = () => {
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        router.get(
            route('admin.users.manager'),
            {
                search: search.trim(),
                role: filters.role || 'all',
                status: draftStatus,
                verification: draftVerification,
                start_date: draftStartDate,
                end_date: draftEndDate,
                tab: 'directory',
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const resetFilters = () => {
        setDraftStatus('all');
        setDraftVerification('all');
        setDraftStartDate('');
        setDraftEndDate('');
        setIsPopoverOpen(false);
        setIsDrawerOpen(false);

        router.get(
            route('admin.users.manager'),
            {
                search: search.trim(),
                role: filters.role || 'all',
                status: 'all',
                verification: 'all',
                start_date: '',
                end_date: '',
                tab: 'directory',
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const activeFiltersCount = [
        filters.status && filters.status !== 'all',
        filters.verification && filters.verification !== 'all',
        !!filters.start_date,
        !!filters.end_date,
    ].filter(Boolean).length;

    const draftActiveCount = [
        draftStatus && draftStatus !== 'all',
        draftVerification && draftVerification !== 'all',
        !!draftStartDate,
        !!draftEndDate,
    ].filter(Boolean).length;

    const filterFieldsGrid = (
        <div className="space-y-4">
            {/* 1. Date Range Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Registration Date Range
                </label>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">From</span>
                        <input
                            type="date"
                            value={draftStartDate}
                            onChange={(e) => setDraftStartDate(e.target.value)}
                            className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </label>
                    <div className="h-full w-px bg-stone-200 shrink-0"></div>
                    <label className="flex flex-1 h-full items-center gap-2 px-3 hover:bg-stone-50 transition cursor-pointer min-h-[42px]">
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 shrink-0">To</span>
                        <input
                            type="date"
                            value={draftEndDate}
                            onChange={(e) => setDraftEndDate(e.target.value)}
                            className="flex-1 w-full bg-transparent text-xs font-bold text-stone-700 border-none outline-none focus:ring-0 p-0"
                        />
                    </label>
                </div>
            </div>

            {/* 2. Account Status Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Account Status
                </label>
                <div className="relative">
                    <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Account Statuses</option>
                        <option value="active">Active Accounts</option>
                        <option value="suspended">Suspended / Banned Accounts</option>
                        <option value="pending_artisan">Pending Artisan Applications</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>

            {/* 3. Email Verification Status */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Email Verification Status
                </label>
                <div className="relative">
                    <select
                        value={draftVerification}
                        onChange={(e) => setDraftVerification(e.target.value)}
                        className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                    >
                        <option value="all">All Verification States</option>
                        <option value="verified">Email Verified Accounts</option>
                        <option value="unverified">Pending Email Verification</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <div className="border-b border-stone-200 bg-white rounded-xl shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        {/* Role filter tab segment - scrollable on mobile */}
                        <div className="flex w-full lg:w-auto items-center overflow-x-auto flex-nowrap no-scrollbar bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
                            {roleTabs.map((role) => (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => handleRoleFilter(role)}
                                    className={`relative flex items-center justify-center gap-1.5 whitespace-nowrap px-4 py-2.5 min-h-[44px] text-xs font-bold transition-all rounded-lg ${
                                        filters.role === role
                                            ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-900/5'
                                            : 'text-stone-500 hover:text-stone-700 hover:bg-stone-200/50'
                                    }`}
                                >
                                    {role === 'all' && 'All'}
                                    {role === 'artisan' && <><Store size={14} /> Artisans</>}
                                    {role === 'buyer' && <><Users size={14} /> Buyers</>}
                                    {role === 'super_admin' && <><Shield size={14} /> Admins</>}
                                </button>
                            ))}
                        </div>

                        {/* Search + Standardized Filter Button on the Right */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                            {/* Search input */}
                            <form onSubmit={handleSearch} className="relative flex-1 sm:w-80">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search name, shop, email, or connected staff..."
                                    className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-10 text-xs font-medium text-stone-900 placeholder-stone-400 transition-all focus:border-clay-300 focus:bg-white focus:ring-2 focus:ring-clay-500/20 min-h-[42px]"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={clearSearch}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 transition-colors hover:text-stone-700 min-h-[42px] min-w-[42px] flex items-center justify-center"
                                        aria-label="Clear account search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </form>

                            {/* Standardized Filter Popover Button */}
                            <div className="relative inline-block text-left" ref={popoverRef}>
                                <button
                                    type="button"
                                    onClick={handleOpenFilters}
                                    className={`inline-flex h-[42px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition-all shadow-sm active:scale-95 ${
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
                                    <div className="hidden lg:block absolute right-0 z-[100] mt-2 w-[420px] rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-150">
                                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                                            <div className="flex items-center gap-2">
                                                <Filter size={15} className="text-clay-700" />
                                                <h3 className="text-sm font-bold text-stone-900">Filter User Directory</h3>
                                            </div>
                                            {draftActiveCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDraftStatus('all');
                                                        setDraftVerification('all');
                                                        setDraftStartDate('');
                                                        setDraftEndDate('');
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-clay-700 transition"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>Reset Selection</span>
                                                </button>
                                            )}
                                        </div>

                                        {filterFieldsGrid}

                                        <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between">
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
                </div>
            </div>

            {/* Active Filter Tag Pills */}
            {activeFiltersCount > 0 && (
                <div className="flex flex-wrap items-center gap-2 px-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mr-1">
                        Active Filters:
                    </span>
                    {filters.status && filters.status !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Status: {filters.status === 'active' ? 'Active Accounts' : filters.status === 'suspended' ? 'Suspended / Banned' : 'Pending Artisan'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setDraftStatus('all');
                                    router.get(
                                        route('admin.users.manager'),
                                        { search: search.trim(), role: filters.role || 'all', status: 'all', verification: filters.verification || 'all', start_date: filters.start_date || '', end_date: filters.end_date || '', tab: 'directory' },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {filters.verification && filters.verification !== 'all' && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>Verification: {filters.verification === 'verified' ? 'Email Verified' : 'Pending Verification'}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setDraftVerification('all');
                                    router.get(
                                        route('admin.users.manager'),
                                        { search: search.trim(), role: filters.role || 'all', status: filters.status || 'all', verification: 'all', start_date: filters.start_date || '', end_date: filters.end_date || '', tab: 'directory' },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {filters.start_date && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>From: {filters.start_date}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setDraftStartDate('');
                                    router.get(
                                        route('admin.users.manager'),
                                        { search: search.trim(), role: filters.role || 'all', status: filters.status || 'all', verification: filters.verification || 'all', start_date: '', end_date: filters.end_date || '', tab: 'directory' },
                                        { preserveState: true, preserveScroll: true }
                                    );
                                }}
                                className="rounded-full p-0.5 hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        </span>
                    )}
                    {filters.end_date && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold text-stone-700 shadow-sm">
                            <span>To: {filters.end_date}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    setDraftEndDate('');
                                    router.get(
                                        route('admin.users.manager'),
                                        { search: search.trim(), role: filters.role || 'all', status: filters.status || 'all', verification: filters.verification || 'all', start_date: filters.start_date || '', end_date: '', tab: 'directory' },
                                        { preserveState: true, preserveScroll: true }
                                    );
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
                title="Filter User Directory"
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
        </div>
    );
}

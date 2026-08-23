import React, { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import FilterToolbarHeader from '@/Components/Seller/Shared/FilterToolbarHeader';
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
    // Local staged draft filter states
    const [draftStatus, setDraftStatus] = useState(filters.status || 'all');
    const [draftVerification, setDraftVerification] = useState(filters.verification || 'all');
    const [draftStartDate, setDraftStartDate] = useState(filters.start_date || '');
    const [draftEndDate, setDraftEndDate] = useState(filters.end_date || '');

    // Sync draft states whenever props change
    useEffect(() => {
        setDraftStatus(filters.status || 'all');
        setDraftVerification(filters.verification || 'all');
        setDraftStartDate(filters.start_date || '');
        setDraftEndDate(filters.end_date || '');
    }, [filters.status, filters.verification, filters.start_date, filters.end_date]);

    const applyDraftFilters = () => {
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

    const filterPopoverFields = (
        <div className="space-y-4">
            {/* 1. Date Range Filter */}
            <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                    Registration Date Range
                </label>
                <div className="flex items-center bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden focus-within:ring-2 focus-within:ring-clay-100 focus-within:border-clay-500 transition-all h-[42px]">
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

    const activeFilterTags = useMemo(() => {
        const tags = [];
        if (filters.status && filters.status !== 'all') {
            tags.push({
                label: `Status: ${filters.status === 'active' ? 'Active' : filters.status === 'suspended' ? 'Suspended / Banned' : 'Pending Artisan'}`,
                onRemove: () => {
                    setDraftStatus('all');
                    router.get(
                        route('admin.users.manager'),
                        { search: search.trim(), role: filters.role || 'all', status: 'all', verification: filters.verification || 'all', start_date: filters.start_date || '', end_date: filters.end_date || '', tab: 'directory' },
                        { preserveState: true, preserveScroll: true }
                    );
                }
            });
        }
        if (filters.verification && filters.verification !== 'all') {
            tags.push({
                label: `Verification: ${filters.verification === 'verified' ? 'Email Verified' : 'Pending Verification'}`,
                onRemove: () => {
                    setDraftVerification('all');
                    router.get(
                        route('admin.users.manager'),
                        { search: search.trim(), role: filters.role || 'all', status: filters.status || 'all', verification: 'all', start_date: filters.start_date || '', end_date: filters.end_date || '', tab: 'directory' },
                        { preserveState: true, preserveScroll: true }
                    );
                }
            });
        }
        if (filters.start_date) {
            tags.push({
                label: `From: ${filters.start_date}`,
                onRemove: () => {
                    setDraftStartDate('');
                    router.get(
                        route('admin.users.manager'),
                        { search: search.trim(), role: filters.role || 'all', status: filters.status || 'all', verification: filters.verification || 'all', start_date: '', end_date: filters.end_date || '', tab: 'directory' },
                        { preserveState: true, preserveScroll: true }
                    );
                }
            });
        }
        if (filters.end_date) {
            tags.push({
                label: `To: ${filters.end_date}`,
                onRemove: () => {
                    setDraftEndDate('');
                    router.get(
                        route('admin.users.manager'),
                        { search: search.trim(), role: filters.role || 'all', status: filters.status || 'all', verification: filters.verification || 'all', start_date: filters.start_date || '', end_date: '', tab: 'directory' },
                        { preserveState: true, preserveScroll: true }
                    );
                }
            });
        }
        return tags;
    }, [filters, search]);

    const formattedTabs = roleTabs.map((role) => ({
        key: role,
        label: role === 'all' ? 'All' : role === 'artisan' ? 'Artisans' : role === 'buyer' ? 'Buyers' : 'Admins',
    }));

    return (
        <FilterToolbarHeader
            tabs={formattedTabs}
            activeTab={filters.role || 'all'}
            onTabChange={handleRoleFilter}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search name, shop, email, or connected staff..."
            activeFiltersCount={activeFiltersCount}
            filterPopoverTitle="Filter User Directory"
            filterPopoverFields={filterPopoverFields}
            onApplyFilters={applyDraftFilters}
            onResetFilters={resetFilters}
            activeFilterTags={activeFilterTags}
        />
    );
}

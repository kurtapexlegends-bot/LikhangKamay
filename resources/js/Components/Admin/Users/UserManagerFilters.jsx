import React from 'react';
import { Search, X, Filter, ChevronDown, Store, Users, Shield } from 'lucide-react';
import Dropdown from '@/Components/Dropdown';
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
    return (
        <div className="space-y-6">
            <div className="z-30 border-b border-stone-200 bg-white rounded-xl shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        {/* Role filter tab segment - scrollable on mobile */}
                        <div className="flex w-full sm:w-auto items-center overflow-x-auto flex-nowrap no-scrollbar bg-stone-100/80 p-1 rounded-xl border border-stone-200/60">
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

                        {/* Search input */}
                        <form onSubmit={handleSearch} className="relative w-full sm:w-80 flex-shrink-0">
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search name, shop, email, or connected staff..."
                                className="w-full rounded-full border border-stone-200 bg-stone-50 py-3 pl-10 pr-10 text-sm font-medium text-stone-900 placeholder-stone-400 transition-all focus:border-clay-300 focus:bg-white focus:ring-2 focus:ring-clay-500/20 min-h-[44px]"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded p-1 text-stone-400 transition-colors hover:text-stone-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    aria-label="Clear account search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white shadow-sm px-4 py-3 sm:px-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-stone-900">Platform Accounts</p>
                        <p className="text-xs font-medium text-stone-500">
                            Staff accounts stay grouped under their parent shop rows.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[12px] font-bold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-300 min-h-[44px]"
                                >
                                    <Filter size={14} className="text-stone-400" />
                                    Filter: {
                                        quickView === 'all' 
                                            ? 'All visible' 
                                            : quickView === 'artisan_staff' 
                                                ? 'Shops with staff' 
                                                : quickView === 'buyer_unverified' 
                                                    ? 'Buyer email pending' 
                                                    : 'Workspace attention'
                                    }
                                    <ChevronDown size={14} className="ml-1 text-stone-400" />
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content align="right" width="56">
                                <button onClick={() => setQuickView('all')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'all' ? 'bg-clay-50 text-clay-700 font-bold' : 'text-stone-600 font-bold hover:bg-stone-50'}`}>
                                    All visible
                                </button>
                                <button onClick={() => setQuickView('artisan_staff')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'artisan_staff' ? 'bg-[#F2EAE1] text-[#7A5037] font-bold' : 'text-stone-600 font-bold hover:bg-stone-50'}`}>
                                    Shops with staff
                                </button>
                                <button onClick={() => setQuickView('buyer_unverified')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'buyer_unverified' ? 'bg-amber-50 text-amber-700 font-bold' : 'text-stone-600 font-bold hover:bg-stone-50'}`}>
                                    Buyer email pending
                                </button>
                                <button onClick={() => setQuickView('workspace_attention')} className={`block w-full px-4 py-2.5 text-left text-[13px] transition ${quickView === 'workspace_attention' ? 'bg-red-50 text-red-700 font-bold' : 'text-stone-600 font-bold hover:bg-stone-50'}`}>
                                    Workspace attention
                                </button>
                            </Dropdown.Content>
                        </Dropdown>
                        {visibleNestedStaffCount > 0 && (
                            <span className="inline-flex items-center rounded-md bg-[#F2EAE1] border border-[#E8D9CB] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7A5037]">
                                {visibleNestedStaffCount} visible staff
                            </span>
                        )}
                        <span className="inline-flex items-center rounded-md bg-stone-100 border border-stone-200 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                            {usersTotal} total accounts
                        </span>
                        {deferredSearch.trim() !== search.trim() && (
                            <span className="inline-flex items-center rounded-md bg-clay-50 border border-clay-100 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-clay-700 animate-pulse">
                                Search pending...
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

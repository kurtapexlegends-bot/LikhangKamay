import React from 'react';
import { Search, Command, Users, FolderTree, ShieldAlert, Shield, Box, ShoppingBag } from 'lucide-react';
import { getSafeRoute, getResultIcon } from './globalSearchData';

export default function GlobalSearchDesktopDropdown({
    isOpen,
    dropdownRef,
    isLoading,
    displayResults = [],
    isCommandMode,
    query,
    activeIndex,
    setActiveIndex,
    handleNavigate,
    showAdminShortcuts,
    visibleModules = [],
}) {
    if (!isOpen) return null;

    return (
        <div className="hidden md:block absolute top-full left-0 right-0 mt-2 z-[70] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-stone-900/10 animate-in slide-in-from-top-2 fade-in duration-150">
            <div ref={dropdownRef} className="max-h-[60vh] overflow-y-auto p-2">
                {isLoading ? (
                    <div className="p-2 space-y-2">
                        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Searching platform records...</p>
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2 animate-pulse">
                                <div className="h-8 w-8 rounded-lg bg-stone-100" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3 w-1/3 bg-stone-100 rounded" />
                                    <div className="h-2 w-1/2 bg-stone-100 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : displayResults.length > 0 ? (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                            <span>{isCommandMode ? 'Command Shortcuts' : 'Search Results'}</span>
                            <span className="text-stone-500 font-mono font-bold">{displayResults.length} match{displayResults.length === 1 ? '' : 'es'}</span>
                        </div>
                        {displayResults.map((result, index) => (
                            <button
                                id={`search-result-${index}`}
                                key={isCommandMode ? result.cmd : `${result.type}-${result.id}-${index}`}
                                onClick={() => handleNavigate(result.url)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={`group/item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                                    activeIndex === index 
                                        ? (isCommandMode ? 'bg-indigo-50/70' : 'bg-clay-50/80') 
                                        : 'hover:bg-stone-50'
                                }`}
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                                    activeIndex === index 
                                        ? (isCommandMode ? `${result.color} border-indigo-200` : 'bg-white border-clay-200 text-clay-600') 
                                        : (isCommandMode ? `${result.color} border-transparent opacity-80` : 'bg-stone-50 border-stone-100 text-stone-500')
                                }`}>
                                    {isCommandMode ? <result.icon size={15} /> : getResultIcon(result.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`truncate text-xs font-bold ${activeIndex === index ? 'text-stone-900' : 'text-stone-700'}`}>
                                            {isCommandMode ? result.label : result.title}
                                        </span>
                                        {!isCommandMode && (
                                            <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-600">
                                                {result.type?.replace('_', ' ')}
                                            </span>
                                        )}
                                        {isCommandMode && (
                                            <span className="shrink-0 rounded-md bg-white border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                                                Shortcut
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-[11px] font-medium text-stone-400 mt-0.5">
                                        {isCommandMode ? result.cmd : result.subtitle}
                                    </p>
                                </div>
                                {activeIndex === index && (
                                    <div className="shrink-0">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${isCommandMode ? 'bg-indigo-600 text-white' : 'bg-clay-600 text-white'}`}>
                                            {isCommandMode ? 'Execute' : 'Open'}
                                            <Command size={10} />
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                ) : query.trim().length >= (isCommandMode ? 1 : 2) ? (
                    <div className="px-4 py-8 text-center">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-50 text-stone-300 mb-2">
                            {isCommandMode ? <Command size={18} /> : <Search size={18} />}
                        </div>
                        <p className="text-xs font-bold text-stone-800">No {isCommandMode ? 'commands' : 'matching records'} found</p>
                        <p className="text-[11px] font-medium text-stone-400 mt-0.5">Check for typos or try searching with broader keywords.</p>
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">Quick Access</h3>
                        <div className="grid grid-cols-1 gap-1">
                            {(showAdminShortcuts ? [
                                { label: 'User Directory & Approvals', sub: 'Manage user profiles, accounts, and artisan vetting.', icon: Users, color: 'text-indigo-600 bg-indigo-50', url: getSafeRoute('admin.users.manager') },
                                { label: 'Catalog & Categories', sub: 'Inspect product listings, flags, and store categories.', icon: FolderTree, color: 'text-rose-600 bg-rose-50', url: getSafeRoute('admin.catalog.index') },
                                { label: 'Disputes & Compliance', sub: 'Order disputes, review reports, and moderation queue.', icon: ShieldAlert, color: 'text-red-600 bg-red-50', url: getSafeRoute('admin.compliance') },
                                { label: 'Platform Operations & Logs', sub: 'System health, activity history, and server cache.', icon: Shield, color: 'text-clay-600 bg-clay-50', url: getSafeRoute('admin.operations') },
                            ] : [
                                { label: 'Products & Discounts', sub: 'Manage catalog items, prices, 3D assets, and promos.', icon: Box, color: 'text-rose-600 bg-rose-50', modules: ['products'], url: getSafeRoute('products.index') },
                                { label: 'Orders & Fulfillment', sub: 'Process customer shipments, receipts, and returns.', icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50', modules: ['orders'], url: getSafeRoute('orders.index') },
                                { label: 'Materials & Stock', sub: 'Raw supplies, product recipes, and restock requests.', icon: Box, color: 'text-blue-600 bg-blue-50', modules: ['procurement', 'stock_requests'], url: getSafeRoute('procurement.index') },
                                { label: 'HR & Payroll Ledger', sub: 'Manage team roster, work shifts, and salary runs.', icon: Users, color: 'text-purple-600 bg-purple-50', modules: ['hr', 'accounting'], url: getSafeRoute('hr.index') },
                            ].filter(tip => !tip.modules || tip.modules.some(m => visibleModules.includes(m)))).map((tip, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleNavigate(tip.url)}
                                    className="group flex w-full items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left transition cursor-pointer"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tip.color}`}>
                                        <tip.icon size={15} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-stone-800">{tip.label}</p>
                                        <p className="text-[10px] text-stone-400 truncate">{tip.sub}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Help Bar */}
            <div className="border-t border-stone-100 bg-stone-50/90 px-3.5 py-2 flex items-center justify-between text-[10px] font-bold text-stone-400">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">ENTER</kbd>
                        <span>Select</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">↑</kbd>
                        <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">↓</kbd>
                        <span>Navigate</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">ESC</kbd>
                        <span>Close</span>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span>Type</span>
                    <span className="text-indigo-600 font-mono font-black px-1 py-0.2 bg-indigo-50 border border-indigo-100 rounded">&gt;</span>
                    <span>for shortcuts</span>
                </div>
            </div>
        </div>
    );
}

import React from 'react';
import { Search, Loader2, X, Users, Award, FolderTree, Box, ShoppingBag } from 'lucide-react';
import { getSafeRoute, getResultIcon } from './globalSearchData';

export default function GlobalSearchMobileOverlay({
    isOpen,
    setIsOpen,
    mobileInputRef,
    query,
    setQuery,
    setActiveIndex,
    onKeyDown,
    isLoading,
    isCommandMode,
    effectiveScope,
    displayResults = [],
    handleNavigate,
    showAdminShortcuts,
}) {
    if (!isOpen) return null;

    return (
        <div className="md:hidden fixed inset-x-0 top-0 z-[120] bg-white/98 backdrop-blur-xl border-b border-stone-200 p-3 shadow-2xl animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1 flex items-center">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-clay-600" size={16} />
                    <input
                        ref={mobileInputRef}
                        type="text"
                        placeholder={isCommandMode ? "Type a command..." : effectiveScope === 'admin' ? "Search admin records or type '>'..." : effectiveScope === 'seller' ? "Search store records or type '>'..." : "Search platform..."}
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 pl-9 pr-9 py-2 text-xs font-semibold text-stone-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-clay-500/20 focus:border-clay-400"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setActiveIndex(-1);
                        }}
                        onKeyDown={onKeyDown}
                    />
                    {isLoading ? (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-clay-500" size={14} />
                    ) : query ? (
                        <button 
                            type="button"
                            onClick={() => setQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-stone-400 hover:text-stone-600"
                        >
                            <X size={14} />
                        </button>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl bg-stone-100 active:scale-95 shrink-0"
                >
                    Cancel
                </button>
            </div>

            {/* Mobile Results */}
            <div className="max-h-[70vh] overflow-y-auto pt-1 pb-2">
                {displayResults.length > 0 ? (
                    <div className="space-y-1">
                        {displayResults.map((result, index) => (
                            <button
                                key={isCommandMode ? result.cmd : `${result.type}-${result.id}-${index}`}
                                onClick={() => handleNavigate(result.url)}
                                className="group/item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition active:bg-clay-50 hover:bg-stone-50"
                            >
                                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                    isCommandMode ? `${result.color} border-indigo-200` : 'bg-stone-50 border-stone-100 text-stone-600'
                                }`}>
                                    {isCommandMode ? <result.icon size={16} /> : getResultIcon(result.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-bold text-stone-900">
                                        {isCommandMode ? result.label : result.title}
                                    </p>
                                    <p className="truncate text-[10px] font-medium text-stone-400 mt-0.5">
                                        {isCommandMode ? result.cmd : result.subtitle}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : query.trim().length >= 2 ? (
                    <div className="p-6 text-center">
                        <p className="text-xs font-bold text-stone-900">No results found</p>
                        <p className="text-[11px] text-stone-400 mt-1">Try a different search term.</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-2">
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">Quick Shortcuts</p>
                        <div className="grid grid-cols-1 gap-1">
                            {(showAdminShortcuts ? [
                                { label: 'User Directory', url: getSafeRoute('admin.users.manager'), icon: Users },
                                { label: 'Artisan Approvals', url: getSafeRoute('admin.users.manager', { tab: 'approvals' }), icon: Award },
                                { label: 'Catalog Moderation', url: getSafeRoute('admin.catalog.index'), icon: FolderTree },
                            ] : [
                                { label: 'Product Catalog', url: getSafeRoute('products.index'), icon: Box },
                                { label: 'Order Manager', url: getSafeRoute('orders.index'), icon: ShoppingBag },
                                { label: 'HR Directory', url: getSafeRoute('hr.index'), icon: Users },
                            ]).map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleNavigate(item.url)}
                                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left active:scale-98"
                                >
                                    <item.icon size={15} className="text-clay-600" />
                                    <span className="text-xs font-bold text-stone-800">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

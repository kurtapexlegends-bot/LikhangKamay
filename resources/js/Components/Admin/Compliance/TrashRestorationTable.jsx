import React, { useState, useMemo } from 'react';
import { Search, X, History, Package, FolderTree, ShoppingBag, RotateCcw, Trash2, Clock } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function TrashRestorationTable({
    trashQueue = [],
    setConfirmingRestore,
    setConfirmingDelete
}) {
    const [trashSearch, setTrashSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    const filteredTrashQueue = useMemo(() => {
        const query = trashSearch.trim().toLowerCase();
        return trashQueue.filter(item => {
            if (typeFilter !== 'all' && item.type !== typeFilter) return false;
            if (!query) return true;
            return (
                String(item.name || '').toLowerCase().includes(query) ||
                String(item.type || '').toLowerCase().includes(query) ||
                String(item.context || '').toLowerCase().includes(query)
            );
        });
    }, [trashQueue, trashSearch, typeFilter]);

    const getDaysRemaining = (expiresAt) => {
        if (!expiresAt) return 0;
        return Math.max(0, Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24)));
    };

    const getDaysBadgeClass = (days) => {
        if (days > 14) return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
        if (days >= 7) return 'bg-amber-50 text-amber-800 border-amber-200/80';
        return 'bg-rose-50 text-rose-800 border-rose-200/80 animate-pulse';
    };

    const getTypeBadgeClass = (type) => {
        switch (type) {
            case 'Product': return 'bg-clay-50 text-clay-800 border-clay-200/80';
            case 'Category': return 'bg-indigo-50 text-indigo-800 border-indigo-200/80';
            case 'Order': return 'bg-amber-50 text-amber-800 border-amber-200/80';
            default: return 'bg-stone-50 text-stone-700 border-stone-200/80';
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-2xs">
            {/* Header & Toolbar */}
            <div className="p-4 sm:p-5 border-b border-stone-100 bg-[#FCFBF9] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                        <History size={16} className="text-clay-700" />
                        Restoration Center (Trash Queue)
                    </h3>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">
                        Deleted items are held for 30 days before permanent automatic purge.
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Search deleted items..."
                            value={trashSearch}
                            onChange={(e) => setTrashSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500 shadow-2xs h-[38px]"
                        />
                        {trashSearch && (
                            <button
                                type="button"
                                onClick={() => setTrashSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 border-b border-stone-100 px-4 py-2.5 sm:px-6 bg-white overflow-x-auto scrollbar-hide">
                {['all', 'Product', 'Category', 'Order'].map((type) => (
                    <button
                        key={type}
                        type="button"
                        onClick={() => setTypeFilter(type)}
                        className={`rounded-lg px-3 py-1 text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                            typeFilter === type
                                ? 'bg-clay-700 text-white shadow-2xs'
                                : 'bg-stone-50 border border-stone-200/80 text-stone-600 hover:bg-stone-100'
                        }`}
                    >
                        {type === 'all' ? 'All Types' : `${type}s`}
                    </button>
                ))}

                {(typeFilter !== 'all' || trashSearch) && (
                    <button
                        type="button"
                        onClick={() => {
                            setTypeFilter('all');
                            setTrashSearch('');
                        }}
                        className="ml-auto rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-bold text-stone-500 hover:bg-stone-50 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                        Reset
                    </button>
                )}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto w-full hidden md:block">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-[#FCFBF9]/60 border-b border-stone-100">
                            <th className="px-6 py-3.5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Item Type</th>
                            <th className="px-6 py-3.5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Name / Identifier</th>
                            <th className="px-6 py-3.5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Deleted By / Context</th>
                            <th className="px-6 py-3.5 text-[10px] font-black text-stone-400 uppercase tracking-widest">Time Remaining</th>
                            <th className="px-6 py-3.5 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {filteredTrashQueue.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-14 text-center bg-white">
                                    <WorkspaceEmptyState
                                        icon={History}
                                        title="Trash queue is empty"
                                        description="Deleted items that are pending permanent deletion will appear here."
                                    />
                                </td>
                            </tr>
                        ) : (
                            filteredTrashQueue.map((item) => {
                                const daysLeft = getDaysRemaining(item.expires_at);

                                return (
                                    <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getTypeBadgeClass(item.type)}`}>
                                                {item.type === 'Product' && <Package size={10} />}
                                                {item.type === 'Category' && <FolderTree size={10} />}
                                                {item.type === 'Order' && <ShoppingBag size={10} />}
                                                {item.type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold text-stone-900">{item.name}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-medium text-stone-500">{item.context}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${getDaysBadgeClass(daysLeft)}`}>
                                                    <Clock size={10} />
                                                    {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                                                </span>
                                                <span className="text-[10px] text-stone-400 font-medium">
                                                    (Purges {new Date(item.expires_at).toLocaleDateString()})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmingRestore(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200/70 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition shadow-2xs cursor-pointer"
                                                    title="Restore Item"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>Restore</span>
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => setConfirmingDelete(item)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-stone-200 text-stone-500 rounded-lg text-xs font-bold hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition shadow-2xs cursor-pointer"
                                                    title="Permanently Delete"
                                                >
                                                    <Trash2 size={12} />
                                                    <span className="hidden lg:inline">Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden divide-y divide-stone-100 bg-white">
                {filteredTrashQueue.length === 0 ? (
                    <div className="px-6 py-12 text-center bg-white">
                        <WorkspaceEmptyState
                            icon={History}
                            title="Trash queue is empty"
                            description="Deleted items that are pending permanent deletion will appear here."
                        />
                    </div>
                ) : (
                    filteredTrashQueue.map((item) => {
                        const daysLeft = getDaysRemaining(item.expires_at);

                        return (
                            <div key={`${item.type}-${item.id}`} className="p-4 space-y-3 hover:bg-stone-50/50 transition-colors">
                                {/* Card Header Row: Badge & Days Left */}
                                <div className="flex items-center justify-between">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${getTypeBadgeClass(item.type)}`}>
                                        {item.type === 'Product' && <Package size={10} />}
                                        {item.type === 'Category' && <FolderTree size={10} />}
                                        {item.type === 'Order' && <ShoppingBag size={10} />}
                                        {item.type}
                                    </div>
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${getDaysBadgeClass(daysLeft)}`}>
                                        <Clock size={10} />
                                        {daysLeft} days left
                                    </span>
                                </div>

                                {/* Card Content: Name and Deletion Context */}
                                <div>
                                    <h4 className="text-xs font-bold text-stone-900 leading-snug">{item.name}</h4>
                                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">{item.context}</p>
                                    <p className="text-[9px] text-stone-400 font-medium mt-0.5">Purges: {new Date(item.expires_at).toLocaleDateString()}</p>
                                </div>

                                {/* Card Footer Actions Row */}
                                <div className="flex items-center gap-2 pt-1">
                                    <button 
                                        type="button"
                                        onClick={() => setConfirmingRestore(item)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-50 border border-indigo-200/70 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition min-h-[40px] cursor-pointer"
                                    >
                                        <RotateCcw size={14} /> Restore
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setConfirmingDelete(item)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-stone-200 text-stone-600 rounded-xl font-bold text-xs hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition min-h-[40px] cursor-pointer"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}


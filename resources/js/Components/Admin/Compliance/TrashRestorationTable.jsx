import React, { useState, useMemo } from 'react';
import { Search, History, Package, FolderTree, ShoppingBag, RotateCcw, Trash2 } from 'lucide-react';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

export default function TrashRestorationTable({
    trashQueue = [],
    setConfirmingRestore,
    setConfirmingDelete
}) {
    const [trashSearch, setTrashSearch] = useState('');

    const filteredTrashQueue = useMemo(() => {
        const query = trashSearch.trim().toLowerCase();
        if (!query) return trashQueue;
        return trashQueue.filter(item => 
            String(item.name || '').toLowerCase().includes(query) ||
            String(item.type || '').toLowerCase().includes(query) ||
            String(item.context || '').toLowerCase().includes(query)
        );
    }, [trashQueue, trashSearch]);

    return (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-sm sm:text-base font-bold text-stone-900">Restoration Center (Trash Queue)</h3>
                    <p className="text-xs text-stone-500 font-medium mt-0.5">Deleted items are held for 30 days before permanent removal</p>
                </div>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={15} />
                    <input 
                        type="text" 
                        placeholder="Search deleted items..."
                        value={trashSearch}
                        onChange={(e) => setTrashSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:border-clay-300 focus:ring-0 shadow-sm w-full min-h-[44px] sm:min-h-0"
                    />
                </div>
            </div>

            <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="bg-stone-50/50">
                            <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Item Type</th>
                            <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Name / Identifier</th>
                            <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Deleted By / Context</th>
                            <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest border-b border-stone-100">Auto-Purge In</th>
                            <th className="px-8 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right border-b border-stone-100">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {filteredTrashQueue.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-8 py-16 text-center bg-white">
                                    <WorkspaceEmptyState
                                        icon={History}
                                        title="Trash queue is empty"
                                        description="Deleted items that are pending permanent deletion will appear here."
                                    />
                                </td>
                            </tr>
                        ) : (
                            filteredTrashQueue.map((item) => (
                                <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                    <td className="px-8 py-5">
                                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                            item.type === 'Product' ? 'bg-clay-50 text-clay-700' :
                                            item.type === 'Category' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                                        }`}>
                                            {item.type === 'Product' && <Package size={10} />}
                                            {item.type === 'Category' && <FolderTree size={10} />}
                                            {item.type === 'Order' && <ShoppingBag size={10} />}
                                            {item.type}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-bold text-stone-900">{item.name}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className="text-xs font-medium text-stone-500 italic">{item.context}</span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-mono font-bold text-stone-700">
                                                {Math.max(0, Math.ceil((new Date(item.expires_at) - new Date()) / (1000 * 60 * 60 * 24)))} Days
                                            </span>
                                            <span className="text-[9px] text-stone-400 font-medium">Expires: {new Date(item.expires_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setConfirmingRestore(item)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Restore Item"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button 
                                                onClick={() => setConfirmingDelete(item)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                                                title="Permanently Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

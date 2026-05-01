import React from 'react';
import { X } from 'lucide-react';

export default function BulkActionPill({ selectedCount, onClear, children }) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
            <div className="flex items-center gap-3 rounded-full bg-stone-900/95 backdrop-blur-md px-4 py-2.5 shadow-2xl border border-stone-700/50">
                <div className="flex items-center gap-2 pr-3 border-r border-stone-700">
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white text-[10px] font-bold text-stone-900 px-1">
                        {selectedCount}
                    </span>
                    <span className="text-xs font-bold tracking-wide text-white uppercase">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                    {children}
                </div>
                <button
                    onClick={onClear}
                    className="ml-1 rounded-full p-1.5 text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
                    title="Clear selection"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
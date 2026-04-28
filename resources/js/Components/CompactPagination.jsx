import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function CompactPagination({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    itemsPerPage = 10,
    onPageChange,
    itemLabel = 'items',
    className = '',
}) {
    if (totalPages <= 1 || totalItems <= 0) {
        return null;
    }

    const from = (currentPage - 1) * itemsPerPage + 1;
    const to = Math.min(currentPage * itemsPerPage, totalItems);

    return (
        <div className={`flex flex-col gap-4 border-t border-stone-100 bg-stone-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
            <span className="text-sm font-medium text-stone-500 whitespace-nowrap">
                Showing <span className="font-bold text-stone-900">{from}</span> to <span className="font-bold text-stone-900">{to}</span> of <span className="font-bold text-stone-900">{totalItems}</span> {itemLabel}
            </span>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0" style={{ scrollbarWidth: 'none' }}>
                <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="shrink-0 rounded-xl border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition-all duration-300 hover:bg-stone-50 hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                    <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, index) => {
                        const page = index + 1;

                        return (
                            <button
                                key={page}
                                type="button"
                                onClick={() => onPageChange(page)}
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
                                    currentPage === page
                                        ? 'bg-clay-600 text-white shadow-md shadow-clay-500/20'
                                        : 'border border-stone-200 bg-white text-stone-600 shadow-sm hover:bg-stone-50'
                                }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="shrink-0 rounded-xl border border-stone-200 bg-white p-2 text-stone-500 shadow-sm transition-all duration-300 hover:bg-stone-50 hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

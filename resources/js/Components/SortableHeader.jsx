import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * A reusable table header component that supports sorting.
 * 
 * @param {string} label - The display name of the header.
 * @param {string} sortKey - The key to sort by in the data.
 * @param {Object} currentSort - The current sort state { key, direction }.
 * @param {Function} onSort - Callback function to handle sort changes.
 * @param {string} className - Additional classes for the <th> element.
 */
const SortableHeader = ({ label, sortKey, currentSort, onSort, className = "" }) => {
    const isSorted = currentSort.key === sortKey;
    const isAsc = currentSort.direction === "asc";

    return (
        <th
            className={`px-6 py-4 cursor-pointer hover:bg-gray-50 transition group select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-2 text-gray-600 font-bold text-xs uppercase tracking-wider">
                <span>{label}</span>
                <div className="flex flex-col -space-y-1.5">
                    <ChevronUp
                        size={12}
                        strokeWidth={4}
                        className={`transition-all ${isSorted && isAsc ? "text-clay-600 opacity-100" : "text-gray-300 opacity-50 group-hover:opacity-100"}`}
                    />
                    <ChevronDown
                        size={12}
                        strokeWidth={4}
                        className={`transition-all ${isSorted && !isAsc ? "text-clay-600 opacity-100" : "text-gray-300 opacity-50 group-hover:opacity-100"}`}
                    />
                </div>
            </div>
        </th>
    );
};

export default SortableHeader;

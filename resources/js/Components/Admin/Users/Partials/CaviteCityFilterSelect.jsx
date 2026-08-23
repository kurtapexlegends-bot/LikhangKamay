import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { CAVITE_CITY_OPTIONS } from '@/lib/caviteAddresses';

export default function CaviteCityFilterSelect({
    value = 'all',
    onChange,
    options = CAVITE_CITY_OPTIONS,
    placeholder = 'All Cavite Locations',
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef(null);

    // Focus search input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => searchInputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const filteredOptions = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return options;
        return options.filter((opt) => opt.toLowerCase().includes(query));
    }, [options, searchQuery]);

    const displayLabel = value === 'all' || !value ? placeholder : value;

    const handleSelect = (val) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="space-y-1.5 w-full">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`w-full min-h-[40px] px-3 py-2 bg-white border rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer shadow-2xs ${
                    isOpen
                        ? 'border-clay-500 ring-2 ring-clay-100 text-stone-900'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700'
                }`}
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown
                    size={14}
                    className={`text-stone-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-clay-600' : ''
                    }`}
                />
            </button>

            {/* In-Flow Expandable Selector (Never clipped by popover overflow!) */}
            {isOpen && (
                <div className="bg-stone-50/90 border border-stone-200 rounded-xl p-2 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                    {/* Search Input Box */}
                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Type to search city/town..."
                            className="w-full pl-8 pr-7 py-1.5 text-xs font-medium bg-white rounded-lg border border-stone-200 outline-none focus:border-clay-500 focus:ring-1 focus:ring-clay-500 placeholder:text-stone-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Scrollable Options List */}
                    <div className="max-h-36 overflow-y-auto bg-white rounded-lg border border-stone-200/80 divide-y divide-stone-100 shadow-2xs">
                        <button
                            type="button"
                            onClick={() => handleSelect('all')}
                            className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between transition hover:bg-stone-50 ${
                                value === 'all' ? 'bg-clay-50 text-clay-800' : 'text-stone-700'
                            }`}
                        >
                            <span>All Cavite Locations</span>
                            {value === 'all' && <Check size={13} className="text-clay-700 shrink-0" />}
                        </button>

                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-3 text-center text-xs text-stone-400 font-medium">
                                No matching Cavite location
                            </div>
                        ) : (
                            filteredOptions.map((cityName) => {
                                const isSelected = value === cityName;
                                return (
                                    <button
                                        key={cityName}
                                        type="button"
                                        onClick={() => handleSelect(cityName)}
                                        className={`w-full px-3 py-2 text-xs font-bold text-left flex items-center justify-between transition hover:bg-stone-50 ${
                                            isSelected ? 'bg-clay-50 text-clay-800' : 'text-stone-700'
                                        }`}
                                    >
                                        <span className="truncate">{cityName}</span>
                                        {isSelected && <Check size={13} className="text-clay-700 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function AddressSelect({
    id,
    value,
    onChange,
    options = [],
    placeholder = 'Select',
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    const filteredOptions = useMemo(() => {
        if (!search.trim()) {
            return options;
        }

        const query = search.toLowerCase();
        return options.filter((option) => option.toLowerCase().includes(query));
    }, [options, search]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option) => {
        onChange(option);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="relative mt-1" ref={containerRef}>
            <button
                type="button"
                id={id}
                disabled={disabled}
                onClick={() => {
                    if (disabled) {
                        return;
                    }

                    const nextOpen = !isOpen;
                    setIsOpen(nextOpen);

                    if (nextOpen) {
                        setTimeout(() => inputRef.current?.focus(), 50);
                    }
                }}
                className={`flex w-full items-center justify-between rounded-xl border border-gray-300 px-4 py-3 text-left shadow-sm transition ${
                    disabled
                        ? 'cursor-not-allowed bg-gray-100 text-gray-500'
                        : 'bg-white focus:border-clay-500 focus:ring-1 focus:ring-clay-500'
                } ${
                    value ? 'text-gray-900' : 'text-gray-400'
                }`}
            >
                <span className="truncate">{value || placeholder}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 p-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Type to search..."
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-clay-500 focus:outline-none"
                        />
                    </div>

                    <ul className="max-h-[200px] overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <li className="px-4 py-3 text-center text-sm text-gray-400">No results found</li>
                        ) : (
                            filteredOptions.map((option) => (
                                <li
                                    key={option}
                                    onClick={() => handleSelect(option)}
                                    className={`cursor-pointer px-4 py-2.5 text-sm transition hover:bg-clay-50 ${
                                        value === option ? 'bg-clay-100 font-medium text-clay-700' : 'text-gray-700'
                                    }`}
                                >
                                    {option}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Package, ShoppingCart, Loader2, Command, Box, ClipboardList, Star, Award, ShoppingBag, FolderTree, Users } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';

export default function GlobalSearch() {
    const { auth } = usePage().props;
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef(null);
    const modalRef = useRef(null);

    // Keyboard shortcut to open (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Focus input when modal opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    // Handle search logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    const response = await axios.get(route('api.global-search', { query }));
                    setResults(response.data.results);
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleNavigate = (url) => {
        setIsOpen(false);
        setQuery('');
        router.get(url);
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            e.preventDefault();
            handleNavigate(results[activeIndex].url);
        }
    };

    const getIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'user': return <User size={16} />;
            case 'product': return <Package size={16} />;
            case 'order': return <ShoppingCart size={16} />;
            case 'supply': return <Box size={16} />;
            case 'stock_request': return <ClipboardList size={16} />;
            case 'review': return <Star size={16} />;
            case 'sponsorship': return <Award size={16} />;
            default: return <Search size={16} />;
        }
    };

    return (
        <div ref={modalRef} className="relative w-full sm:w-72 lg:w-96 group">
            {/* Search Input (Always Visible) */}
            <div className="relative flex items-center">
                <Search 
                    className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isOpen ? 'text-clay-600' : 'text-stone-400 group-hover:text-clay-500'}`} 
                    size={16} 
                />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search everything..."
                    className={`w-full rounded-xl border pl-10 pr-10 py-2 text-sm font-medium text-stone-900 transition-all placeholder:text-stone-400 focus:outline-none ${
                        isOpen 
                            ? 'border-clay-300 bg-white ring-4 ring-clay-500/10' 
                            : 'border-stone-200 bg-stone-50/50 hover:border-clay-300 hover:bg-white'
                    }`}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={onKeyDown}
                />
                
                {isLoading ? (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-clay-400" size={14} />
                ) : query ? (
                    <button 
                        onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-stone-100 text-stone-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                ) : (
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 font-sans text-[10px] font-bold text-stone-400 border border-stone-200 shadow-sm pointer-events-none">
                        <Command size={10} /> K
                    </kbd>
                )}
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-[60] overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {results.length > 0 ? (
                            <div className="space-y-1">
                                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Search Results</p>
                                {results.map((result, index) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleNavigate(result.url)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${activeIndex === index ? 'bg-clay-50' : 'hover:bg-stone-50'}`}
                                    >
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${activeIndex === index ? 'bg-white border-clay-200 text-clay-600' : 'bg-stone-50 border-stone-100 text-stone-400'}`}>
                                            {getIcon(result.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate text-sm font-bold text-stone-900">{result.title}</span>
                                                <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                                                    {result.type.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <p className="truncate text-xs font-medium text-stone-400">{result.subtitle}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : query.length >= 2 ? (
                            <div className="px-4 py-8 text-center">
                                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-stone-300 mb-2">
                                    <Search size={20} />
                                </div>
                                <p className="text-sm font-bold text-stone-900">No results found</p>
                                <p className="text-xs font-medium text-stone-500 mt-0.5">Try adjusting your terms.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">Quick Navigation</h3>
                                <div className="grid grid-cols-1 gap-1">
                                    {(isAdmin ? [
                                        { label: 'User Directory', sub: 'Find sellers, buyers, and staff', icon: Users, color: 'text-indigo-500 bg-indigo-50/50' },
                                        { label: 'Taxonomy Engine', sub: 'Search product categories', icon: FolderTree, color: 'text-rose-500 bg-rose-50/50' },
                                        { label: 'Product Catalog', sub: 'Search across all seller products', icon: Box, color: 'text-blue-500 bg-blue-50/50' },
                                    ] : [
                                        { label: 'Products & Supplies', sub: 'Find raw materials or products', icon: Box, color: 'text-blue-500 bg-blue-50/50' },
                                        { label: 'Orders & Reviews', sub: 'Manage sales and feedback', icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-50/50' },
                                        { label: 'Sponsorships', sub: 'Track product promotions', icon: Award, color: 'text-amber-500 bg-amber-50/50' },
                                        { label: 'Stock Requests', sub: 'Inventory restock activity', icon: ClipboardList, color: 'text-clay-500 bg-clay-50/50' }
                                    ]).map((tip, i) => (
                                        <div key={i} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 transition-colors cursor-default">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tip.color}`}>
                                                <tip.icon size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-900 leading-none mb-1">{tip.label}</p>
                                                <p className="text-[10px] text-stone-500 leading-none">{tip.sub}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] font-bold text-stone-500 shadow-sm">ENTER</kbd>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Select</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] font-bold text-stone-500 shadow-sm">↑↓</kbd>
                                <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Navigate</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

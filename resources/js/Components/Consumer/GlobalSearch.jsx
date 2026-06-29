import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, Package, ShoppingCart, Loader2, Command, Box, ClipboardList, Star, Award, ShoppingBag, FolderTree, Users, TrendingUp, BarChart2, ShieldAlert, Bell, RotateCcw, Shield } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';

export default function GlobalSearch() {
    const { auth, sellerSidebar } = usePage().props;
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';
    const visibleModules = sellerSidebar?.visibleModules || [];

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

    // Define Role-based Commands
    const commands = isAdmin ? [
        { label: 'Go to User Manager', cmd: '> users', url: route('admin.users.manager'), icon: Users, color: 'text-indigo-500 bg-indigo-50' },
        { label: 'Go to Artisan Applications', cmd: '> applications', url: route('admin.pending'), icon: Award, color: 'text-amber-500 bg-amber-50' },
        { label: 'Go to Catalog Manager', cmd: '> taxonomy', url: route('admin.taxonomy.index'), icon: FolderTree, color: 'text-rose-500 bg-rose-50' },
        { label: 'Go to Platform Revenue', cmd: '> revenue', url: route('admin.settings.index', { tab: 'monetization' }), icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50' },
        { label: 'Go to Insights', cmd: '> insights', url: route('admin.insights'), icon: BarChart2, color: 'text-purple-500 bg-purple-50' },
        { label: 'Go to Audit Logs', cmd: '> audit', url: route('admin.operations'), icon: Shield, color: 'text-clay-500 bg-clay-50' },
        { label: 'Go to Content Safety', cmd: '> moderation', url: route('admin.moderation'), icon: ShieldAlert, color: 'text-red-500 bg-red-50' },
        { label: 'Go to Escalated Disputes', cmd: '> disputes', url: route('admin.disputes.index'), icon: RotateCcw, color: 'text-rose-500 bg-rose-50' },
    ] : [
        { label: 'Go to Inventory', cmd: '> inventory', url: route('procurement.index'), icon: Box, color: 'text-blue-500 bg-blue-50', module: 'procurement' },
        { label: 'Go to Order Manager', cmd: '> orders', url: route('orders.index'), icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-50', module: 'orders' },
        { label: 'Go to Stock Requests', cmd: '> stock', url: route('stock-requests.index'), icon: ClipboardList, color: 'text-clay-500 bg-clay-50', module: 'stock_requests' },
        { label: 'Go to HR & Payroll', cmd: '> hr', url: route('hr.index'), icon: Users, color: 'text-purple-500 bg-purple-50', module: 'hr' },
        { label: 'Go to Sponsorships', cmd: '> sponsorship', url: route('seller.sponsorships'), icon: Award, color: 'text-amber-500 bg-amber-50', module: 'sponsorships' },
        { label: 'Go to Product Manager', cmd: '> products', url: route('products.index'), icon: Package, color: 'text-indigo-500 bg-indigo-50', module: 'products' },
        { label: 'Go to Team Messages', cmd: '> team', url: route('team-messages.index'), icon: Users, color: 'text-emerald-500 bg-emerald-50', module: 'team_messages' },
    ].filter(cmd => !cmd.module || visibleModules.includes(cmd.module));

    const isCommandMode = query.startsWith('>');
    const cleanQuery = query.replace(/\s+/g, '').toLowerCase();
    const filteredCommands = isCommandMode 
        ? commands.filter(c => c.cmd.replace(/\s+/g, '').includes(cleanQuery) || cleanQuery === '>')
        : [];

    const displayResults = isCommandMode ? filteredCommands : results;

    const handleNavigate = (url) => {
        setIsOpen(false);
        setQuery('');
        router.get(url);
    };

    const onKeyDown = (e) => {
        // Prevent default browser behavior for arrows even if no results
        if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
            e.preventDefault();
        }

        if (e.key === 'ArrowDown') {
            setActiveIndex(prev => {
                const nextIndex = prev < displayResults.length - 1 ? prev + 1 : prev;
                return nextIndex;
            });
        } else if (e.key === 'ArrowUp') {
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < displayResults.length) {
                handleNavigate(displayResults[activeIndex].url);
            } else if (displayResults.length > 0) {
                handleNavigate(displayResults[0].url);
            }
        }
    };

    // Auto-scroll active item into view
    useEffect(() => {
        if (activeIndex >= 0) {
            const activeEl = document.getElementById(`search-result-${activeIndex}`);
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [activeIndex]);

    const getIcon = (type) => {
        switch (type.toLowerCase()) {
            case 'user': return <User size={16} />;
            case 'product': return <Package size={16} />;
            case 'order': return <ShoppingCart size={16} />;
            case 'supply': return <Box size={16} />;
            case 'inventory': return <Box size={16} />;
            case 'stock request': return <ClipboardList size={16} />;
            case 'review': return <Star size={16} />;
            case 'sponsorship': return <Award size={16} />;
            case 'moderation': return <ShieldAlert size={16} />;
            case 'dispute': return <RotateCcw size={16} />;
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
                    placeholder={isCommandMode ? "Type a command..." : "Search or type '>' for commands..."}
                    className={`w-full rounded-xl border pl-10 pr-10 py-2 text-sm font-medium text-stone-900 transition-all placeholder:text-stone-400 focus:outline-none ${
                        isOpen 
                            ? 'border-clay-300 bg-white ring-4 ring-clay-500/10' 
                            : 'border-stone-200 bg-stone-50/50 hover:border-clay-300 hover:bg-white'
                    } ${isCommandMode ? 'pl-[130px]' : ''}`}
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setActiveIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={onKeyDown}
                />

                {isCommandMode && (
                    <div className="absolute left-10 flex items-center gap-1.5 px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black uppercase tracking-tighter shadow-sm animate-in zoom-in-95 duration-200">
                        <Command size={10} />
                        <span>Command</span>
                    </div>
                )}
                
                {isLoading ? (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                         <Loader2 className="animate-spin text-clay-400" size={14} />
                    </div>
                ) : query ? (
                    <button 
                        onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                        className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-stone-100 text-stone-400 transition-colors"
                    >
                        <X size={14} />
                    </button>
                ) : (
                    <kbd className="absolute right-10 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 font-sans text-[10px] font-bold text-stone-400 border border-stone-200 shadow-sm pointer-events-none">
                        <Command size={10} /> K
                    </kbd>
                )}

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${isOpen ? 'bg-clay-500 animate-pulse' : 'bg-stone-300'}`} />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-[60] overflow-hidden rounded-2xl bg-white shadow-[0_16px_48px_-12px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.05] animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="max-h-[60vh] overflow-y-auto p-2">
                        {isLoading ? (
                            <div className="p-2 space-y-2">
                                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Searching platform...</p>
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
                                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                    {isCommandMode ? 'Command Center' : 'Search Results'}
                                </p>
                                {displayResults.map((result, index) => (
                                    <button
                                        id={`search-result-${index}`}
                                        key={isCommandMode ? result.cmd : `${result.type}-${result.id}`}
                                        onClick={() => handleNavigate(result.url)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={`group/item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${activeIndex === index ? (isCommandMode ? 'bg-indigo-50/50' : 'bg-clay-50') : 'hover:bg-stone-50'}`}
                                    >
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
                                            activeIndex === index 
                                                ? (isCommandMode ? `${result.color} border-indigo-200` : 'bg-white border-clay-200 text-clay-600') 
                                                : (isCommandMode ? `${result.color} border-transparent opacity-70` : 'bg-stone-50 border-stone-100 text-stone-400')
                                        }`}>
                                            {isCommandMode ? <result.icon size={16} /> : getIcon(result.type)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`truncate text-sm font-bold ${activeIndex === index ? 'text-stone-900' : 'text-stone-600'}`}>
                                                    {isCommandMode ? result.label : result.title}
                                                </span>
                                                {!isCommandMode && (
                                                    <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-500">
                                                        {result.type.replace('_', ' ')}
                                                    </span>
                                                )}
                                                {isCommandMode && (
                                                    <span className="shrink-0 rounded-md bg-white border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-500">
                                                        Command
                                                    </span>
                                                )}
                                            </div>
                                            <p className="truncate text-xs font-medium text-stone-400">
                                                {isCommandMode ? result.cmd : result.subtitle}
                                            </p>
                                        </div>
                                        {activeIndex === index && (
                                            <div className="shrink-0 animate-in fade-in slide-in-from-right-2 duration-200">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5 ${isCommandMode ? 'bg-indigo-600 text-white' : 'bg-clay-600 text-white'}`}>
                                                    {isCommandMode ? 'Execute' : 'View'}
                                                    <Command size={10} />
                                                </span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        ) : query.length >= (isCommandMode ? 1 : 2) ? (
                            <div className="px-4 py-8 text-center">
                                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-50 text-stone-300 mb-2">
                                    {isCommandMode ? <Command size={20} /> : <Search size={20} />}
                                </div>
                                <p className="text-sm font-bold text-stone-900">No {isCommandMode ? 'commands' : 'results'} found</p>
                                <p className="text-xs font-medium text-stone-500 mt-0.5">Try adjusting your {isCommandMode ? 'command' : 'terms'}.</p>
                            </div>
                        ) : (
                            <div className="p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">Quick Navigation</h3>
                                <div className="grid grid-cols-1 gap-1">
                                    {(isAdmin ? [
                                        { label: 'User Manager', sub: 'Manage platform users, staff profiles, and onboarding.', icon: Users, color: 'text-indigo-500 bg-indigo-50/50', url: route('admin.users.manager') },
                                        { label: 'Catalog Manager', sub: 'Manage product categories, tags, and taxonomy.', icon: FolderTree, color: 'text-rose-500 bg-rose-50/50', url: route('admin.catalog.index') },
                                        { label: 'Content Safety', sub: 'Manage flagged listings, reviews, and user content.', icon: ShieldAlert, color: 'text-red-500 bg-red-50/50', url: route('admin.compliance') },
                                    ] : [
                                        { label: 'Products & Inventory', sub: 'Manage product listings, supplies, and orders.', icon: Box, color: 'text-blue-500 bg-blue-50/50', modules: ['products', 'procurement'], url: route('products.index') },
                                        { label: 'Orders & Reviews', sub: 'Manage order fulfillment, tracking, and feedback.', icon: ShoppingBag, color: 'text-emerald-500 bg-emerald-50/50', modules: ['orders', 'reviews'], url: route('orders.index') },
                                        { label: 'Sponsorships', sub: 'Promote your products and manage active campaigns.', icon: Award, color: 'text-amber-500 bg-amber-50/50', modules: ['sponsorships'], url: route('seller.sponsorships') },
                                        { label: 'HR & Payroll', sub: 'Manage staff profiles, payroll runs, and access.', icon: Users, color: 'text-purple-500 bg-purple-50/50', modules: ['hr', 'accounting'], url: route('hr.index') }
                                    ].filter(tip => !tip.modules || tip.modules.some(m => visibleModules.includes(m)))).map((tip, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => handleNavigate(tip.url)}
                                            className="group flex w-full items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left transition-colors cursor-pointer"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tip.color}`}>
                                                <tip.icon size={16} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-stone-900 leading-none mb-1">{tip.label}</p>
                                                <p className="text-[10px] text-stone-500 leading-none">{tip.sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] font-bold text-stone-500 shadow-sm leading-none">ENTER</kbd>
                                <span className="text-[10px] font-bold text-stone-400">Select</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[9px] font-bold text-stone-500 shadow-sm flex items-center justify-center leading-none">
                                    <span className="translate-y-[1px]">↑</span>
                                </kbd>
                                <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[9px] font-bold text-stone-500 shadow-sm flex items-center justify-center leading-none">
                                    <span className="translate-y-[1px]">↓</span>
                                </kbd>
                                <span className="text-[10px] font-bold text-stone-400">Navigate</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-stone-400 italic">Type <span className="text-indigo-500 font-black px-1.5 py-0.5 bg-indigo-50 rounded">{">"}</span> for commands</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

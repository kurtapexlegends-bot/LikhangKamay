import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
    Search, X, User, Package, ShoppingCart, Loader2, Command, Box, 
    ClipboardList, Star, Award, ShoppingBag, FolderTree, Users, 
    TrendingUp, BarChart2, ShieldAlert, RotateCcw, Shield, 
    LayoutDashboard, MessageSquare, Settings, MapPin, Truck, 
    CreditCard, Clock, Tag, Mail, AlertCircle
} from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';

export default function GlobalSearch() {
    const { auth, sellerSidebar } = usePage().props;
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';
    const visibleModules = sellerSidebar?.visibleModules || [];

    const getSafeRoute = (name, params = {}) => {
        try {
            return route(name, params);
        } catch (e) {
            return '#';
        }
    };

    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef(null);
    const mobileInputRef = useRef(null);
    const modalRef = useRef(null);
    const dropdownRef = useRef(null);
    const abortControllerRef = useRef(null);

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
        if (isOpen) {
            const timer = setTimeout(() => {
                if (window.innerWidth < 640 && mobileInputRef.current) {
                    mobileInputRef.current.focus();
                } else if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 60);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Handle search logic with AbortController for in-flight cancellation
    useEffect(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        if (query.trim().length >= 2 && !query.startsWith('>')) {
            setIsLoading(true);
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const timer = setTimeout(async () => {
                try {
                    const response = await axios.get(route('api.global-search', { query: query.trim() }), {
                        signal: controller.signal,
                    });
                    setResults(response.data.results || []);
                } catch (error) {
                    if (!axios.isCancel(error) && error.name !== 'CanceledError') {
                        console.error('Search query error:', error);
                    }
                } finally {
                    setIsLoading(false);
                }
            }, 250);

            return () => {
                clearTimeout(timer);
                controller.abort();
            };
        } else {
            setResults([]);
            setIsLoading(false);
        }
    }, [query]);

    // Define Role-based Commands
    const commands = useMemo(() => {
        if (isAdmin) {
            return [
                { label: 'Go to User Manager', cmd: '> users', url: getSafeRoute('admin.users.manager'), icon: Users, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Go to Artisan Applications', cmd: '> applications', url: getSafeRoute('admin.users.manager', { tab: 'approvals' }), icon: Award, color: 'text-amber-600 bg-amber-50' },
                { label: 'Go to Product Categories', cmd: '> categories', url: getSafeRoute('admin.settings.index', { tab: 'taxonomy' }), icon: FolderTree, color: 'text-rose-600 bg-rose-50' },
                { label: 'Go to Payouts & Fund Releases', cmd: '> payouts', url: getSafeRoute('admin.payouts.index'), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Go to Email Studio & Templates', cmd: '> email', url: getSafeRoute('admin.email-templates.index'), icon: Mail, color: 'text-sky-600 bg-sky-50' },
                { label: 'Go to Platform Revenue & Monetization', cmd: '> revenue', url: getSafeRoute('admin.settings.index', { tab: 'monetization' }), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Go to Insights & Analytics', cmd: '> insights', url: getSafeRoute('admin.insights'), icon: BarChart2, color: 'text-purple-600 bg-purple-50' },
                { label: 'Go to Platform Operations & Audit', cmd: '> operations', url: getSafeRoute('admin.operations'), icon: Shield, color: 'text-clay-600 bg-clay-50' },
                { label: 'Go to Safety & Moderation Queue', cmd: '> moderation', url: getSafeRoute('admin.compliance', { tab: 'flags' }), icon: ShieldAlert, color: 'text-red-600 bg-red-50' },
                { label: 'Go to Order Disputes & Returns', cmd: '> disputes', url: getSafeRoute('admin.disputes.index'), icon: RotateCcw, color: 'text-rose-600 bg-rose-50' },
                { label: 'Go to Product Catalog Moderation', cmd: '> catalog', url: getSafeRoute('admin.catalog.index', { tab: 'moderation' }), icon: ShoppingBag, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Go to Sponsorship Manager', cmd: '> sponsorships', url: getSafeRoute('admin.catalog.index', { tab: 'sponsorships' }), icon: Star, color: 'text-amber-600 bg-amber-50' },
                { label: 'Go to Review Disputes Queue', cmd: '> review-disputes', url: getSafeRoute('admin.compliance', { tab: 'disputes' }), icon: MessageSquare, color: 'text-orange-600 bg-orange-50' },
                { label: 'Go to Trash & Restoration', cmd: '> trash', url: getSafeRoute('admin.compliance', { tab: 'trash' }), icon: AlertCircle, color: 'text-stone-600 bg-stone-100' },
                { label: 'Go to System Settings', cmd: '> settings', url: getSafeRoute('admin.settings.index'), icon: Settings, color: 'text-stone-600 bg-stone-50' },
                { label: 'Go to Admin Dashboard', cmd: '> dashboard', url: getSafeRoute('admin.dashboard'), icon: LayoutDashboard, color: 'text-stone-600 bg-stone-50' },
            ];
        }

        return [
            { label: 'Go to Product Catalog', cmd: '> products', url: getSafeRoute('products.index'), icon: Package, color: 'text-rose-600 bg-rose-50', module: 'products' },
            { label: 'Go to Marketing Discounts', cmd: '> discounts', url: getSafeRoute('discounts.index'), icon: Tag, color: 'text-amber-600 bg-amber-50', module: 'products' },
            { label: 'Go to 3D Model Manager', cmd: '> 3d', url: getSafeRoute('3d.index'), icon: Box, color: 'text-indigo-600 bg-indigo-50', module: 'products' },
            { label: 'Go to Order Manager', cmd: '> orders', url: getSafeRoute('orders.index'), icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50', module: 'orders' },
            { label: 'Go to Materials Inventory & Supplies', cmd: '> inventory', url: getSafeRoute('procurement.index'), icon: Box, color: 'text-blue-600 bg-blue-50', module: 'procurement' },
            { label: 'Go to Stock Requests Queue', cmd: '> stock-requests', url: getSafeRoute('stock-requests.index'), icon: ClipboardList, color: 'text-clay-600 bg-clay-50', module: 'stock_requests' },
            { label: 'Go to Customer Reviews & Feedback', cmd: '> reviews', url: getSafeRoute('reviews.index'), icon: Star, color: 'text-amber-600 bg-amber-50', module: 'reviews' },
            { label: 'Go to Team Messages & Channels', cmd: '> team-messages', url: getSafeRoute('team-messages.index'), icon: MessageSquare, color: 'text-sky-600 bg-sky-50', module: 'crm' },
            { label: 'Go to Sponsorship Campaigns', cmd: '> sponsorships', url: getSafeRoute('seller.sponsorships'), icon: Award, color: 'text-indigo-600 bg-indigo-50', module: 'sponsorships', ownerOnly: true },
            { label: 'Go to HR Employee Directory', cmd: '> hr', url: getSafeRoute('hr.index'), icon: Users, color: 'text-purple-600 bg-purple-50', module: 'hr' },
            { label: 'Go to Attendance & Time Card Audit', cmd: '> attendance', url: getSafeRoute('hr.index', { tab: 'timecard_audit' }), icon: Clock, color: 'text-purple-600 bg-purple-50', module: 'hr' },
            { label: 'Go to Payroll Runs & Ledger', cmd: '> payroll', url: getSafeRoute('hr.index', { tab: 'payroll' }), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', module: 'accounting' },
            { label: 'Go to Accounting & Financial Release', cmd: '> accounting', url: getSafeRoute('accounting.index'), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50', module: 'accounting' },
            { label: 'Go to Performance Analytics', cmd: '> analytics', url: getSafeRoute('analytics.index'), icon: BarChart2, color: 'text-stone-600 bg-stone-50', module: 'analytics' },
            { label: 'Go to Shop Settings & Storefront', cmd: '> settings', url: getSafeRoute('shop.settings'), icon: Settings, color: 'text-stone-600 bg-stone-50', ownerOnly: true },
            { label: 'Go to Activity History & Audit Log', cmd: '> audit-log', url: getSafeRoute('audit-log.index'), icon: Shield, color: 'text-stone-600 bg-stone-50', ownerOnly: true },
            { label: 'Go to Subscription & Plan Quota', cmd: '> subscription', url: getSafeRoute('seller.subscription'), icon: Award, color: 'text-amber-600 bg-amber-50', ownerOnly: true },
        ].filter(cmd => {
            if (cmd.ownerOnly && auth?.user?.role !== 'artisan') return false;
            if (cmd.module && !visibleModules.includes(cmd.module)) return false;
            return true;
        });
    }, [isAdmin, visibleModules, auth?.user?.role]);

    const isCommandMode = query.startsWith('>');
    const cleanQuery = query.replace('>', '').trim().toLowerCase();

    const filteredCommands = isCommandMode ? commands.filter(c => 
        c.label.toLowerCase().includes(cleanQuery) || c.cmd.toLowerCase().includes(cleanQuery)
    ) : [];

    const displayResults = isCommandMode ? filteredCommands : results;

    const handleNavigate = (url) => {
        setIsOpen(false);
        setQuery('');
        if (url && url !== '#') {
            router.visit(url);
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < displayResults.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < displayResults.length) {
                handleNavigate(displayResults[activeIndex].url);
            } else if (displayResults.length > 0) {
                handleNavigate(displayResults[0].url);
            }
        }
    };

    // Auto-scroll active item into view within the dropdown container
    useEffect(() => {
        if (activeIndex >= 0 && dropdownRef.current) {
            const activeEl = document.getElementById(`search-result-${activeIndex}`);
            if (activeEl) {
                const container = dropdownRef.current;
                const elTop = activeEl.offsetTop;
                const elHeight = activeEl.offsetHeight;
                const containerHeight = container.offsetHeight;
                const containerScrollTop = container.scrollTop;

                if (elTop < containerScrollTop) {
                    container.scrollTop = elTop;
                } else if (elTop + elHeight > containerScrollTop + containerHeight) {
                    container.scrollTop = elTop + elHeight - containerHeight;
                }
            }
        }
    }, [activeIndex]);

    const getIcon = (type) => {
        switch (type?.toLowerCase()) {
            case 'user': return <User size={15} />;
            case 'artisan application': return <Award size={15} />;
            case 'product': return <Package size={15} />;
            case 'discount': return <Tag size={15} />;
            case '3d model': return <Box size={15} />;
            case 'order': return <ShoppingCart size={15} />;
            case 'supply':
            case 'inventory': return <Box size={15} />;
            case 'stock request': return <ClipboardList size={15} />;
            case 'review': return <Star size={15} />;
            case 'sponsorship': return <Award size={15} />;
            case 'payout': return <TrendingUp size={15} />;
            case 'email template': return <Mail size={15} />;
            case 'category': return <FolderTree size={15} />;
            case 'moderation': return <ShieldAlert size={15} />;
            case 'dispute':
            case 'review dispute': return <RotateCcw size={15} />;
            case 'employee': return <Users size={15} />;
            case 'payroll': return <TrendingUp size={15} />;
            case 'team channel': return <MessageSquare size={15} />;
            case 'setting': return <Settings size={15} />;
            case 'workplace location': return <MapPin size={15} />;
            case 'activity log':
            case 'staff audit': return <Shield size={15} />;
            case 'module': return <LayoutDashboard size={15} />;
            default: return <Search size={15} />;
        }
    };

    return (
        <div ref={modalRef} className="relative">
            {/* MOBILE & TABLET: Search Trigger Icon (< md screens) */}
            <div className="md:hidden flex items-center">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-stone-500 hover:text-clay-600 hover:bg-stone-100 rounded-xl transition active:scale-95"
                    title="Search platform..."
                >
                    <Search size={18} />
                </button>
            </div>

            {/* DESKTOP: Search Input (>= md screens) */}
            <div className="hidden md:block relative w-44 lg:w-60 xl:w-80 group">
                <div className="relative flex items-center">
                    <Search 
                        className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isOpen ? 'text-clay-600' : 'text-stone-400 group-hover:text-clay-500'}`} 
                        size={16} 
                    />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={isCommandMode ? "Type a command..." : "Search platform or type '>' for shortcuts..."}
                        className={`w-full rounded-xl border pl-10 pr-10 py-2 text-xs font-semibold text-stone-900 transition placeholder:text-stone-400 focus:outline-none ${
                            isOpen 
                                ? 'border-clay-300 bg-white ring-4 ring-clay-500/10' 
                                : 'border-stone-200 bg-stone-50/70 hover:border-clay-300 hover:bg-white'
                        } ${isCommandMode ? 'pl-[115px]' : ''}`}
                        value={query}
                        onChange={(e) => {
                            const val = e.target.value;
                            setQuery(val);
                            setActiveIndex(-1);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={onKeyDown}
                    />

                    {isCommandMode && (
                        <div className="absolute left-9 flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[9px] font-black uppercase tracking-wider shadow-sm">
                            <Command size={10} />
                            <span>Command</span>
                        </div>
                    )}
                    
                    {isLoading ? (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <Loader2 className="animate-spin text-clay-500" size={14} />
                        </div>
                    ) : query ? (
                        <button 
                            type="button"
                            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                            className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-stone-100 text-stone-400 transition"
                        >
                            <X size={13} />
                        </button>
                    ) : (
                        <kbd className="absolute right-9 top-1/2 -translate-y-1/2 hidden lg:inline-flex items-center gap-0.5 rounded bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold text-stone-400 border border-stone-200 shadow-sm pointer-events-none">
                            <Command size={9} /> K
                        </kbd>
                    )}

                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isOpen ? 'bg-clay-500 ring-2 ring-clay-100' : 'bg-stone-300'}`} />
                    </div>
                </div>

                {/* DESKTOP Dropdown Menu */}
                {isOpen && (
                    <div className="hidden md:block absolute top-full left-0 right-0 mt-2 z-[70] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-stone-900/10 animate-in slide-in-from-top-2 fade-in duration-150">
                        <div ref={dropdownRef} className="max-h-[60vh] overflow-y-auto p-2">
                            {isLoading ? (
                                <div className="p-2 space-y-2">
                                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-stone-400">Searching platform records...</p>
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
                                    <div className="flex items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                        <span>{isCommandMode ? 'Command Shortcuts' : 'Search Results'}</span>
                                        <span className="text-stone-500 font-mono font-bold">{displayResults.length} match{displayResults.length === 1 ? '' : 'es'}</span>
                                    </div>
                                    {displayResults.map((result, index) => (
                                        <button
                                            id={`search-result-${index}`}
                                            key={isCommandMode ? result.cmd : `${result.type}-${result.id}-${index}`}
                                            onClick={() => handleNavigate(result.url)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                            className={`group/item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-all ${
                                                activeIndex === index 
                                                    ? (isCommandMode ? 'bg-indigo-50/70' : 'bg-clay-50/80') 
                                                    : 'hover:bg-stone-50'
                                            }`}
                                        >
                                            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                                                activeIndex === index 
                                                    ? (isCommandMode ? `${result.color} border-indigo-200` : 'bg-white border-clay-200 text-clay-600') 
                                                    : (isCommandMode ? `${result.color} border-transparent opacity-80` : 'bg-stone-50 border-stone-100 text-stone-500')
                                            }`}>
                                                {isCommandMode ? <result.icon size={15} /> : getIcon(result.type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`truncate text-xs font-bold ${activeIndex === index ? 'text-stone-900' : 'text-stone-700'}`}>
                                                        {isCommandMode ? result.label : result.title}
                                                    </span>
                                                    {!isCommandMode && (
                                                        <span className="shrink-0 rounded-md bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-stone-600">
                                                            {result.type?.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                    {isCommandMode && (
                                                        <span className="shrink-0 rounded-md bg-white border border-indigo-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                                                            Shortcut
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="truncate text-[11px] font-medium text-stone-400 mt-0.5">
                                                    {isCommandMode ? result.cmd : result.subtitle}
                                                </p>
                                            </div>
                                            {activeIndex === index && (
                                                <div className="shrink-0">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 ${isCommandMode ? 'bg-indigo-600 text-white' : 'bg-clay-600 text-white'}`}>
                                                        {isCommandMode ? 'Execute' : 'Open'}
                                                        <Command size={10} />
                                                    </span>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : query.trim().length >= (isCommandMode ? 1 : 2) ? (
                                <div className="px-4 py-8 text-center">
                                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-stone-50 text-stone-300 mb-2">
                                        {isCommandMode ? <Command size={18} /> : <Search size={18} />}
                                    </div>
                                    <p className="text-xs font-bold text-stone-800">No {isCommandMode ? 'commands' : 'matching records'} found</p>
                                    <p className="text-[11px] font-medium text-stone-400 mt-0.5">Check for typos or try searching with broader keywords.</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-3">
                                    <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-2">Quick Access</h3>
                                    <div className="grid grid-cols-1 gap-1">
                                        {(isAdmin ? [
                                            { label: 'User Directory & Approvals', sub: 'Manage user profiles, accounts, and artisan vetting.', icon: Users, color: 'text-indigo-600 bg-indigo-50', url: getSafeRoute('admin.users.manager') },
                                            { label: 'Catalog & Categories', sub: 'Inspect product listings, flags, and store categories.', icon: FolderTree, color: 'text-rose-600 bg-rose-50', url: getSafeRoute('admin.catalog.index') },
                                            { label: 'Disputes & Compliance', sub: 'Order disputes, review reports, and moderation queue.', icon: ShieldAlert, color: 'text-red-600 bg-red-50', url: getSafeRoute('admin.compliance') },
                                            { label: 'Platform Operations & Logs', sub: 'System health, activity history, and server cache.', icon: Shield, color: 'text-clay-600 bg-clay-50', url: getSafeRoute('admin.operations') },
                                        ] : [
                                            { label: 'Products & Discounts', sub: 'Manage catalog items, prices, 3D assets, and promos.', icon: Box, color: 'text-rose-600 bg-rose-50', modules: ['products'], url: getSafeRoute('products.index') },
                                            { label: 'Orders & Fulfillment', sub: 'Process customer shipments, receipts, and returns.', icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50', modules: ['orders'], url: getSafeRoute('orders.index') },
                                            { label: 'Materials & Stock', sub: 'Raw supplies, product recipes, and restock requests.', icon: Box, color: 'text-blue-600 bg-blue-50', modules: ['procurement', 'stock_requests'], url: getSafeRoute('procurement.index') },
                                            { label: 'HR & Payroll Ledger', sub: 'Manage team roster, attendance time cards, and salary runs.', icon: Users, color: 'text-purple-600 bg-purple-50', modules: ['hr', 'accounting'], url: getSafeRoute('hr.index') },
                                        ].filter(tip => !tip.modules || tip.modules.some(m => visibleModules.includes(m)))).map((tip, i) => (
                                            <button 
                                                key={i} 
                                                onClick={() => handleNavigate(tip.url)}
                                                className="group flex w-full items-center gap-3 p-2 rounded-xl hover:bg-stone-50 text-left transition cursor-pointer"
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tip.color}`}>
                                                    <tip.icon size={15} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-stone-800">{tip.label}</p>
                                                    <p className="text-[10px] text-stone-400 truncate">{tip.sub}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Help Bar */}
                        <div className="border-t border-stone-100 bg-stone-50/90 px-3.5 py-2 flex items-center justify-between text-[10px] font-bold text-stone-400">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">ENTER</kbd>
                                    <span>Select</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">↑</kbd>
                                    <kbd className="px-1 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">↓</kbd>
                                    <span>Navigate</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded text-[9px] text-stone-600 shadow-xs">ESC</kbd>
                                    <span>Close</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>Type</span>
                                <span className="text-indigo-600 font-mono font-black px-1 py-0.2 bg-indigo-50 border border-indigo-100 rounded">&gt;</span>
                                <span>for shortcuts</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MOBILE Full Slide-down Search Overlay (< md screens) */}
            {isOpen && (
                <div className="md:hidden fixed inset-x-0 top-0 z-[120] bg-white/98 backdrop-blur-xl border-b border-stone-200 p-3 shadow-2xl animate-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="relative flex-1 flex items-center">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-clay-600" size={16} />
                            <input
                                ref={mobileInputRef}
                                type="text"
                                placeholder={isCommandMode ? "Type a command..." : "Search platform or type '>'..."}
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
                                            {isCommandMode ? <result.icon size={16} /> : getIcon(result.type)}
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
                                    {(isAdmin ? [
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
            )}
        </div>
    );
}

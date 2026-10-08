import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Loader2, Command } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { getGlobalSearchCommands } from './GlobalSearch/globalSearchData';
import GlobalSearchDesktopDropdown from './GlobalSearch/GlobalSearchDesktopDropdown';
import GlobalSearchMobileOverlay from './GlobalSearch/GlobalSearchMobileOverlay';

export default function GlobalSearch({ scope = null }) {
    const { auth, sellerSidebar } = usePage().props;
    const userRole = auth?.user?.role;
    const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';
    const isSeller = userRole === 'artisan' || userRole === 'staff';

    // Strictly resolve effective scope based on role and active workspace
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const requestedScope = scope || (currentPath.startsWith('/admin') ? 'admin' : (isSeller ? 'seller' : null));
    const effectiveScope = (requestedScope === 'admin' && isSuperAdmin) 
        ? 'admin' 
        : ((requestedScope === 'seller' && isSeller) ? 'seller' : null);
    const showAdminShortcuts = effectiveScope === 'admin';

    const visibleModules = useMemo(() => sellerSidebar?.visibleModules || [], [sellerSidebar?.visibleModules]);

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
                    const response = await axios.get(route('api.global-search', { 
                        query: query.trim(),
                        scope: effectiveScope,
                    }), {
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
    }, [query, effectiveScope]);

    // Define Role-based Commands strictly isolated by effective scope
    const commands = useMemo(() => {
        return getGlobalSearchCommands(effectiveScope, visibleModules, userRole);
    }, [effectiveScope, visibleModules, userRole]);

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
                        placeholder={isCommandMode ? "Type a command..." : effectiveScope === 'admin' ? "Search admin records or type '>'..." : effectiveScope === 'seller' ? "Search store records or type '>'..." : "Search platform..."}
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
                <GlobalSearchDesktopDropdown
                    isOpen={isOpen}
                    dropdownRef={dropdownRef}
                    isLoading={isLoading}
                    displayResults={displayResults}
                    isCommandMode={isCommandMode}
                    query={query}
                    activeIndex={activeIndex}
                    setActiveIndex={setActiveIndex}
                    handleNavigate={handleNavigate}
                    showAdminShortcuts={showAdminShortcuts}
                    visibleModules={visibleModules}
                />
            </div>

            {/* MOBILE Full Slide-down Search Overlay (< md screens) */}
            <GlobalSearchMobileOverlay
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                mobileInputRef={mobileInputRef}
                query={query}
                setQuery={setQuery}
                setActiveIndex={setActiveIndex}
                onKeyDown={onKeyDown}
                isLoading={isLoading}
                isCommandMode={isCommandMode}
                effectiveScope={effectiveScope}
                displayResults={displayResults}
                handleNavigate={handleNavigate}
                showAdminShortcuts={showAdminShortcuts}
            />
        </div>
    );
}

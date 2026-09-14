import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { useRealtime } from '@/hooks/useRealtime';
import { MessageCircle, Search, X } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import MobileDock from '@/Layouts/MobileDock';
import DisciplinaryStatusBanner from '@/Components/DisciplinaryStatusBanner';
import { syncSignalsWithServer } from '@/utils/buyerSignals';
import BuyerUserMenu from '@/Components/Buyer/BuyerUserMenu';
import BuyerCartDropdown from '@/Components/Buyer/BuyerCartDropdown';
import BuyerSearchSuggestions from '@/Components/Buyer/BuyerSearchSuggestions';
import BuyerMobileSearchSheet from '@/Components/Buyer/BuyerMobileSearchSheet';

export default function BuyerNavbar({ hideMobileDock = false }) {
    // Enable Real-time synchronization
    useRealtime();

    const { auth, cartCount, sellerSidebar, unreadMessageCount, platform } = usePage().props;
    const user = auth?.user;

    useEffect(() => {
        if (user?.id) {
            syncSignalsWithServer(user.id);
        }
    }, [user?.id]);

    const rawBuyerName = user?.name?.trim()
        || [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim();
    const buyerDisplayName = rawBuyerName
        ? rawBuyerName.split(/\s+/).slice(0, 2).join(' ')
        : 'Account';
    const showBuyerChat = !!user && !auth?.isStaff && user.role !== 'super_admin';
    const sellerWorkspaceHref = sellerSidebar?.canAccessWorkspace && sellerSidebar?.defaultRouteName
        ? route(sellerSidebar.defaultRouteName)
        : null;
    const workspaceLabel = sellerSidebar?.actorType === 'staff' ? 'Staff Hub' : 'Seller Dashboard';

    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const [term, setTerm] = useState(params.get('search') || '');

    useEffect(() => {
        const currentSearch = new URLSearchParams(window.location.search).get('search') || '';
        setTerm(currentSearch);
    }, [usePage().url]);

    const handleSearch = (e, explicitTerm) => {
        if (e) e.preventDefault();
        setShowSuggestions(false);
        const searchQuery = explicitTerm !== undefined ? explicitTerm : term;
        const isOnShopPage = window.location.pathname.startsWith('/shop');
        const options = isOnShopPage ? { preserveState: true, preserveScroll: true } : {};
        router.get(route('shop.index'), { search: searchQuery }, options);
    };

    const handleClearSearch = () => {
        setTerm('');
        setShowSuggestions(false);
        const isOnShopPage = window.location.pathname.startsWith('/shop');
        const options = isOnShopPage ? { preserveState: true, preserveScroll: true } : {};
        router.get(route('shop.index'), { search: '' }, options);
    };

    const [isScrolled, setIsScrolled] = useState(false);
    const [localCartCount, setLocalCartCount] = useState(() => {
        const cached = localStorage.getItem('lk_cart_count');
        return cached !== null ? parseInt(cached, 10) : (cartCount || 0);
    });
    const [localUnreadMessageCount, setLocalUnreadMessageCount] = useState(() => {
        const cached = localStorage.getItem('lk_unread_messages');
        return cached !== null ? parseInt(cached, 10) : (unreadMessageCount || 0);
    });
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Search Suggestions State
    const [suggestions, setSuggestions] = useState({ products: [], artisans: [] });
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Lightweight debounced search for suggestions with request cancellation
    useEffect(() => {
        if (term.length < 2) {
            setSuggestions({ products: [], artisans: [] });
            setIsLoadingSuggestions(false);
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setIsLoadingSuggestions(true);
            try {
                const response = await axios.get(route('api.search.suggestions'), { 
                    params: { q: term },
                    signal: controller.signal
                });
                setSuggestions(response.data);
            } catch (error) {
                if (!axios.isCancel(error)) {
                    console.error('Suggestions error:', error);
                }
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 200);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [term]);

    useEffect(() => {
        if (typeof cartCount === 'number') {
            setLocalCartCount(cartCount);
            localStorage.setItem('lk_cart_count', cartCount);
        }
    }, [cartCount]);

    useEffect(() => {
        if (typeof unreadMessageCount === 'number') {
            setLocalUnreadMessageCount(unreadMessageCount);
            localStorage.setItem('lk_unread_messages', unreadMessageCount);
        }
    }, [unreadMessageCount]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled((prev) => {
                if (!prev && window.scrollY > 60) return true;
                if (prev && window.scrollY < 20) return false;
                return prev;
            });
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initialize based on current scroll position
        if (window.scrollY > 60) {
            setIsScrolled(true);
        }

        const handleCartAnimate = (e) => {
            const addedQty = e.detail?.quantity || 1;
            setLocalCartCount(prev => prev + addedQty);

            const icon = document.querySelector('.cart-icon-svg');
            const badge = document.querySelector('.cart-badge');
            
            if (icon) {
                icon.classList.remove('animate-cart-shake');
                void icon.offsetWidth; // trigger reflow
                icon.classList.add('animate-cart-shake');
            }
            if (badge) {
                badge.classList.remove('animate-badge-pop');
                void badge.offsetWidth;
                badge.classList.add('animate-badge-pop');
                setTimeout(() => badge.classList.remove('animate-badge-pop'), 300);
            }
        };

        const handleToggleSearch = () => {
            setIsMobileSearchOpen(true);
        };

        window.addEventListener('cart-add-animate', handleCartAnimate);
        window.addEventListener('toggle-mobile-search', handleToggleSearch);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('cart-add-animate', handleCartAnimate);
            window.removeEventListener('toggle-mobile-search', handleToggleSearch);
        };
    }, []);

    return (
        <>
        <DisciplinaryStatusBanner />
        <nav className={`bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-md py-1' : 'shadow-sm/50 py-3'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* --- DESKTOP HEADER LAYOUT --- */}
                <div className={`hidden md:flex flex-nowrap justify-between items-center gap-8 transition-all duration-300 ${isScrolled ? 'md:h-14' : 'md:h-20'}`}>
                    
                    {/* LOGO */}
                    <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-2.5 flex-shrink-0 group">
                        <img src={platform.logo} alt="Logo" className={`object-contain transition-all duration-300 ${isScrolled ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-9 h-9 sm:w-10 sm:h-10'}`} />
                        <div className={`flex min-w-0 flex-col transition-all duration-300 ${isScrolled ? 'opacity-0 w-0 overflow-hidden sm:opacity-100 sm:w-auto' : 'opacity-100 w-auto'}`}>
                            <span className={`truncate font-serif font-bold text-gray-900 leading-none tracking-tight transition-all duration-300 ${isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>{platform.name}</span>
                            <span className={`hidden sm:block font-bold tracking-widest uppercase mt-0.5 text-clay-600 transition-all duration-300 ${isScrolled ? 'text-[8px]' : 'text-[10px]'}`}>Artisan Marketplace</span>
                        </div>
                    </Link>

                    {/* SEARCH */}
                    <div className="flex-1 max-w-3xl relative">
                        <form onSubmit={handleSearch} className="relative group">
                            <input 
                                type="text" 
                                placeholder="Search pottery, vases, artisans..." 
                                className={`w-full bg-gray-50 border border-gray-200 rounded-full text-sm focus:bg-white focus:border-clay-300 focus:ring-4 focus:ring-clay-100/50 transition-all duration-300 shadow-sm placeholder-gray-400 text-gray-800 ${isScrolled ? 'pl-10 pr-24 py-2 md:pl-10 md:pr-28 md:py-2 text-xs' : 'pl-10 pr-32 py-2.5 md:pl-12 md:pr-36 md:py-3'}`}
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            <Search className={`absolute transition-all duration-300 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-clay-600 ${isScrolled ? 'left-3.5 md:left-3.5 w-4 h-4' : 'left-3.5 md:left-4 w-5 h-5'}`} />
                            {term && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className={`absolute text-gray-400 hover:text-gray-600 p-1 flex items-center justify-center rounded-full hover:bg-gray-200/50 transition-colors ${isScrolled ? 'right-16 md:right-20 top-1/2 -translate-y-1/2 w-6 h-6' : 'right-20 md:right-24 top-1/2 -translate-y-1/2 w-7 h-7'}`}
                                    title="Clear search"
                                >
                                    <X size={14} />
                                </button>
                            )}
                            <button type="submit" className={`absolute right-1.5 top-1/2 -translate-y-1/2 bg-clay-600 text-white rounded-full font-bold hover:bg-clay-700 hover:shadow-md transition-all duration-300 active:scale-95 ${isScrolled ? 'px-3 md:px-4 py-1 text-[10px]' : 'px-4 md:px-6 py-2 text-xs'}`}>
                                Search
                            </button>
                        </form>

                        <BuyerSearchSuggestions 
                            showSuggestions={showSuggestions}
                            term={term}
                            isLoadingSuggestions={isLoadingSuggestions}
                            suggestions={suggestions}
                            onClose={() => setShowSuggestions(false)}
                        />
                    </div>

                    {/* ACTIONS */}
                    <div className="flex items-center gap-1.5 sm:gap-3 md:gap-4 flex-shrink-0">
                        {user ? (
                            <>
                                {showBuyerChat && (
                                    <Link 
                                        href={route('buyer.chat')} 
                                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-all active:scale-95 group"
                                    >
                                        <div className="relative inline-flex">
                                            <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                                            {localUnreadMessageCount > 0 && (
                                                <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm">
                                                    {localUnreadMessageCount}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                )}

                                {/* Cart Icon: <ShoppingCart size={20} via BuyerCartDropdown */}
                                <BuyerCartDropdown localCartCount={localCartCount} isMobile={false} />

                                <NotificationDropdown />

                                <div className="hidden sm:block h-8 w-px bg-gray-200 mx-1"></div>

                                <BuyerUserMenu 
                                    user={user}
                                    buyerDisplayName={buyerDisplayName}
                                    sellerWorkspaceHref={sellerWorkspaceHref}
                                    workspaceLabel={workspaceLabel}
                                />
                            </>
                        ) : (
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <Link href={route('login')} prefetch="hover" className="px-3 sm:px-4 py-2 text-sm font-bold text-gray-600 hover:text-clay-600 transition-all active:scale-95">Log In</Link>
                                <Link href={route('register')} prefetch="hover" className="px-3 sm:px-4 py-2 bg-clay-600 text-white rounded-full text-sm font-bold hover:bg-clay-700 transition-all active:scale-95">Sign Up</Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- PREMIUM MOBILE HEADER LAYOUT (NO WRAP, 56px ROW) --- */}
                <div className="flex md:hidden items-center justify-between w-full h-14">
                    {/* Logo & Serif Branding */}
                    <Link href="/" className="flex items-center gap-2 group min-w-0">
                        <img src={platform.logo} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
                        <span className="font-serif font-extrabold text-stone-900 text-base sm:text-lg tracking-tight truncate leading-none">
                            {platform.name}
                        </span>
                    </Link>

                    {/* Compact actions tray */}
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        {/* Search overlay trigger */}
                        <button
                            onClick={() => setIsMobileSearchOpen(true)}
                            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 hover:text-clay-600 active:scale-90 transition-transform rounded-full hover:bg-stone-50"
                            aria-label="Open Search"
                        >
                            <Search size={20} strokeWidth={2.2} />
                        </button>

                        {/* Chat icon */}
                        {user && showBuyerChat && (
                            <Link
                                href={route('buyer.chat')}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-stone-500 hover:text-clay-600 active:scale-90 transition-transform rounded-full hover:bg-stone-50 relative"
                            >
                                <MessageCircle size={20} strokeWidth={2} />
                                {localUnreadMessageCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white shadow-sm ring-2 ring-white">
                                        {localUnreadMessageCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {/* Cart */}
                        <BuyerCartDropdown localCartCount={localCartCount} isMobile={true} />

                        {/* User Profile avatar bottom-drawer trigger on mobile */}
                        {user ? (
                            <button 
                                onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-account'))}
                                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-stone-50 active:scale-95"
                                aria-label="Open Account Drawer"
                            >
                                <UserAvatar 
                                    user={user} 
                                    className="w-7 h-7 border border-stone-200 shadow-sm" 
                                />
                            </button>
                        ) : (
                            <Link 
                                href={route('login')}
                                className="min-h-[44px] flex items-center justify-center text-xs font-black text-clay-600 hover:text-clay-700 bg-clay-50/80 px-4 rounded-full border border-clay-100"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>

            </div>
        </nav>

        {/* --- LUXURIOUS BOTTOM-SHEET SEARCH OVERLAY (Mobile/Tablet specific) --- */}
        <BuyerMobileSearchSheet 
            isOpen={isMobileSearchOpen}
            onClose={() => setIsMobileSearchOpen(false)}
            term={term}
            setTerm={setTerm}
            onSearch={handleSearch}
            suggestions={suggestions}
        />

        {!hideMobileDock && <MobileDock />}
        </>
    );
}

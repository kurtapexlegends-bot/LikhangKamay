import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import axios from 'axios';
import Dropdown from '@/Components/Dropdown'; 
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    MessageCircle, ChevronDown, ShoppingBag, 
    Search, ShoppingCart, User, LogOut, Heart, Clock, X
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import MobileDock from '@/Layouts/MobileDock';

export default function BuyerNavbar() {
    const { auth, cartCount, sellerSidebar, unreadMessageCount, platform } = usePage().props;
    const user = auth?.user;
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

    const params = new URLSearchParams(window.location.search);
    const [term, setTerm] = useState(params.get('search') || '');
    const [isScrolled, setIsScrolled] = useState(false);
    const [localCartCount, setLocalCartCount] = useState(cartCount || 0);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    // Search Suggestions State
    const [suggestions, setSuggestions] = useState({ products: [], artisans: [] });
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Debounced search for suggestions
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (term.length >= 2) {
                setIsLoadingSuggestions(true);
                try {
                    const response = await axios.get(route('api.search.suggestions'), { params: { q: term } });
                    setSuggestions(response.data);
                } catch (error) {
                    console.error('Suggestions error:', error);
                } finally {
                    setIsLoadingSuggestions(false);
                }
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [term]);

    useEffect(() => {
        setLocalCartCount(cartCount || 0);
    }, [cartCount]);

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

        window.addEventListener('cart-add-animate', handleCartAnimate);
        
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('cart-add-animate', handleCartAnimate);
        };
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('shop.index'), { search: term }, { preserveState: true });
    };

    return (
        <>
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
                                className={`w-full bg-gray-50 border border-gray-200 rounded-full text-sm focus:bg-white focus:border-clay-300 focus:ring-4 focus:ring-clay-100/50 transition-all duration-300 shadow-sm placeholder-gray-400 text-gray-800 ${isScrolled ? 'pl-10 pr-20 py-2 md:pl-10 md:pr-24 md:py-2 text-xs' : 'pl-10 pr-24 py-2.5 md:pl-12 md:pr-32 md:py-3'}`}
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            />
                            <Search className={`absolute transition-all duration-300 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-clay-600 ${isScrolled ? 'left-3.5 md:left-3.5 w-4 h-4' : 'left-3.5 md:left-4 w-5 h-5'}`} />
                            <button type="submit" className={`absolute right-1.5 top-1/2 -translate-y-1/2 bg-clay-600 text-white rounded-full font-bold hover:bg-clay-700 hover:shadow-md transition-all duration-300 active:scale-95 ${isScrolled ? 'px-3 md:px-4 py-1 text-[10px]' : 'px-4 md:px-6 py-2 text-xs'}`}>
                                Search
                            </button>
                        </form>

                        {/* Search Suggestions */}
                        {showSuggestions && term.length >= 2 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                                {isLoadingSuggestions ? (
                                    <div className="p-4 flex items-center justify-center text-gray-400">
                                        <div className="w-5 h-5 border-2 border-clay-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                                        <span className="text-xs font-medium">Looking for matches...</span>
                                    </div>
                                ) : (suggestions.products.length > 0 || suggestions.artisans.length > 0) ? (
                                    <div className="p-2 space-y-3">
                                        {suggestions.products.length > 0 && (
                                            <div>
                                                <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Products</p>
                                                {suggestions.products.map(p => (
                                                    <Link key={p.id} href={route('product.show', p.slug)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group">
                                                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-clay-600 transition-colors">{p.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-medium truncate">{p.seller} • ₱{p.price}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                        {suggestions.artisans.length > 0 && (
                                            <div>
                                                <p className="px-3 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Artisans</p>
                                                {suggestions.artisans.map(a => (
                                                    <Link key={a.id} href={route('shop.seller', a.slug)} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-xl transition-colors group">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                                                            <img src={a.avatar} alt={a.name} className="w-full h-full object-cover" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-clay-600 transition-colors">{a.name}</p>
                                                            <p className="text-[10px] text-gray-500 font-medium truncate">{a.location}</p>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <p className="text-sm font-bold text-gray-900">No results found</p>
                                        <p className="text-xs text-gray-500 mt-1">Try a different keyword</p>
                                    </div>
                                )}
                                <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-[10px] text-gray-400 font-medium">Press ENTER to see all results</span>
                                    <Link href={route('shop.index', { search: term })} className="text-[10px] font-bold text-clay-600 hover:underline">View Shop</Link>
                                </div>
                            </div>
                        )}
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
                                            {unreadMessageCount > 0 && (
                                                <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm">
                                                    {unreadMessageCount}
                                                </span>
                                            )}
                                        </div>
                                    </Link>
                                )}

                                {/* Cart Icon */}
                                <Link 
                                    id="navbar-cart-icon"
                                    href={route('cart.index')} 
                                    className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-all active:scale-95 group relative"
                                >
                                    <div className="relative inline-flex">
                                        <ShoppingCart size={20} className="group-hover:scale-110 transition-transform cart-icon-svg" />
                                        {localCartCount > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm transition-transform duration-300 cart-badge">
                                                {localCartCount}
                                            </span>
                                        )}
                                    </div>
                                </Link>

                                <NotificationDropdown />

                                <div className="hidden sm:block h-8 w-px bg-gray-200 mx-1"></div>

                                <div className="relative">
                                    <Dropdown>
                                        <Dropdown.Trigger>
                                            <button className="flex items-center gap-2 sm:gap-3 pl-1 pr-1.5 sm:pr-2 py-1 rounded-full hover:bg-gray-50 transition-all active:scale-95 border border-transparent hover:border-gray-200 group">
                                                <UserAvatar 
                                                    user={user} 
                                                    className="w-9 h-9 border-2 border-white shadow-sm group-hover:border-clay-200 transition-colors" 
                                                />
                                                <div className="text-left hidden sm:block">
                                                    <p className="text-sm font-bold text-gray-900 leading-none">{buyerDisplayName}</p>
                                                </div>
                                                <ChevronDown size={16} className="text-gray-400 group-hover:text-clay-600" />
                                            </button>
                                        </Dropdown.Trigger>
                                        <Dropdown.Content width="56">
                                            <div className="px-4 py-3 border-b border-gray-100 mb-1 bg-gray-50/50">
                                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Signed in as</p>
                                                <p className="text-sm font-bold text-gray-900 truncate">{user.email}</p>
                                            </div>
                                            {user.role !== 'artisan' || user.artisan_status !== 'pending' ? (
                                                <>
                                                    <Dropdown.Link href={route('profile.edit')}><User size={16} className="inline mr-2"/> Profile Settings</Dropdown.Link>
                                                    <Dropdown.Link href={route('my-orders.index')}><ShoppingBag size={16} className="inline mr-2"/> My Purchases</Dropdown.Link>
                                                    <Dropdown.Link href={route('saved.index')}><Heart size={16} className="inline mr-2"/> Saved</Dropdown.Link>
                                                </>
                                            ) : (
                                                <Dropdown.Link href={route('artisan.pending')} className="text-amber-600 font-bold bg-amber-50/50">
                                                    <span className="flex items-center">
                                                        <Clock size={16} className="inline mr-2" />
                                                        Application Status
                                                    </span>
                                                </Dropdown.Link>
                                            )}
                                            {/* SELLER LINK */}
                                            {sellerWorkspaceHref && (
                                                <Dropdown.Link href={sellerWorkspaceHref} className="text-clay-600 font-bold bg-clay-50/50">
                                                    <span className="flex items-center">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        {workspaceLabel}
                                                    </span>
                                                </Dropdown.Link>
                                            )}
                                            <div className="border-t border-gray-100 my-1"></div>
                                            <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-600 hover:bg-red-50"><LogOut size={16} className="inline mr-2"/> Log Out</Dropdown.Link>
                                        </Dropdown.Content>
                                    </Dropdown>
                                </div>
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
                            className="p-2 text-stone-500 hover:text-clay-600 active:scale-90 transition-transform rounded-full hover:bg-stone-50"
                            aria-label="Open Search"
                        >
                            <Search size={20} strokeWidth={2.2} />
                        </button>

                        {/* Chat icon */}
                        {user && showBuyerChat && (
                            <Link
                                href={route('buyer.chat')}
                                className="p-2 text-stone-500 hover:text-clay-600 active:scale-90 transition-transform rounded-full hover:bg-stone-50 relative"
                            >
                                <MessageCircle size={20} strokeWidth={2} />
                                {unreadMessageCount > 0 && (
                                    <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white shadow-sm ring-2 ring-white">
                                        {unreadMessageCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        {/* Cart */}
                        <Link
                            href={route('cart.index')}
                            className="p-2 text-stone-500 hover:text-clay-600 active:scale-90 transition-transform rounded-full hover:bg-stone-50 relative"
                            id="mobile-cart-icon-nav"
                        >
                            <ShoppingCart size={20} strokeWidth={2} className="cart-icon-svg" />
                            {localCartCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-clay-600 text-[8px] font-black text-white shadow-sm ring-2 ring-white cart-badge">
                                    {localCartCount}
                                </span>
                            )}
                        </Link>

                        {/* User Profile avatar dropdown */}
                        {user ? (
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button className="flex items-center pl-1 pr-1 py-1 rounded-full hover:bg-stone-50 active:scale-95">
                                        <UserAvatar 
                                            user={user} 
                                            className="w-7 h-7 border border-stone-200 shadow-sm" 
                                        />
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content width="44">
                                    <Dropdown.Link href={route('profile.edit')}><User size={14} className="inline mr-2"/> Profile</Dropdown.Link>
                                    <Dropdown.Link href={route('my-orders.index')}><ShoppingBag size={14} className="inline mr-2"/> Purchases</Dropdown.Link>
                                    <div className="border-t border-stone-100 my-1"></div>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="text-red-600"><LogOut size={14} className="inline mr-2"/> Log Out</Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        ) : (
                            <Link 
                                href={route('login')}
                                className="text-xs font-black text-clay-600 hover:text-clay-700 bg-clay-50/80 px-3 py-1.5 rounded-full border border-clay-100"
                            >
                                Login
                            </Link>
                        )}
                    </div>
                </div>

            </div>
        </nav>

        {/* --- LUXURIOUS SLIDE-DOWN SEARCH OVERLAY --- */}
        {isMobileSearchOpen && (
            <div className="fixed inset-0 z-[100] bg-stone-950/45 backdrop-blur-md flex flex-col justify-start transition-all duration-300">
                <div className="bg-[#FAF7F2] border-b border-stone-200/60 px-4 py-4 shadow-2xl animate-in slide-in-from-top duration-300 rounded-b-3xl">
                    <div className="flex items-center gap-3">
                        <form 
                            onSubmit={(e) => { 
                                e.preventDefault(); 
                                setIsMobileSearchOpen(false); 
                                handleSearch(e); 
                            }} 
                            className="relative flex-1"
                        >
                            <input
                                type="text"
                                placeholder="Search pottery, vases, artisans..."
                                className="w-full bg-white border border-stone-200 rounded-full pl-10 pr-10 py-2.5 text-sm focus:border-clay-400 focus:ring-1 focus:ring-clay-100 shadow-sm placeholder-stone-400 text-stone-800"
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                                autoFocus
                            />
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 w-4 h-4" />
                            {term && (
                                <button
                                    type="button"
                                    onClick={() => setTerm('')}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </form>
                        <button
                            onClick={() => setIsMobileSearchOpen(false)}
                            className="text-stone-500 hover:text-stone-950 text-xs font-black uppercase tracking-wider px-1.5 py-1"
                        >
                            Cancel
                        </button>
                    </div>

                    {/* Trending Ceramics Chips */}
                    <div className="mt-5">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2.5">Trending Collections</p>
                        <div className="flex flex-wrap gap-2">
                            {['Planter', 'Vase', 'Mug', 'Tableware', 'Plate'].map((item) => (
                                <button
                                    key={item}
                                    onClick={() => {
                                        setTerm(item);
                                        setIsMobileSearchOpen(false);
                                        router.get(route('shop.index'), { search: item });
                                    }}
                                    className="text-xs font-bold text-clay-700 bg-clay-50/80 hover:bg-clay-100 border border-clay-100/50 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Suggestions */}
                    {term.length >= 2 && (suggestions.products.length > 0 || suggestions.artisans.length > 0) && (
                        <div className="mt-5 max-h-[45vh] overflow-y-auto divide-y divide-stone-100/80 pr-1">
                            {suggestions.products.map(p => (
                                <Link 
                                    key={p.id} 
                                    href={route('product.show', p.slug)} 
                                    onClick={() => setIsMobileSearchOpen(false)}
                                    className="flex items-center gap-3 py-3"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-stone-100 overflow-hidden flex-shrink-0 border border-stone-200/55">
                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-bold text-stone-950 truncate leading-snug">{p.name}</p>
                                        <p className="text-[10px] text-stone-500 font-medium truncate mt-0.5">₱{p.price}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
                {/* Underlay tap-to-close */}
                <div className="flex-1" onClick={() => setIsMobileSearchOpen(false)}></div>
            </div>
        )}

        <MobileDock />
        </>
    );
}

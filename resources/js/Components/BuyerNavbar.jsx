import React, { useState, useEffect } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import Dropdown from '@/Components/Dropdown'; 
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    MessageCircle, ChevronDown, ShoppingBag, 
    Search, ShoppingCart, User, LogOut, Heart, Clock
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import ImpersonationBanner from '@/Components/ImpersonationBanner';
import MobileDock from '@/Components/MobileDock';

export default function BuyerNavbar() {
    const { auth, cartCount, sellerSidebar, unreadMessageCount } = usePage().props;
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

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll(); // Initialize on mount
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('shop.index'), { search: term }, { preserveState: true });
    };

    return (
        <>
        <ImpersonationBanner />
        <nav className={`bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-md py-1' : 'shadow-sm/50 py-3'}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className={`flex flex-wrap items-center gap-3 md:flex-nowrap md:justify-between md:items-center md:gap-8 transition-all duration-300 ${isScrolled ? 'md:h-14' : 'md:h-20'}`}>
                    
                    {/* LOGO */}
                    <Link href="/" className="order-1 flex min-w-0 items-center gap-2 sm:gap-2.5 flex-shrink-0 group">
                        <img src="/images/logo.png" alt="Logo" className={`object-contain transition-all duration-300 ${isScrolled ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-9 h-9 sm:w-10 sm:h-10'}`} />
                        <div className={`flex min-w-0 flex-col transition-all duration-300 ${isScrolled ? 'opacity-0 w-0 overflow-hidden sm:opacity-100 sm:w-auto' : 'opacity-100 w-auto'}`}>
                            <span className={`truncate font-serif font-bold text-gray-900 leading-none tracking-tight transition-all duration-300 ${isScrolled ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'}`}>LikhangKamay</span>
                            <span className={`hidden sm:block font-bold tracking-widest uppercase mt-0.5 text-clay-600 transition-all duration-300 ${isScrolled ? 'text-[8px]' : 'text-[10px]'}`}>Artisan Marketplace</span>
                        </div>
                    </Link>

                    {/* SEARCH */}
                    <div className="order-3 basis-full md:order-2 md:flex-1 md:max-w-3xl">
                        <form onSubmit={handleSearch} className="relative group">
                            <input 
                                type="text" 
                                placeholder="Search pottery, vases, artisans..." 
                                className={`w-full bg-gray-50 border border-gray-200 rounded-full text-sm focus:bg-white focus:border-clay-300 focus:ring-4 focus:ring-clay-100/50 transition-all duration-300 shadow-sm placeholder-gray-400 text-gray-800 ${isScrolled ? 'pl-10 pr-20 py-2 md:pl-10 md:pr-24 md:py-2 text-xs' : 'pl-10 pr-24 py-2.5 md:pl-12 md:pr-32 md:py-3'}`}
                                value={term}
                                onChange={(e) => setTerm(e.target.value)}
                            />
                            <Search className={`absolute transition-all duration-300 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-clay-600 ${isScrolled ? 'left-3.5 md:left-3.5 w-4 h-4' : 'left-3.5 md:left-4 w-5 h-5'}`} />
                            <button type="submit" className={`absolute right-1.5 top-1/2 -translate-y-1/2 bg-clay-600 text-white rounded-full font-bold hover:bg-clay-700 hover:shadow-md transition-all duration-300 active:scale-95 ${isScrolled ? 'px-3 md:px-4 py-1 text-[10px]' : 'px-4 md:px-6 py-2 text-xs'}`}>
                                Search
                            </button>
                        </form>
                    </div>

                    {/* ACTIONS */}
                    <div className="order-2 ml-auto flex items-center gap-1.5 sm:gap-3 md:order-3 md:ml-0 md:gap-4 flex-shrink-0">
                        {user ? (
                            <>
                                {showBuyerChat && (
                                    <Link href={route('buyer.chat')} className="p-2 md:p-2.5 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-all active:scale-95 group">
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

                                {/* FIX: Changed <button> to <Link> pointing to cart.index */}
                                <Link 
                                    href={route('cart.index')} 
                                    className="p-2 md:p-2.5 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-full transition-all active:scale-95 group"
                                >
                                    <div className="relative inline-flex">
                                        <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                                        {cartCount > 0 && (
                                            <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm">
                                                {cartCount}
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
                                <Link href={route('login')} className="px-3 sm:px-4 py-2 text-sm font-bold text-gray-600 hover:text-clay-600 transition-all active:scale-95">Log In</Link>
                                <Link href={route('register')} className="px-3 sm:px-4 py-2 bg-clay-600 text-white rounded-full text-sm font-bold hover:bg-clay-700 transition-all active:scale-95">Sign Up</Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
        <MobileDock />
        </>
    );
}

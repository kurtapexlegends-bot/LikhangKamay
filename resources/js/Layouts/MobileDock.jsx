import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { 
    ShoppingBag, Search, ShoppingCart, User, Heart, Home, LogOut, Settings, Package, Clock, Edit2, Store
} from 'lucide-react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import UserAvatar from '@/Components/UserAvatar';

export default function MobileDock() {
    const { url } = usePage();
    const { auth, cartCount, sellerSidebar } = usePage().props;
    const user = auth?.user;
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    const handleSearchClick = (e) => {
        e.preventDefault();
        // Focus the search input in the navbar
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
            searchInput.focus();
            // Scroll to top to ensure search bar is visible
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            router.visit(route('shop.index'));
        }
    };

    const sellerWorkspaceHref = sellerSidebar?.canAccessWorkspace && sellerSidebar?.defaultRouteName
        ? route(sellerSidebar.defaultRouteName)
        : null;
    const workspaceLabel = sellerSidebar?.actorType === 'staff' ? 'Staff Hub' : 'Seller Dashboard';

    const isActive = (path) => url === path || (url?.startsWith(path + '/'));

    return (
        <>
            <div className="mobile-dock fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md md:hidden pointer-events-none transition-all duration-500 ease-in-out">
                <nav className="bg-stone-950/95 backdrop-blur-xl border border-stone-800/80 rounded-3xl shadow-[0_-8px_30px_rgba(212,163,115,0.15),0_15px_35px_rgba(0,0,0,0.5)] px-4 py-3.5 flex items-center justify-between pointer-events-auto transition-all duration-500">
                    <Link
                        href="/"
                        className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 duration-300 relative pb-1 ${
                            url === '/' ? 'text-[#D4A373]' : 'text-stone-400 hover:text-white'
                        }`}
                    >
                        <Home size={21} strokeWidth={url === '/' ? 2.5 : 2} />
                        <span className="text-[8px] font-black uppercase tracking-wider">Home</span>
                        {url === '/' && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]"></span>}
                    </Link>

                    <Link
                        href={route('shop.index')}
                        className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 duration-300 relative pb-1 ${
                            isActive('/shop') ? 'text-[#D4A373]' : 'text-stone-400 hover:text-white'
                        }`}
                    >
                        <ShoppingBag size={21} strokeWidth={isActive('/shop') ? 2.5 : 2} />
                        <span className="text-[8px] font-black uppercase tracking-wider">Shop</span>
                        {isActive('/shop') && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]"></span>}
                    </Link>

                    <button
                        onClick={handleSearchClick}
                        className="flex flex-col items-center gap-0.5 transition-all active:scale-90 duration-300 relative pb-1 text-stone-400 hover:text-white"
                    >
                        <Search size={21} strokeWidth={2} />
                        <span className="text-[8px] font-black uppercase tracking-wider">Search</span>
                    </button>

                    <Link
                        href={route('cart.index')}
                        className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 duration-300 relative pb-1 ${
                            isActive('/cart') ? 'text-[#D4A373]' : 'text-stone-400 hover:text-white'
                        }`}
                    >
                        <div className="relative">
                            <ShoppingCart size={21} strokeWidth={isActive('/cart') ? 2.5 : 2} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1.5 -right-2.5 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-[#D4A373] px-1 text-[7px] font-black leading-none text-stone-950 shadow-sm ring-1 ring-stone-950">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-wider">Cart</span>
                        {isActive('/cart') && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]"></span>}
                    </Link>

                    {user ? (
                        <button
                            onClick={() => setIsAccountOpen(true)}
                            className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 duration-300 relative pb-1 ${
                                isAccountOpen ? 'text-[#D4A373]' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            <User size={21} strokeWidth={isAccountOpen ? 2.5 : 2} />
                            <span className="text-[8px] font-black uppercase tracking-wider">Account</span>
                            {isAccountOpen && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]"></span>}
                        </button>
                    ) : (
                        <Link
                            href={route('login')}
                            className={`flex flex-col items-center gap-0.5 transition-all active:scale-90 duration-300 relative pb-1 ${
                                isActive('/login') ? 'text-[#D4A373]' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            <User size={21} strokeWidth={isActive('/login') ? 2.5 : 2} />
                            <span className="text-[8px] font-black uppercase tracking-wider">Login</span>
                            {isActive('/login') && <span className="absolute bottom-0 w-1 h-1 rounded-full bg-[#D4A373] shadow-[0_0_8px_#D4A373]"></span>}
                        </Link>
                    )}
                </nav>
            </div>

            {/* Account Slide-over */}
            {user && (
                <SlideOverDrawer
                    show={isAccountOpen}
                    onClose={() => setIsAccountOpen(false)}
                    title="Account"
                    widthClass="max-w-[260px]"
                >
                    <div className="flex flex-col -m-6 divide-y divide-stone-200/50 bg-[#FAF7F2] h-full min-h-screen">
                        {/* Compact User Profile */}
                        <div className="flex items-center gap-3 px-5 py-6 bg-stone-900/5 border-b border-stone-250/20">
                            <UserAvatar user={user} className="h-10 w-10 border border-stone-300 shadow-sm" />
                            <div className="min-w-0">
                                <p className="text-xs font-black text-stone-900 truncate leading-tight">{user.name || 'Artisan'}</p>
                                <p className="text-[10px] font-semibold text-stone-500 truncate leading-tight mt-1">{user.email}</p>
                            </div>
                        </div>

                        <div className="p-3 space-y-4">
                            {/* Section: Shopping */}
                            <div className="space-y-0.5">
                                <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400">Shopping</p>
                                <MenuLink href={route('my-orders.index')} icon={Package} label="Purchases" onClick={() => setIsAccountOpen(false)} />
                                <MenuLink href={route('saved.index')} icon={Heart} label="Saved Items" onClick={() => setIsAccountOpen(false)} />
                                <MenuLink href={route('buyer.reviews')} icon={Edit2} label="My Reviews" onClick={() => setIsAccountOpen(false)} />
                            </div>

                            {/* Section: Account */}
                            <div className="space-y-0.5">
                                <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400">Settings</p>
                                <MenuLink href={route('profile.edit')} icon={Settings} label="Profile Details" onClick={() => setIsAccountOpen(false)} />
                                <MenuLink href={route('shop.index')} icon={Store} label="Addresses" onClick={() => setIsAccountOpen(false)} />
                            </div>

                            {/* Section: Workspace */}
                            {(sellerWorkspaceHref || (user.role === 'artisan' && user.artisan_status === 'pending')) && (
                                <div className="space-y-0.5 pt-1">
                                    <p className="px-3 mb-1.5 text-[9px] font-black uppercase tracking-widest text-stone-400">Workspace</p>
                                    {sellerWorkspaceHref && (
                                        <Link 
                                            href={sellerWorkspaceHref} 
                                            className="flex items-center gap-3 px-3 py-2.5 text-xs font-black text-clay-700 bg-clay-50/80 hover:bg-clay-100/80 rounded-xl transition-all border border-clay-100/50 shadow-sm"
                                            onClick={() => setIsAccountOpen(false)}
                                        >
                                            <ShoppingBag size={14} className="text-clay-600" />
                                            {workspaceLabel}
                                        </Link>
                                    )}
                                    {user.role === 'artisan' && user.artisan_status === 'pending' && (
                                        <MenuLink href={route('artisan.pending')} icon={Clock} label="Application Status" onClick={() => setIsAccountOpen(false)} className="text-amber-700 font-bold bg-amber-50/50 border border-amber-100" />
                                    )}
                                </div>
                            )}

                            {/* Sign Out - Integrated into main flow */}
                            <div className="pt-2">
                                <Link 
                                    href={route('logout')} 
                                    method="post" 
                                    as="button" 
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-xs font-black text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent active:border-rose-100"
                                >
                                    <LogOut size={14} />
                                    Sign Out
                                </Link>
                            </div>
                        </div>
                    </div>
                </SlideOverDrawer>
            )}
        </>
    );
}

const MenuLink = ({ href, icon: Icon, label, onClick, className = "" }) => (
    <Link 
        href={href} 
        className={`flex items-center gap-3 px-3 py-2.5 text-xs font-black text-stone-600 hover:text-stone-950 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-stone-200/50 ${className}`}
        onClick={onClick}
    >
        <Icon size={14} className="text-stone-400 shrink-0" />
        {label}
    </Link>
);

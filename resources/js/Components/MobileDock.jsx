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
                <nav className="bg-stone-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-stone-950/40 px-4 py-3 flex items-center justify-between pointer-events-auto transition-all duration-500">
                    <Link
                        href="/"
                        className={`flex flex-col items-center gap-1 transition-all active:scale-75 ${
                            url === '/' ? 'text-amber-400' : 'text-stone-400 hover:text-white'
                        }`}
                    >
                        <Home size={22} strokeWidth={url === '/' ? 2.5 : 2} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Home</span>
                    </Link>

                    <Link
                        href={route('shop.index')}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-75 ${
                            isActive('/shop') ? 'text-amber-400' : 'text-stone-400 hover:text-white'
                        }`}
                    >
                        <ShoppingBag size={22} strokeWidth={isActive('/shop') ? 2.5 : 2} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Shop</span>
                    </Link>

                    <button
                        onClick={handleSearchClick}
                        className="flex flex-col items-center gap-1 transition-all active:scale-75 text-stone-400 hover:text-white"
                    >
                        <Search size={22} strokeWidth={2} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Search</span>
                    </button>

                    <Link
                        href={route('cart.index')}
                        className={`flex flex-col items-center gap-1 transition-all active:scale-75 relative ${
                            isActive('/cart') ? 'text-amber-400' : 'text-stone-400 hover:text-white'
                        }`}
                    >
                        <div className="relative">
                            <ShoppingCart size={22} strokeWidth={isActive('/cart') ? 2.5 : 2} />
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black leading-none text-stone-950 shadow-sm border border-stone-900">
                                    {cartCount}
                                </span>
                            )}
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-tighter">Cart</span>
                    </Link>

                    {user ? (
                        <button
                            onClick={() => setIsAccountOpen(true)}
                            className={`flex flex-col items-center gap-1 transition-all active:scale-75 ${
                                isAccountOpen ? 'text-amber-400' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            <User size={22} strokeWidth={isAccountOpen ? 2.5 : 2} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Account</span>
                        </button>
                    ) : (
                        <Link
                            href={route('login')}
                            className={`flex flex-col items-center gap-1 transition-all active:scale-75 ${
                                isActive('/login') ? 'text-amber-400' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            <User size={22} strokeWidth={isActive('/login') ? 2.5 : 2} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Login</span>
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
                    <div className="flex flex-col -m-6 divide-y divide-stone-100">
                        {/* Compact User Profile */}
                        <div className="flex items-center gap-3 px-5 py-4 bg-stone-50/50">
                            <UserAvatar user={user} className="h-9 w-9 border border-stone-200 shadow-sm" />
                            <div className="min-w-0">
                                <p className="text-[13px] font-bold text-stone-900 truncate leading-tight">{user.name || 'Artisan'}</p>
                                <p className="text-[11px] font-medium text-stone-500 truncate leading-tight mt-0.5">{user.email}</p>
                            </div>
                        </div>

                        <div className="p-2.5 space-y-4">
                            {/* Section: Shopping */}
                            <div className="space-y-0.5">
                                <p className="px-3 mb-1 text-[9px] font-black uppercase tracking-widest text-stone-400">Shopping</p>
                                <MenuLink href={route('my-orders.index')} icon={Package} label="Purchases" onClick={() => setIsAccountOpen(false)} />
                                <MenuLink href={route('saved.index')} icon={Heart} label="Saved Items" onClick={() => setIsAccountOpen(false)} />
                                <MenuLink href={route('buyer.reviews')} icon={Edit2} label="My Reviews" onClick={() => setIsAccountOpen(false)} />
                            </div>

                            {/* Section: Account */}
                            <div className="space-y-0.5">
                                <p className="px-3 mb-1 text-[9px] font-black uppercase tracking-widest text-stone-400">Settings</p>
                                <MenuLink href={route('profile.edit')} icon={Settings} label="Profile Details" onClick={() => setIsAccountOpen(false)} />
                                <MenuLink href={route('shop.index')} icon={Store} label="Addresses" onClick={() => setIsAccountOpen(false)} />
                            </div>

                            {/* Section: Workspace */}
                            {(sellerWorkspaceHref || (user.role === 'artisan' && user.artisan_status === 'pending')) && (
                                <div className="space-y-0.5 pt-1">
                                    <p className="px-3 mb-1 text-[9px] font-black uppercase tracking-widest text-stone-400">Workspace</p>
                                    {sellerWorkspaceHref && (
                                        <Link 
                                            href={sellerWorkspaceHref} 
                                            className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-clay-700 bg-clay-50/80 hover:bg-clay-100/80 rounded-xl transition-colors"
                                            onClick={() => setIsAccountOpen(false)}
                                        >
                                            <ShoppingBag size={16} className="text-clay-600" />
                                            {workspaceLabel}
                                        </Link>
                                    )}
                                    {user.role === 'artisan' && user.artisan_status === 'pending' && (
                                        <MenuLink href={route('artisan.pending')} icon={Clock} label="Application Status" onClick={() => setIsAccountOpen(false)} className="text-amber-700 font-bold bg-amber-50/50" />
                                    )}
                                </div>
                            )}

                            {/* Sign Out - Integrated into main flow */}
                            <div className="pt-2">
                                <Link 
                                    href={route('logout')} 
                                    method="post" 
                                    as="button" 
                                    className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                >
                                    <LogOut size={16} />
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
        className={`flex items-center gap-3 px-3 py-2 text-sm font-bold text-stone-600 hover:text-stone-950 hover:bg-stone-50 rounded-xl transition-all ${className}`}
        onClick={onClick}
    >
        <Icon size={16} className="text-stone-400 shrink-0" />
        {label}
    </Link>
);

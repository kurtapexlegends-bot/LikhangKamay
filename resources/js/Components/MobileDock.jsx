import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { 
    ShoppingBag, Search, ShoppingCart, User, Heart, Home
} from 'lucide-react';

export default function MobileDock() {
    const { auth, cartCount } = usePage().props;
    const user = auth?.user;

    const navItems = [
        { 
            name: 'Home', 
            icon: Home, 
            href: '/', 
            active: route().current('home') 
        },
        { 
            name: 'Shop', 
            icon: ShoppingBag, 
            href: route('shop.index'), 
            active: route().current('shop.*') 
        },
        { 
            name: 'Search', 
            icon: Search, 
            href: route('shop.index'), // Search focus can be handled on the shop page
            active: false 
        },
        { 
            name: 'Cart', 
            icon: ShoppingCart, 
            href: route('cart.index'), 
            active: route().current('cart.*'),
            badge: cartCount
        },
        { 
            name: user ? 'Account' : 'Login', 
            icon: User, 
            href: user ? route('dashboard') : route('login'), 
            active: route().current('login') || route('dashboard') === window.location.href 
        },
    ];

    return (
        <div className="mobile-dock fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-2rem)] max-w-md md:hidden pointer-events-none transition-all duration-500 ease-in-out">
            <nav className="bg-stone-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-stone-950/20 px-4 py-3 flex items-center justify-between pointer-events-auto transition-all duration-500">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 transition-all active:scale-75 ${
                                item.active ? 'text-amber-400' : 'text-stone-400 hover:text-white'
                            }`}
                        >
                            <div className="relative">
                                <Icon size={22} strokeWidth={item.active ? 2.5 : 2} />
                                {item.badge > 0 && (
                                    <span className="absolute -top-1 -right-2 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-black leading-none text-stone-950 shadow-sm border border-stone-900">
                                        {item.badge}
                                    </span>
                                )}
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-tighter">
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}

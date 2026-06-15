import React from 'react';
import { Link } from '@inertiajs/react';
import { LayoutDashboard, Package, ShoppingBag, MessageCircle, Sliders } from 'lucide-react';

export default function MobileActionBar({ active = 'overview' }) {
    const navItems = [
        {
            name: 'overview',
            label: 'Overview',
            href: route('dashboard'),
            icon: LayoutDashboard
        },
        {
            name: 'products',
            label: 'Products',
            href: route('products.index'),
            icon: Package
        },
        {
            name: 'orders',
            label: 'Orders',
            href: route('orders.index'),
            icon: ShoppingBag
        },
        {
            name: 'chat',
            label: 'Messages',
            href: route('chat.index'),
            icon: MessageCircle
        },
        {
            name: 'settings',
            label: 'Settings',
            href: route('shop.settings'),
            icon: Sliders
        }
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 py-2 pb-safe px-4 flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.name;
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`flex flex-col items-center justify-center gap-1 flex-1 min-h-[44px] min-w-[44px] rounded-xl transition-all duration-200 active:scale-95 ${
                            isActive 
                                ? 'text-clay-600 font-bold' 
                                : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        <Icon size={20} className={isActive ? 'scale-110 text-clay-600' : ''} />
                        <span className="text-[9px] tracking-wide font-medium">{item.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

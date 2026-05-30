import React from 'react';
import ShopLayout from '@/Layouts/ShopLayout';
import { Head, Link } from '@inertiajs/react';
import { Bell, Package, MessageCircle, Star, AlertTriangle, Clock, Trash2, Check, ArrowRight } from 'lucide-react';

export default function Notifications({ notifications = [], unreadNotificationCount = 0 }) {
    const getIcon = (type) => {
        switch (type) {
            case 'new_order': return <Package size={20} className="text-green-500" />;
            case 'new_message': return <MessageCircle size={20} className="text-blue-500" />;
            case 'delivery_update': return <Truck size={20} className="text-indigo-500" />;
            case 'new_review': return <Star size={20} className="text-yellow-500" />;
            default: return <Bell size={20} className="text-stone-400" />;
        }
    };

    return (
        <ShopLayout>
            <Head title="My Notifications" />

            <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Notifications</h1>
                        <p className="text-stone-500 text-[11px] sm:text-sm">Stay updated with your orders and activity.</p>
                    </div>
                    {notifications.length > 0 && (
                        <button className="text-xs sm:text-sm font-bold text-clay-600 hover:text-clay-700 p-2 -mr-2">
                            Mark all as read
                        </button>
                    )}
                </div>

                {notifications.length > 0 ? (
                    <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
                        <div className="divide-y divide-stone-50">
                             {notifications.map((notification) => {
                                const CardWrapper = notification.url ? Link : 'div';
                                return (
                                    <CardWrapper 
                                        key={notification.id}
                                        href={notification.url}
                                        className={`p-4 sm:p-5 flex gap-4 transition-all hover:bg-stone-50/80 active:scale-[0.99] border-l-4 ${
                                            !notification.read_at 
                                            ? 'bg-clay-50/30 border-clay-500' 
                                            : 'border-transparent'
                                        }`}
                                    >
                                        <div className="shrink-0 w-10 h-10 rounded-2xl bg-stone-100 flex items-center justify-center shadow-sm">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h3 className={`text-sm truncate ${!notification.read_at ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>
                                                    {notification.title}
                                                </h3>
                                                <span className="text-[10px] font-medium text-stone-400 whitespace-nowrap">
                                                    {notification.created_at}
                                                </span>
                                            </div>
                                            <p className="text-[13px] text-stone-500 leading-relaxed line-clamp-2">
                                                {notification.message}
                                            </p>
                                            {notification.url && (
                                                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-bold text-clay-600 sm:hidden">
                                                    Tap to view <ArrowRight size={12} />
                                                </div>
                                            )}
                                        </div>
                                        {!notification.read_at && (
                                            <div className="shrink-0 w-2 h-2 rounded-full bg-clay-500 mt-2 shadow-[0_0_8px_rgba(192,114,81,0.5)]"></div>
                                        )}
                                    </CardWrapper>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                        <Bell size={48} className="mx-auto text-stone-300 mb-4" />
                        <h3 className="text-stone-900 font-bold">No notifications yet</h3>
                        <p className="text-stone-500 text-sm mt-1">We'll let you know when something important happens.</p>
                        <Link href={route('shop.index')} className="inline-flex mt-6 px-6 py-2.5 bg-stone-900 text-white rounded-full text-sm font-bold">
                            Go Shopping
                        </Link>
                    </div>
                )}
            </div>
        </ShopLayout>
    );
}

const Truck = ({ size, className }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
);

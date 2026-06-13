import React from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Bell, Package, MessageCircle, Star, AlertTriangle, Clock, Trash2, 
    Check, ArrowRight, Undo, Award, PackageCheck, Users, Truck, 
    Store, Banknote, ArchiveX, ShieldAlert, XCircle, Mail, MailOpen 
} from 'lucide-react';

export default function Notifications({ notifications = [], unreadNotificationCount = 0 }) {
    const { auth } = usePage().props;
    const user = auth?.user;

    const handleMarkAsRead = (id) => {
        router.post(route('notifications.read', id), {}, { preserveScroll: true });
    };

    const handleMarkAsUnread = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        router.post(route('notifications.unread', id), {}, { preserveScroll: true });
    };

    const handleDelete = (e, id) => {
        e.preventDefault();
        e.stopPropagation();
        router.delete(route('notifications.destroy', id), { preserveScroll: true });
    };

    const handleMarkAllAsRead = () => {
        router.post(route('notifications.read-all'), {}, { preserveScroll: true });
    };

    const handleClearAll = () => {
        router.delete(route('notifications.clear-all'), { preserveScroll: true });
    };

    const getIconData = (type) => {
        switch (type) {
            case 'new_order':
            case 'payment_confirmed':
                return {
                    icon: <Package size={20} className="text-emerald-600" />,
                    bgClass: 'bg-emerald-50'
                };
            case 'new_message':
                return {
                    icon: <MessageCircle size={20} className="text-blue-600" />,
                    bgClass: 'bg-blue-50'
                };
            case 'new_review':
                return {
                    icon: <Star size={20} className="text-amber-500" />,
                    bgClass: 'bg-amber-50'
                };
            case 'review_moderation_status':
            case 'refund_request':
            case 'dispute_accepted':
            case 'dispute_arbitrated_refund':
                return {
                    icon: <Undo size={20} className="text-rose-600" />,
                    bgClass: 'bg-rose-50'
                };
            case 'low_stock':
                return {
                    icon: <AlertTriangle size={20} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            case 'low_stock_warning':
                return {
                    icon: <AlertTriangle size={20} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'sponsorship_status':
                return {
                    icon: <Award size={20} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'replacement_resolution':
            case 'dispute_replacement_proposed':
                return {
                    icon: <PackageCheck size={20} className="text-teal-500" />,
                    bgClass: 'bg-teal-50'
                };
            case 'team_message':
                return {
                    icon: <Users size={20} className="text-emerald-600" />,
                    bgClass: 'bg-emerald-50'
                };
            case 'delivery_update':
                return {
                    icon: <Truck size={20} className="text-indigo-600" />,
                    bgClass: 'bg-indigo-50'
                };
            case 'accounting_rejected':
                return {
                    icon: <AlertTriangle size={20} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            case 'accounting_request':
                return {
                    icon: <Banknote size={20} className="text-emerald-600" />,
                    bgClass: 'bg-emerald-50'
                };
            case 'artisan_application':
                return {
                    icon: <Store size={20} className="text-clay-600" />,
                    bgClass: 'bg-clay-50'
                };
            case 'shipment_deadline':
                return {
                    icon: <Clock size={20} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'supply_depleted':
                return {
                    icon: <ArchiveX size={20} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            case 'product_moderation':
            case 'dispute_escalated':
                return {
                    icon: <ShieldAlert size={20} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'dispute_rejected':
            case 'dispute_arbitrated_rejected':
                return {
                    icon: <XCircle size={20} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            default:
                return {
                    icon: <Bell size={20} className="text-stone-500" />,
                    bgClass: 'bg-stone-50'
                };
        }
    };

    const isSeller = user?.role === 'artisan' || user?.role === 'staff';

    const content = (
        <div className={`max-w-4xl mx-auto px-4 ${isSeller ? 'py-6' : 'py-6 sm:py-10'}`}>
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-sans">Notifications</h1>
                    <p className="text-stone-500 text-[11px] sm:text-sm font-sans mt-0.5">Stay updated with orders and workspace alerts.</p>
                </div>
                <div className="flex items-center gap-2">
                    {unreadNotificationCount > 0 && (
                        <button 
                            onClick={handleMarkAllAsRead}
                            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-clay-600 hover:text-clay-700 px-2 py-1 rounded-lg transition"
                        >
                            <Check size={14} /> Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button 
                            onClick={handleClearAll}
                            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-red-500 hover:text-red-700 px-2 py-1 rounded-lg transition"
                        >
                            <Trash2 size={14} /> Clear all
                        </button>
                    )}
                </div>
            </div>

            {notifications.length > 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
                    <div className="divide-y divide-stone-100">
                         {notifications.map((notification) => {
                            const CardWrapper = notification.url ? Link : 'div';
                            const iconData = getIconData(notification.type);
                            return (
                                <CardWrapper 
                                    key={notification.id}
                                    href={notification.url}
                                    className={`p-4 sm:p-5 flex gap-4 transition-all hover:bg-stone-50/60 active:scale-[0.99] border-l-4 group relative ${
                                        !notification.read_at 
                                        ? 'bg-clay-50/10 border-clay-500' 
                                        : 'border-transparent'
                                    }`}
                                >
                                    <div 
                                        className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${iconData.bgClass}`}
                                        style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                                    >
                                        {iconData.icon}
                                    </div>
                                    <div className="flex-1 min-w-0 pr-12">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h3 className={`text-sm truncate ${!notification.read_at ? 'font-bold text-stone-900' : 'font-semibold text-stone-700'}`}>
                                                {notification.title}
                                            </h3>
                                        </div>
                                        <p className="text-[13px] text-stone-500 leading-relaxed line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] font-medium text-stone-400">
                                                {notification.created_at}
                                            </span>
                                            {notification.url && (
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-clay-600 sm:hidden">
                                                    Tap to view <ArrowRight size={10} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => notification.read_at ? handleMarkAsUnread(e, notification.id) : handleMarkAsRead(notification.id)}
                                            className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-clay-600 hover:bg-stone-50 transition shadow-sm"
                                            title={notification.read_at ? 'Mark as Unread' : 'Mark as Read'}
                                        >
                                            {notification.read_at ? <Mail size={14} /> : <MailOpen size={14} />}
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, notification.id)}
                                            className="p-1.5 rounded-lg border border-red-100 bg-white text-red-500 hover:text-red-700 hover:bg-red-50 transition shadow-sm"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>

                                    {!notification.read_at && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-clay-500 shadow-[0_0_8px_rgba(192,114,81,0.5)] group-hover:hidden"></div>
                                    )}
                                </CardWrapper>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="text-center py-20 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    <Bell size={48} className="mx-auto text-stone-300 mb-4 opacity-40" />
                    <h3 className="text-stone-900 font-bold">No notifications yet</h3>
                    <p className="text-stone-500 text-sm mt-1">We'll let you know when something important happens.</p>
                </div>
            )}
        </div>
    );

    return isSeller ? (
        <div className="flex-1 flex flex-col min-w-0">
            <SellerHeader 
                title="Notifications"
                subtitle="Manage notifications and workspace alerts."
                auth={auth}
            />
            <main className="flex-1 overflow-y-auto">
                {content}
            </main>
        </div>
    ) : (
        <div className="flex-1">
            {content}
        </div>
    );
}

Notifications.layout = (page) => {
    const auth = page.props.auth;
    const role = auth?.user?.role;

    if (role === 'super_admin') {
        return <AdminLayout title="Notifications">{page}</AdminLayout>;
    }
    if (role === 'artisan' || role === 'staff') {
        return <SellerWorkspaceLayout active="notifications">{page}</SellerWorkspaceLayout>;
    }
    return <ShopLayout>{page}</ShopLayout>;
};

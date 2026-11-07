/* global route */
import React, { useState, useMemo } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import SellerWorkspaceLayout from '@/Layouts/SellerWorkspaceLayout';
import AdminLayout from '@/Layouts/AdminLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { 
    Bell, Package, MessageCircle, Star, AlertTriangle, Clock, Trash2, 
    Check, Undo, Award, PackageCheck, Users, Truck, 
    Store, Banknote, ArchiveX, ShieldAlert, XCircle, Mail, MailOpen 
} from 'lucide-react';

const matchesNotificationFilter = (notification, filterKey) => {
    if (filterKey === 'all') return true;
    if (filterKey === 'unread') return !notification.read_at;
    if (filterKey === 'orders') {
        return ['new_order', 'delivery_update', 'replacement_resolution', 'payment_confirmed', 'dispute_accepted', 'dispute_replacement_proposed', 'dispute_rejected', 'dispute_arbitrated_refund', 'dispute_arbitrated_rejected'].includes(notification.type);
    }
    if (filterKey === 'messages') {
        return ['new_message', 'team_message', 'team_channel_message', 'team_mention', 'review_reply'].includes(notification.type);
    }
    if (filterKey === 'attention') {
        return ['low_stock', 'low_stock_warning', 'supply_depleted', 'accounting_rejected', 'accounting_request', 'artisan_application', 'sponsorship_status', 'review_moderation_status', 'review_reply', 'refund_request', 'shipment_deadline', 'product_moderation', 'new_review', 'dispute_escalated', 'dispute_accepted', 'dispute_replacement_proposed', 'dispute_rejected', 'dispute_arbitrated_refund', 'dispute_arbitrated_rejected', 'disciplinary_action', 'off_site_clock_in'].includes(notification.type);
    }
    return true;
};

export default function Notifications({ notifications = [], unreadNotificationCount = 0 }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const [activeFilter, setActiveFilter] = useState('all');
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const handleMarkAsRead = (e, id) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
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

    const confirmClearAll = () => {
        router.delete(route('notifications.clear-all'), { 
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setConfirmClearOpen(false);
            }
        });
    };

    const filterDefinitions = useMemo(() => {
        const isSuperAdmin = user?.role === 'super_admin';
        const isBuyer = !user?.role || user?.role === 'buyer';
        const base = [
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
        ];
        
        if (isSuperAdmin) {
            return [...base, { key: 'attention', label: 'Attention' }];
        }

        if (isBuyer) {
            return [...base, { key: 'orders', label: 'Orders' }, { key: 'messages', label: 'Messages' }];
        }

        return [
            ...base,
            { key: 'orders', label: 'Orders' },
            { key: 'messages', label: 'Messages' },
            { key: 'attention', label: 'Attention' },
        ];
    }, [user?.role]);

    const filteredNotifications = useMemo(() => (
        notifications.filter((notification) => matchesNotificationFilter(notification, activeFilter))
    ), [notifications, activeFilter]);

    const filterCounts = useMemo(() => (
        Object.fromEntries(filterDefinitions.map((filter) => [
            filter.key,
            notifications.filter((notification) => matchesNotificationFilter(notification, filter.key)).length,
        ]))
    ), [notifications, filterDefinitions]);

    const getIconData = (type) => {
        switch (type) {
            case 'new_order':
            case 'payment_confirmed':
                return {
                    mainIcon: <Package size={18} className="text-emerald-700" />,
                    mainBg: 'bg-emerald-100/80',
                    badgeIcon: <Check size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-emerald-600',
                };
            case 'new_message':
            case 'team_message':
            case 'team_channel_message':
            case 'team_mention':
                return {
                    mainIcon: <MessageCircle size={18} className="text-blue-700" />,
                    mainBg: 'bg-blue-100/80',
                    badgeIcon: <MessageCircle size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-blue-600',
                };
            case 'new_review':
                return {
                    mainIcon: <Star size={18} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <Star size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-500',
                };
            case 'review_reply':
                return {
                    mainIcon: <Store size={18} className="text-clay-700" />,
                    mainBg: 'bg-clay-100/90',
                    badgeIcon: <MessageCircle size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-clay-600',
                };
            case 'delivery_update':
                return {
                    mainIcon: <Truck size={18} className="text-indigo-700" />,
                    mainBg: 'bg-indigo-100/80',
                    badgeIcon: <Truck size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-indigo-600',
                };
            case 'refund_request':
            case 'dispute_accepted':
            case 'dispute_arbitrated_refund':
            case 'review_moderation_status':
                return {
                    mainIcon: <Undo size={18} className="text-rose-700" />,
                    mainBg: 'bg-rose-100/80',
                    badgeIcon: <Undo size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-rose-600',
                };
            case 'low_stock':
            case 'low_stock_warning':
                return {
                    mainIcon: <AlertTriangle size={18} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <AlertTriangle size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            case 'sponsorship_status':
                return {
                    mainIcon: <Award size={18} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <Star size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            case 'replacement_resolution':
            case 'dispute_replacement_proposed':
                return {
                    mainIcon: <PackageCheck size={18} className="text-teal-700" />,
                    mainBg: 'bg-teal-100/80',
                    badgeIcon: <Check size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-teal-600',
                };
            case 'accounting_request':
                return {
                    mainIcon: <Banknote size={18} className="text-emerald-700" />,
                    mainBg: 'bg-emerald-100/80',
                    badgeIcon: <Banknote size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-emerald-600',
                };
            case 'accounting_rejected':
            case 'dispute_rejected':
            case 'dispute_arbitrated_rejected':
                return {
                    mainIcon: <XCircle size={18} className="text-rose-700" />,
                    mainBg: 'bg-rose-100/80',
                    badgeIcon: <XCircle size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-rose-600',
                };
            case 'artisan_application':
                return {
                    mainIcon: <Store size={18} className="text-clay-700" />,
                    mainBg: 'bg-clay-100/90',
                    badgeIcon: <Store size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-clay-600',
                };
            case 'shipment_deadline':
            case 'off_site_clock_in':
                return {
                    mainIcon: <Clock size={18} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <Clock size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            case 'supply_depleted':
                return {
                    mainIcon: <ArchiveX size={18} className="text-rose-700" />,
                    mainBg: 'bg-rose-100/80',
                    badgeIcon: <AlertTriangle size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-rose-600',
                };
            case 'product_moderation':
            case 'dispute_escalated':
            case 'disciplinary_action':
                return {
                    mainIcon: <ShieldAlert size={18} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <ShieldAlert size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            default:
                return {
                    mainIcon: <Bell size={18} className="text-stone-600" />,
                    mainBg: 'bg-stone-100',
                    badgeIcon: <Bell size={10} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-clay-600',
                };
        }
    };

    const isSeller = user?.role === 'artisan' || user?.role === 'staff';

    const content = (
        <div className={`max-w-3xl mx-auto px-3 sm:px-6 ${isSeller ? 'py-5' : 'py-6 sm:py-8'}`}>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black text-stone-900 font-sans tracking-tight">
                        Notifications
                    </h1>
                    {unreadNotificationCount > 0 && (
                        <span className="text-xs bg-clay-100 text-clay-700 font-bold px-2.5 py-0.5 rounded-full">
                            {unreadNotificationCount} unread
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {unreadNotificationCount > 0 && (
                        <button 
                            type="button"
                            onClick={handleMarkAllAsRead}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-clay-600 hover:text-clay-700 hover:bg-clay-50 px-3 py-1.5 rounded-xl border border-clay-200/80 transition-colors"
                        >
                            <Check size={13} strokeWidth={2.5} />
                            <span>Mark all read</span>
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button 
                            type="button"
                            onClick={() => setConfirmClearOpen(true)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-colors"
                        >
                            <Trash2 size={13} />
                            <span>Clear all</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Pills Bar (FB style) */}
            <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 scrollbar-hide">
                {filterDefinitions.map((filter) => {
                    const count = filterCounts[filter.key] || 0;
                    const isActive = activeFilter === filter.key;
                    return (
                        <button
                            key={filter.key}
                            type="button"
                            onClick={() => setActiveFilter(filter.key)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all shrink-0 ${
                                isActive
                                    ? 'bg-clay-600 text-white shadow-2xs'
                                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200/80'
                            }`}
                        >
                            <span>{filter.label}</span>
                            {count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                                    isActive ? 'bg-white/25 text-white' : 'bg-stone-100 text-stone-500'
                                }`}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Notification List (FB style compact rows) */}
            {filteredNotifications.length > 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden p-1.5 space-y-0.5 divide-y divide-stone-100/70">
                    {filteredNotifications.map((notification) => {
                        const CardWrapper = notification.url ? Link : 'div';
                        const iconData = getIconData(notification.type);
                        const isUnread = !notification.read_at;

                        return (
                            <CardWrapper 
                                key={notification.id}
                                href={notification.url}
                                className={`rounded-xl p-3 sm:px-3.5 sm:py-3 flex items-start gap-3 transition-colors group relative cursor-pointer ${
                                    isUnread 
                                        ? 'bg-clay-50/45 hover:bg-clay-50/70' 
                                        : 'hover:bg-stone-50/90'
                                }`}
                            >
                                {/* FB-Style Dual-Layer Avatar / Action Badge */}
                                <div className="relative shrink-0 mt-0.5">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconData.mainBg} shadow-2xs`}>
                                        {iconData.mainIcon}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center ring-2 ring-white ${iconData.badgeBg} shadow-xs`}>
                                        {iconData.badgeIcon}
                                    </div>
                                </div>

                                {/* Compact Combined Story Text */}
                                <div className="flex-1 min-w-0 pr-16 sm:pr-20">
                                    <p className={`text-xs sm:text-sm leading-snug line-clamp-2 ${isUnread ? 'text-stone-900 font-semibold' : 'text-stone-600'}`}>
                                        <span className={`font-bold ${isUnread ? 'text-stone-950' : 'text-stone-800'}`}>
                                            {notification.title}
                                        </span>
                                        {notification.message ? ` — ${notification.message}` : ''}
                                    </p>
                                    <p className={`text-[11px] mt-1 font-medium ${isUnread ? 'text-clay-600 font-bold' : 'text-stone-400'}`}>
                                        {notification.created_at}
                                    </p>
                                </div>

                                {/* FB Unread Dot Indicator */}
                                {isUnread && (
                                    <span 
                                        aria-label="Unread notification"
                                        className="w-2.5 h-2.5 rounded-full bg-clay-600 shrink-0 self-center pointer-events-none mr-1 shadow-xs" 
                                    />
                                )}

                                {/* Hover Action Buttons */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        type="button"
                                        onClick={(e) => notification.read_at ? handleMarkAsUnread(e, notification.id) : handleMarkAsRead(e, notification.id)}
                                        className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-500 hover:text-clay-600 hover:bg-stone-50 transition shadow-xs"
                                        title={notification.read_at ? 'Mark as Unread' : 'Mark as Read'}
                                    >
                                        {notification.read_at ? <Mail size={13} /> : <MailOpen size={13} />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDelete(e, notification.id)}
                                        className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-400 hover:text-red-600 hover:bg-red-50 transition shadow-xs"
                                        title="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </CardWrapper>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <Bell size={40} className="mx-auto text-stone-300 mb-2.5 opacity-40" />
                    <h3 className="text-stone-900 font-bold text-sm">No notifications</h3>
                    <p className="text-stone-500 text-xs mt-0.5">
                        {activeFilter === 'all' 
                            ? "We'll let you know when something important happens." 
                            : `No ${activeFilter} notifications to show.`}
                    </p>
                </div>
            )}

            <ConfirmationModal 
                isOpen={confirmClearOpen}
                onClose={() => setConfirmClearOpen(false)}
                onConfirm={confirmClearAll}
                title="Clear All Notifications"
                message="Are you sure you want to delete all notifications? This action cannot be undone."
                icon={Trash2}
                iconBg="bg-red-100 text-red-600"
                confirmText="Yes, Clear All"
                confirmColor="bg-red-600 hover:bg-red-700"
                processing={processing}
            />
        </div>
    );

    return isSeller ? (
        <div className="flex-1 flex flex-col min-w-0">
            <SellerHeader 
                title="Notifications"
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

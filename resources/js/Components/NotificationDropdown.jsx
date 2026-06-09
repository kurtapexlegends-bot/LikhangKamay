import React, { useState, useRef, useEffect, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Package, MessageCircle, Star, AlertTriangle, Check, MoreHorizontal, Trash2, MailOpen, Mail, Award, PackageCheck, Users, Truck, Store, Banknote, CheckCircle, Undo, Clock, ArchiveX, ShieldAlert, XCircle } from 'lucide-react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { formatChatRelative } from '@/lib/chatTime';

const matchesNotificationFilter = (notification, filterKey) => {
    if (filterKey === 'all') {
        return true;
    }

    if (filterKey === 'unread') {
        return !notification.read_at;
    }

    if (filterKey === 'orders') {
        return ['new_order', 'delivery_update', 'replacement_resolution', 'payment_confirmed', 'dispute_accepted', 'dispute_replacement_proposed', 'dispute_rejected', 'dispute_arbitrated_refund', 'dispute_arbitrated_rejected'].includes(notification.type);
    }

    if (filterKey === 'messages') {
        return ['new_message', 'team_message'].includes(notification.type);
    }

    if (filterKey === 'attention') {
        return ['low_stock', 'low_stock_warning', 'supply_depleted', 'accounting_rejected', 'accounting_request', 'artisan_application', 'sponsorship_status', 'review_moderation_status', 'refund_request', 'shipment_deadline', 'product_moderation', 'new_review', 'dispute_escalated', 'dispute_accepted', 'dispute_replacement_proposed', 'dispute_rejected', 'dispute_arbitrated_refund', 'dispute_arbitrated_rejected'].includes(notification.type);
    }

    return true;
};

export default function NotificationDropdown() {
    const { notifications = [], unreadNotificationCount, auth } = usePage().props;
    const [localUnreadNotificationCount, setLocalUnreadNotificationCount] = useState(() => {
        const cached = localStorage.getItem('lk_unread_notifications');
        return cached !== null ? parseInt(cached, 10) : (unreadNotificationCount || 0);
    });
    const [isOpen, setIsOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [relativeNow, setRelativeNow] = useState(() => Date.now());
    const dropdownRef = useRef(null);

    useEffect(() => {
        if (typeof unreadNotificationCount === 'number') {
            setLocalUnreadNotificationCount(unreadNotificationCount);
            localStorage.setItem('lk_unread_notifications', unreadNotificationCount);
        }
    }, [unreadNotificationCount]);

    const filterDefinitions = useMemo(() => {
        const isSuperAdmin = auth?.user?.role === 'super_admin';
        const isBuyer = !auth?.user?.role || auth?.user?.role === 'buyer';
        const base = [
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
        ];
        
        if (isSuperAdmin) {
            return [
                ...base,
                { key: 'attention', label: 'Attention' },
            ];
        }

        if (isBuyer) {
            return [
                ...base,
                { key: 'orders', label: 'Orders' },
                { key: 'messages', label: 'Messages' },
            ];
        }

        return [
            ...base,
            { key: 'orders', label: 'Orders' },
            { key: 'messages', label: 'Messages' },
            { key: 'attention', label: 'Attention' },
        ];
    }, [auth?.user?.role]);

    const filteredNotifications = useMemo(() => (
        notifications.filter((notification) => matchesNotificationFilter(notification, activeFilter))
    ), [notifications, activeFilter]);

    const filterCounts = useMemo(() => (
        Object.fromEntries(filterDefinitions.map((filter) => [
            filter.key,
            notifications.filter((notification) => matchesNotificationFilter(notification, filter.key)).length,
        ]))
    ), [notifications, filterDefinitions]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setActiveMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const tick = window.setInterval(() => {
            setRelativeNow(Date.now());
        }, 30000);

        return () => window.clearInterval(tick);
    }, []);

    // We now use centralized Supabase Realtime in AuthenticatedLayout/MainLayout
    // No more manual polling needed.

    const getIconData = (type) => {
        switch (type) {
            case 'new_order':
            case 'payment_confirmed':
                return {
                    icon: <Package size={16} className="text-emerald-600" />,
                    bgClass: 'bg-emerald-50'
                };
            case 'new_message':
                return {
                    icon: <MessageCircle size={16} className="text-blue-600" />,
                    bgClass: 'bg-blue-50'
                };
            case 'new_review':
                return {
                    icon: <Star size={16} className="text-amber-500" />,
                    bgClass: 'bg-amber-50'
                };
            case 'review_moderation_status':
            case 'refund_request':
            case 'dispute_accepted':
            case 'dispute_arbitrated_refund':
                return {
                    icon: <Undo size={16} className="text-rose-600" />,
                    bgClass: 'bg-rose-50'
                };
            case 'low_stock':
                return {
                    icon: <AlertTriangle size={16} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            case 'low_stock_warning':
                return {
                    icon: <AlertTriangle size={16} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'sponsorship_status':
                return {
                    icon: <Award size={16} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'replacement_resolution':
            case 'dispute_replacement_proposed':
                return {
                    icon: <PackageCheck size={16} className="text-teal-500" />,
                    bgClass: 'bg-teal-50'
                };
            case 'team_message':
                return {
                    icon: <Users size={16} className="text-emerald-600" />,
                    bgClass: 'bg-emerald-50'
                };
            case 'delivery_update':
                return {
                    icon: <Truck size={16} className="text-indigo-600" />,
                    bgClass: 'bg-indigo-50'
                };
            case 'accounting_rejected':
                return {
                    icon: <AlertTriangle size={16} className="text-red-650" />,
                    bgClass: 'bg-red-50'
                };
            case 'accounting_request':
                return {
                    icon: <Banknote size={16} className="text-emerald-600" />,
                    bgClass: 'bg-emerald-50'
                };
            case 'artisan_application':
                return {
                    icon: <Store size={16} className="text-clay-600" />,
                    bgClass: 'bg-clay-50'
                };
            case 'shipment_deadline':
                return {
                    icon: <Clock size={16} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'supply_depleted':
                return {
                    icon: <ArchiveX size={16} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            case 'product_moderation':
            case 'dispute_escalated':
                return {
                    icon: <ShieldAlert size={16} className="text-amber-600" />,
                    bgClass: 'bg-amber-50'
                };
            case 'dispute_rejected':
            case 'dispute_arbitrated_rejected':
                return {
                    icon: <XCircle size={16} className="text-red-600" />,
                    bgClass: 'bg-red-50'
                };
            default:
                return {
                    icon: <Bell size={16} className="text-stone-500" />,
                    bgClass: 'bg-stone-50'
                };
        }
    };

    const handleMarkAsRead = (id, url = null, shouldNavigate = true) => {
        router.post(route('notifications.read', id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                if (shouldNavigate && url) {
                    setIsOpen(false);
                    setActiveMenu(null);
                    router.visit(url, {
                        preserveScroll: true,
                    });
                }
            },
        });
    };

    const handleMarkAsUnread = (e, id) => {
        e.stopPropagation();
        router.post(route('notifications.unread', id), {}, { preserveScroll: true });
        setActiveMenu(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        router.delete(route('notifications.destroy', id), { preserveScroll: true });
        setActiveMenu(null);
    };

    const handleMarkAllAsRead = () => {
        router.post(route('notifications.read-all'), {}, {
            preserveScroll: true,
        });
    };

    const handleClearAll = () => {
        setConfirmClearOpen(true);
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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
                className="inline-flex items-center justify-center rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-clay-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 group"
            >
                <div className="relative inline-flex">
                    <Bell size={20} className="group-hover:scale-110 transition-transform" />
                    {localUnreadNotificationCount > 0 && (
                        <span className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm">
                            {localUnreadNotificationCount > 9 ? '9+' : localUnreadNotificationCount}
                        </span>
                    )}
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="fixed left-4 right-4 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto z-50 mt-2 w-[calc(100vw-2rem)] sm:w-96 md:w-[400px] overflow-hidden rounded-xl border border-stone-200 bg-white animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-4">
                        <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                        <div className="flex items-center gap-3">
                            {localUnreadNotificationCount > 0 && (
                                <button 
                                    onClick={handleMarkAllAsRead}
                                    className="flex items-center gap-1 rounded px-2 py-2 text-xs font-bold text-clay-600 transition-colors hover:text-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 min-h-[44px]"
                                    title="Mark all as read"
                                >
                                    <Check size={12} /> Read All
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleClearAll}
                                    className="flex items-center gap-1 rounded px-2 py-2 text-xs font-medium text-red-500 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 min-h-[44px]"
                                    title="Delete all notifications"
                                >
                                    <Trash2 size={12} /> Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto border-b border-stone-100 bg-white px-3 py-2 no-scrollbar">
                        {filterDefinitions.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setActiveFilter(filter.key)}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors shrink-0 min-h-[36px] ${
                                    activeFilter === filter.key
                                        ? 'border-clay-200 bg-clay-50 text-clay-700'
                                        : 'border-stone-200 bg-white text-stone-500 hover:bg-stone-50'
                                }`}
                            >
                                <span>{filter.label}</span>
                                <span className="text-[10px] opacity-80">{filterCounts[filter.key] || 0}</span>
                            </button>
                        ))}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((notification) => (
                                <div 
                                    key={notification.id}
                                    className={`relative group border-b border-stone-100 p-4 transition-colors hover:bg-stone-50/70 ${
                                        !notification.read_at ? 'bg-clay-50/30' : ''
                                    }`}
                                >
                                    {(() => {
                                        const iconData = getIconData(notification.type);
                                        return (
                                            <div 
                                                onClick={() => handleMarkAsRead(notification.id, notification.url, true)}
                                                className="flex items-start gap-3 cursor-pointer"
                                            >
                                                <div 
                                                    className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconData.bgClass}`}
                                                    style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px' }}
                                                >
                                                    {iconData.icon}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-10 md:pr-6">
                                                    <p className={`text-sm ${!notification.read_at ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 mt-1">
                                                        {notification.created_at_raw
                                                            ? formatChatRelative(notification.created_at_raw, relativeNow)
                                                            : notification.created_at}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                     })()}
                                     {!notification.read_at && (
                                         <div className="absolute right-12 top-1/2 -translate-y-1/2 w-2 h-2 bg-clay-500 rounded-full shrink-0 md:right-3 pointer-events-none"></div>
                                     )}

                                    {/* 3-Dot Menu Trigger */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === notification.id ? null : notification.id);
                                        }}
                                        aria-label="Open notification actions"
                                        className="absolute top-1 right-1 md:top-3 md:right-2 rounded-full text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-stone-200 hover:text-gray-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 w-11 h-11 flex items-center justify-center md:w-8 md:h-8"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    {/* Menu Dropdown */}
                                    {activeMenu === notification.id && (
                                        <div className="absolute top-10 right-2 z-10 w-32 rounded-lg border border-stone-200 bg-white shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100 md:top-8">
                                            <button
                                                onClick={(e) => notification.read_at ? handleMarkAsUnread(e, notification.id) : handleMarkAsRead(notification.id, null, false)}
                                                className="flex w-full items-center gap-2 px-3 py-3 md:py-2 text-left text-xs text-gray-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20 min-h-[44px] md:min-h-0"
                                            >
                                                {notification.read_at ? <Mail size={12} /> : <MailOpen size={12} />}
                                                {notification.read_at ? 'Mark Unread' : 'Mark Read'}
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, notification.id)}
                                                className="flex w-full items-center gap-2 px-3 py-3 md:py-2 text-left text-xs text-red-650 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 min-h-[44px] md:min-h-0"
                                            >
                                                <Trash2 size={12} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">{activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="border-t border-stone-100 bg-stone-50 p-3 text-center">
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="rounded px-1 py-0.5 text-xs text-gray-500 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
                            >
                                Close
                            </button>
                        </div>
                    )}
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
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bell, Package, MessageCircle, Star, AlertTriangle, Check, MoreHorizontal, Trash2, MailOpen, Mail, Award, PackageCheck, Users, Truck, Store, Banknote } from 'lucide-react';
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
        return ['new_order', 'delivery_update', 'replacement_resolution'].includes(notification.type);
    }

    if (filterKey === 'messages') {
        return ['new_message', 'team_message'].includes(notification.type);
    }

    if (filterKey === 'attention') {
        return ['low_stock', 'accounting_rejected', 'artisan_application', 'sponsorship_status', 'review_moderation_status'].includes(notification.type);
    }

    return true;
};

export default function NotificationDropdown() {
    const { notifications = [], unreadNotificationCount = 0, auth } = usePage().props;
    const [isOpen, setIsOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [relativeNow, setRelativeNow] = useState(() => Date.now());
    const dropdownRef = useRef(null);

    const filterDefinitions = useMemo(() => {
        const isSuperAdmin = auth?.user?.role === 'super_admin';
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

    useEffect(() => {
        let cancelled = false;

        const refreshNotifications = () => {
            if (cancelled || document.visibilityState !== 'visible') {
                return;
            }

            router.reload({
                only: ['notifications', 'unreadNotificationCount'],
                preserveScroll: true,
                preserveState: true,
            });
        };

        refreshNotifications();
        const interval = window.setInterval(refreshNotifications, 45000);
        const handleVisibilityChange = () => refreshNotifications();

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'new_order':
                return <Package size={16} className="text-green-500" />;
            case 'new_message':
                return <MessageCircle size={16} className="text-blue-500" />;
            case 'new_review':
                return <Star size={16} className="text-yellow-500" />;
            case 'review_moderation_status':
                return <AlertTriangle size={16} className="text-rose-500" />;
            case 'low_stock':
                return <AlertTriangle size={16} className="text-red-500" />;
            case 'sponsorship_status':
                return <Award size={16} className="text-amber-500" />;
            case 'replacement_resolution':
                return <PackageCheck size={16} className="text-teal-500" />;
            case 'team_message':
                return <Users size={16} className="text-emerald-500" />;
            case 'delivery_update':
                return <Truck size={16} className="text-indigo-500" />;
            case 'accounting_rejected':
                return <AlertTriangle size={16} className="text-red-500" />;
            case 'accounting_request':
                return <Banknote size={16} className="text-emerald-500" />;
            case 'artisan_application':
                return <Store size={16} className="text-clay-600" />;
            default:
                return <Bell size={16} className="text-gray-500" />;
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
                className="relative rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-clay-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
            >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-white">
                        {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-4">
                        <h3 className="font-bold text-gray-900 text-sm">Notifications</h3>
                        <div className="flex items-center gap-3">
                            {unreadNotificationCount > 0 && (
                                <button 
                                    onClick={handleMarkAllAsRead}
                                    className="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-clay-600 transition-colors hover:text-clay-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                                    title="Mark all as read"
                                >
                                    <Check size={12} /> Read All
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleClearAll}
                                    className="flex items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-red-500 transition-colors hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
                                    title="Delete all notifications"
                                >
                                    <Trash2 size={12} /> Clear All
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 overflow-x-auto border-b border-stone-100 bg-white px-3 py-2">
                        {filterDefinitions.map((filter) => (
                            <button
                                key={filter.key}
                                type="button"
                                onClick={() => setActiveFilter(filter.key)}
                                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-bold transition-colors ${
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
                                    <div 
                                        onClick={() => handleMarkAsRead(notification.id, notification.url, true)}
                                        className="flex items-start gap-3 cursor-pointer"
                                    >
                                        <div className="shrink-0 rounded-lg bg-stone-100 p-2">
                                            {getIcon(notification.type)}
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
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
                                        {!notification.read_at && (
                                            <div className="w-2 h-2 bg-clay-500 rounded-full shrink-0 mt-2"></div>
                                        )}
                                    </div>

                                    {/* 3-Dot Menu Trigger */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenu(activeMenu === notification.id ? null : notification.id);
                                        }}
                                        aria-label="Open notification actions"
                                        className="absolute top-3 right-2 rounded-full p-1 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-stone-200 hover:text-gray-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>

                                    {/* Menu Dropdown */}
                                    {activeMenu === notification.id && (
                                        <div className="absolute top-8 right-2 z-10 w-32 rounded-lg border border-stone-200 bg-white py-1 animate-in fade-in zoom-in-95 duration-100">
                                            <button
                                                onClick={(e) => notification.read_at ? handleMarkAsUnread(e, notification.id) : handleMarkAsRead(notification.id, null, false)}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/20"
                                            >
                                                {notification.read_at ? <Mail size={12} /> : <MailOpen size={12} />}
                                                {notification.read_at ? 'Mark Unread' : 'Mark Read'}
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(e, notification.id)}
                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
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

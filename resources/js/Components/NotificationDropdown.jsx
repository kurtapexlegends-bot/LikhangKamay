import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import { 
    Bell, Package, MessageCircle, Star, AlertTriangle, Check, 
    MoreHorizontal, Trash2, MailOpen, Mail, Award, PackageCheck, 
    Users, Truck, Store, Banknote, Undo, Clock, ArchiveX, ShieldAlert, XCircle,
    Loader2
} from 'lucide-react';
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
        return ['new_message', 'team_message', 'team_channel_message', 'team_mention', 'review_reply'].includes(notification.type);
    }

    if (filterKey === 'attention') {
        return ['low_stock', 'low_stock_warning', 'supply_depleted', 'accounting_rejected', 'accounting_request', 'artisan_application', 'sponsorship_status', 'review_moderation_status', 'review_reply', 'refund_request', 'shipment_deadline', 'product_moderation', 'new_review', 'dispute_escalated', 'dispute_accepted', 'dispute_replacement_proposed', 'dispute_rejected', 'dispute_arbitrated_refund', 'dispute_arbitrated_rejected', 'disciplinary_action', 'off_site_clock_in'].includes(notification.type);
    }

    return true;
};

export default function NotificationDropdown() {
    const { notifications = [], unreadNotificationCount, hasMoreNotifications, auth } = usePage().props;
    const [localNotifications, setLocalNotifications] = useState(notifications);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [localUnreadNotificationCount, setLocalUnreadNotificationCount] = useState(() => {
        const cached = localStorage.getItem('lk_unread_notifications');
        return cached !== null ? parseInt(cached, 10) : (unreadNotificationCount || 0);
    });
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeMenu, setActiveMenu] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all');
    const [confirmClearOpen, setConfirmClearOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [relativeNow, setRelativeNow] = useState(() => Date.now());
    const dropdownRef = useRef(null);

    // Sync local notifications when props.notifications updates (e.g. from reload or realtime sync)
    useEffect(() => {
        if (notifications && notifications.length > 0) {
            setLocalNotifications(prev => {
                if (!prev || prev.length === 0) return notifications;
                const propMap = new Map((notifications || []).map(n => [n.id, n]));
                const updated = prev.map(item => propMap.get(item.id) || item);
                const existingIds = new Set(prev.map(p => p.id));
                const freshItems = (notifications || []).filter(n => !existingIds.has(n.id));
                return [...freshItems, ...updated];
            });

            if (typeof hasMoreNotifications === 'boolean') {
                setHasMore(hasMoreNotifications);
            } else {
                setHasMore(notifications.length >= 10);
            }
        }
    }, [notifications, hasMoreNotifications]);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            router.reload({
                only: ['notifications', 'unreadNotificationCount', 'hasMoreNotifications'],
                preserveScroll: true,
                preserveState: true,
                onFinish: () => setLoading(false),
            });
        }
    }, [isOpen]);

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
        localNotifications.filter((notification) => matchesNotificationFilter(notification, activeFilter))
    ), [localNotifications, activeFilter]);

    const filterCounts = useMemo(() => (
        Object.fromEntries(filterDefinitions.map((filter) => [
            filter.key,
            localNotifications.filter((notification) => matchesNotificationFilter(notification, filter.key)).length,
        ]))
    ), [localNotifications, filterDefinitions]);

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

    const handleLoadPrevious = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (loadingMore) return;
        setLoadingMore(true);
        try {
            const response = await axios.get(route('notifications.index'), {
                params: {
                    offset: localNotifications.length,
                    limit: 10,
                },
                headers: {
                    'Accept': 'application/json',
                },
            });

            const newBatch = response.data?.notifications || [];
            setHasMore(Boolean(response.data?.has_more));

            if (newBatch.length > 0) {
                setLocalNotifications(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNew = newBatch.filter(item => !existingIds.has(item.id));
                    return [...prev, ...uniqueNew];
                });
            }
        } catch (err) {
            console.error('Failed to load previous notifications:', err);
        } finally {
            setLoadingMore(false);
        }
    };

    // We now use centralized Supabase Realtime in AuthenticatedLayout/MainLayout
    // No more manual polling needed.

    const getIconData = (type) => {
        switch (type) {
            case 'new_order':
            case 'payment_confirmed':
                return {
                    mainIcon: <Package size={17} className="text-emerald-700" />,
                    mainBg: 'bg-emerald-100/80',
                    badgeIcon: <Check size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-emerald-600',
                };
            case 'new_message':
            case 'team_message':
            case 'team_channel_message':
            case 'team_mention':
                return {
                    mainIcon: <MessageCircle size={17} className="text-blue-700" />,
                    mainBg: 'bg-blue-100/80',
                    badgeIcon: <MessageCircle size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-blue-600',
                };
            case 'new_review':
                return {
                    mainIcon: <Star size={17} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <Star size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-500',
                };
            case 'review_reply':
                return {
                    mainIcon: <Store size={17} className="text-clay-700" />,
                    mainBg: 'bg-clay-100/90',
                    badgeIcon: <MessageCircle size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-clay-600',
                };
            case 'delivery_update':
                return {
                    mainIcon: <Truck size={17} className="text-indigo-700" />,
                    mainBg: 'bg-indigo-100/80',
                    badgeIcon: <Truck size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-indigo-600',
                };
            case 'refund_request':
            case 'dispute_accepted':
            case 'dispute_arbitrated_refund':
            case 'review_moderation_status':
                return {
                    mainIcon: <Undo size={17} className="text-rose-700" />,
                    mainBg: 'bg-rose-100/80',
                    badgeIcon: <Undo size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-rose-600',
                };
            case 'low_stock':
            case 'low_stock_warning':
                return {
                    mainIcon: <AlertTriangle size={17} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <AlertTriangle size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            case 'sponsorship_status':
                return {
                    mainIcon: <Award size={17} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <Star size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            case 'replacement_resolution':
            case 'dispute_replacement_proposed':
                return {
                    mainIcon: <PackageCheck size={17} className="text-teal-700" />,
                    mainBg: 'bg-teal-100/80',
                    badgeIcon: <Check size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-teal-600',
                };
            case 'accounting_request':
                return {
                    mainIcon: <Banknote size={17} className="text-emerald-700" />,
                    mainBg: 'bg-emerald-100/80',
                    badgeIcon: <Banknote size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-emerald-600',
                };
            case 'accounting_rejected':
            case 'dispute_rejected':
            case 'dispute_arbitrated_rejected':
                return {
                    mainIcon: <XCircle size={17} className="text-rose-700" />,
                    mainBg: 'bg-rose-100/80',
                    badgeIcon: <XCircle size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-rose-600',
                };
            case 'artisan_application':
                return {
                    mainIcon: <Store size={17} className="text-clay-700" />,
                    mainBg: 'bg-clay-100/90',
                    badgeIcon: <Store size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-clay-600',
                };
            case 'shipment_deadline':
            case 'off_site_clock_in':
                return {
                    mainIcon: <Clock size={17} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <Clock size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            case 'supply_depleted':
                return {
                    mainIcon: <ArchiveX size={17} className="text-rose-700" />,
                    mainBg: 'bg-rose-100/80',
                    badgeIcon: <AlertTriangle size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-rose-600',
                };
            case 'product_moderation':
            case 'dispute_escalated':
            case 'disciplinary_action':
                return {
                    mainIcon: <ShieldAlert size={17} className="text-amber-700" />,
                    mainBg: 'bg-amber-100/80',
                    badgeIcon: <ShieldAlert size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-amber-600',
                };
            default:
                return {
                    mainIcon: <Bell size={17} className="text-stone-600" />,
                    mainBg: 'bg-stone-100',
                    badgeIcon: <Bell size={9} className="text-white" strokeWidth={3} />,
                    badgeBg: 'bg-clay-600',
                };
        }
    };

    const handleMarkAsRead = (id, url = null, shouldNavigate = true) => {
        setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
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
        setLocalNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: null } : n));
        router.post(route('notifications.unread', id), {}, { preserveScroll: true });
        setActiveMenu(null);
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        setLocalNotifications(prev => prev.filter(n => n.id !== id));
        router.delete(route('notifications.destroy', id), { preserveScroll: true });
        setActiveMenu(null);
    };

    const handleMarkAllAsRead = () => {
        setLocalNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
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
                setLocalNotifications([]);
                setHasMore(false);
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
                        <span aria-hidden="true" className="absolute -top-1 -right-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[8px] font-bold leading-none text-white shadow-sm">
                            {localUnreadNotificationCount > 9 ? '9+' : localUnreadNotificationCount}
                        </span>
                    )}
                </div>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto z-50 mt-2 w-[calc(100vw-1.5rem)] sm:w-[380px] md:w-[410px] overflow-hidden rounded-2xl border border-stone-200/90 bg-white animate-in fade-in slide-in-from-top-2 duration-200 shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-stone-100 bg-white px-4 py-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-extrabold text-stone-900 text-base tracking-tight">Notifications</h3>
                            {localUnreadNotificationCount > 0 && (
                                <span className="text-[10px] bg-clay-100 text-clay-700 font-bold px-2 py-0.5 rounded-full">
                                    {localUnreadNotificationCount} new
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {localUnreadNotificationCount > 0 && (
                                <button 
                                    type="button"
                                    onClick={handleMarkAllAsRead}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-clay-600 transition-colors hover:text-clay-700 hover:bg-clay-50"
                                    title="Mark all as read"
                                >
                                    <Check size={12} strokeWidth={2.5} />
                                    <span>Read All</span>
                                </button>
                            )}
                            {localNotifications.length > 0 && (
                                <button 
                                    type="button"
                                    onClick={handleClearAll}
                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-stone-400 transition-colors hover:text-red-600 hover:bg-red-50"
                                    title="Delete all notifications"
                                >
                                    <Trash2 size={12} />
                                    <span>Clear</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Pills Bar (FB style) */}
                    <div className="flex gap-1.5 overflow-x-auto border-b border-stone-100 bg-stone-50/50 px-3 py-2 scrollbar-hide">
                        {filterDefinitions.map((filter) => {
                            const count = filterCounts[filter.key] || 0;
                            const isActive = activeFilter === filter.key;
                            return (
                                <button
                                    key={filter.key}
                                    type="button"
                                    onClick={() => setActiveFilter(filter.key)}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all shrink-0 ${
                                        isActive
                                            ? 'bg-clay-600 text-white shadow-2xs'
                                            : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200/60'
                                    }`}
                                >
                                    <span>{filter.label}</span>
                                    {count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                                        }`}>
                                            {count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Notification List (FB style compact rows) */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-stone-100/70 p-1.5 space-y-0.5">
                        {filteredNotifications.length > 0 ? (
                            filteredNotifications.map((notification) => {
                                const isUnread = !notification.read_at;
                                const iconData = getIconData(notification.type);
                                return (
                                    <div 
                                        key={notification.id}
                                        onClick={() => handleMarkAsRead(notification.id, notification.url, true)}
                                        className={`relative group rounded-xl p-2.5 transition-colors cursor-pointer flex items-start gap-3 ${
                                            isUnread 
                                                ? 'bg-clay-50/45 hover:bg-clay-50/70' 
                                                : 'hover:bg-stone-50/90'
                                        }`}
                                    >
                                        {/* FB-Style Dual-Layer Icon / Avatar */}
                                        <div className="relative shrink-0 mt-0.5">
                                            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${iconData.mainBg} shadow-2xs`}>
                                                {iconData.mainIcon}
                                            </div>
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white ${iconData.badgeBg} shadow-xs`}>
                                                {iconData.badgeIcon}
                                            </div>
                                        </div>

                                        {/* Compact Combined Text Content */}
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={`text-xs leading-snug line-clamp-2 ${isUnread ? 'text-stone-900 font-semibold' : 'text-stone-600'}`}>
                                                <span className={`font-bold ${isUnread ? 'text-stone-950' : 'text-stone-800'}`}>
                                                    {notification.title}
                                                </span>
                                                {notification.message ? ` — ${notification.message}` : ''}
                                            </p>
                                            <p className={`text-[11px] mt-0.5 font-medium ${isUnread ? 'text-clay-600 font-bold' : 'text-stone-400'}`}>
                                                {notification.created_at_raw
                                                    ? formatChatRelative(notification.created_at_raw, relativeNow)
                                                    : notification.created_at}
                                            </p>
                                        </div>

                                        {/* FB Unread Dot Indicator */}
                                        {isUnread && (
                                            <span 
                                                aria-label="Unread notification"
                                                className="w-2.5 h-2.5 rounded-full bg-clay-600 shrink-0 self-center pointer-events-none mr-1 shadow-xs" 
                                            />
                                        )}

                                        {/* 3-Dot Quick Action Menu */}
                                        <div className="absolute right-2 top-2">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === notification.id ? null : notification.id);
                                                }}
                                                aria-label="Open notification actions"
                                                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 p-1 transition-opacity"
                                            >
                                                <MoreHorizontal size={14} />
                                            </button>

                                            {activeMenu === notification.id && (
                                                <div 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute top-6 right-0 z-20 w-32 rounded-xl border border-stone-200 bg-white shadow-lg py-1 animate-in fade-in zoom-in-95 duration-100"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setActiveMenu(null);
                                                            if (notification.read_at) {
                                                                handleMarkAsUnread(e, notification.id);
                                                            } else {
                                                                handleMarkAsRead(notification.id, null, false);
                                                            }
                                                        }}
                                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
                                                    >
                                                        {notification.read_at ? <Mail size={12} /> : <MailOpen size={12} />}
                                                        <span>{notification.read_at ? 'Mark Unread' : 'Mark Read'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleDelete(e, notification.id)}
                                                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={12} />
                                                        <span>Delete</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        ) : loading ? (
                            <div className="py-10 text-center text-stone-400">
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clay-500 border-t-transparent mx-auto mb-2"></div>
                                <p className="text-xs font-medium text-stone-500">Loading notifications...</p>
                            </div>
                        ) : (
                            <div className="py-10 text-center text-stone-400">
                                <Bell size={28} className="mx-auto mb-1.5 opacity-30 text-stone-400" />
                                <p className="text-xs font-medium">{activeFilter === 'all' ? 'No notifications yet' : `No ${activeFilter} notifications`}</p>
                                {hasMore && (
                                    <button
                                        type="button"
                                        onClick={handleLoadPrevious}
                                        disabled={loadingMore}
                                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-clay-700 hover:text-clay-800 bg-stone-100 hover:bg-stone-200/80 px-3.5 py-1.5 rounded-xl transition-colors border border-stone-200/60"
                                    >
                                        {loadingMore ? <Loader2 size={12} className="animate-spin text-clay-600" /> : <Clock size={12} className="text-clay-600" />}
                                        <span>See previous notifications</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {/* FB-style "See previous notifications" pagination */}
                        {filteredNotifications.length > 0 && (
                            hasMore ? (
                                <div className="pt-2 pb-1 px-1">
                                    <button
                                        type="button"
                                        onClick={handleLoadPrevious}
                                        disabled={loadingMore}
                                        className="w-full py-2.5 px-3 text-xs font-bold text-clay-700 hover:text-clay-800 hover:bg-stone-100/90 active:bg-stone-200/70 rounded-xl transition-all flex items-center justify-center gap-2 border border-stone-200/70 shadow-2xs group"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin text-clay-600" />
                                                <span>Loading previous notifications...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Clock size={13} className="text-clay-600 group-hover:scale-110 transition-transform" />
                                                <span>See previous notifications</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : localNotifications.length > 0 ? (
                                <div className="py-2.5 text-center">
                                    <p className="text-[11px] font-semibold text-stone-400">
                                        You&apos;re all caught up
                                    </p>
                                </div>
                            ) : null
                        )}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 flex items-center justify-between text-xs">
                        <Link 
                            href={route('notifications.index')}
                            onClick={() => setIsOpen(false)}
                            className="font-bold text-stone-500 hover:text-clay-700 transition-colors py-1 sm:hidden"
                        >
                            Open Full Page
                        </Link>
                        <span className="hidden sm:inline-block text-[11px] font-medium text-stone-400">
                            {localNotifications.length} notification{localNotifications.length === 1 ? '' : 's'}
                        </span>
                        <button 
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="font-semibold text-stone-500 hover:text-stone-800 transition-colors py-1 px-2.5 rounded-lg hover:bg-stone-200/50"
                        >
                            Close
                        </button>
                    </div>
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

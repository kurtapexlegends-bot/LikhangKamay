import { useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/Components/ToastContext';
import useNetworkStatus from '@/hooks/useNetworkStatus';

/**
 * useRealtime hook
 * Listens for database changes and triggers Inertia reloads for specific keys.
 * Falls back to active Inertia polling if Supabase is unavailable in local environment.
 */
export const useRealtime = () => {
    const { props, url } = usePage();
    const { auth, notifications, currentChatUser, currentChannel } = props;
    const { addToast } = useToast();
    const { isDegraded } = useNetworkStatus();
    const user = auth?.user;
    const seenNotificationIdsRef = useRef(new Set());
    const prevUrlRef = useRef(url);
    const initialReloadFinished = useRef(false);
    const isReloadingRef = useRef(false);
    const isDegradedRef = useRef(isDegraded);
    useEffect(() => {
        isDegradedRef.current = isDegraded;
    }, [isDegraded]);

    // Track when notifications prop changes to display visual toasts ONLY for genuinely new real-time unread items
    useEffect(() => {
        if (!user) {
            initialReloadFinished.current = false;
            seenNotificationIdsRef.current.clear();
            prevUrlRef.current = url;
            return;
        }

        // If notifications is undefined, it has not been loaded (or has been flushed by full visit)
        if (notifications === undefined) {
            return;
        }

        const isNavigating = prevUrlRef.current !== url;
        prevUrlRef.current = url;

        const isNotificationsPage = 
            (url && url.startsWith('/notifications')) || 
            (typeof window !== 'undefined' && window.location.pathname.startsWith('/notifications'));

        // If this is initial load, page navigation, or the user is viewing the notifications page,
        // register all existing IDs so they are never flagged as new notifications, and never show toasts.
        if (!initialReloadFinished.current || isNavigating || isNotificationsPage) {
            (notifications || []).forEach(n => {
                if (n?.id) seenNotificationIdsRef.current.add(n.id);
            });
            initialReloadFinished.current = true;
            return;
        }

        // Only process items that are unread, never seen, and created recently (within last 2 minutes)
        const now = Date.now();
        const newUnread = (notifications || []).filter(n => {
            if (!n || n.read_at || seenNotificationIdsRef.current.has(n.id)) {
                return false;
            }

            // Recency guard: real-time events are created within the last 2 minutes.
            // Historical unread items from expanded paginations/reloads must never trigger toast popups.
            if (n.created_at_raw) {
                const createdAtMs = new Date(n.created_at_raw).getTime();
                if (!isNaN(createdAtMs) && (now - createdAtMs > 120000)) {
                    seenNotificationIdsRef.current.add(n.id);
                    return false;
                }
            }

            return true;
        });
        
        if (newUnread.length > 0) {
            newUnread.forEach(n => {
                seenNotificationIdsRef.current.add(n.id);
                if (n.type === 'new_message' || n.type === 'team_message') {
                    if (currentChatUser && Number(n.sender_id) === Number(currentChatUser.id)) {
                        return; // Skip toast for active conversation counterpart
                    }
                }
                addToast(
                    n.message ? `${n.title}: ${n.message}` : n.title,
                    'info',
                    6000
                );
            });
        }

        (notifications || []).forEach(n => {
            if (n?.id) seenNotificationIdsRef.current.add(n.id);
        });
    }, [notifications, url, user, addToast, currentChatUser, currentChannel]);

    useEffect(() => {
        if (!user) return;

        let notificationChannel = null;
        let sellerNotificationChannel = null;
        let orderChannel = null;
        let buyerOrderChannel = null;
        let adminChannel = null;
        let fallbackPollTimeout = null;
        let isDisposed = false;

        const getPollKeys = () => {
            const reloadKeys = ['notifications', 'unreadNotificationCount', 'unreadMessageCount'];
            const path = window.location.pathname;

            if (path.includes('/products')) {
                reloadKeys.push('products', 'metrics');
            }
            if (path.includes('/seller/pos')) {
                reloadKeys.push('products', 'recentOrders', 'historySummary');
            }
            if (path.includes('/orders') || path.includes('/my-orders')) {
                reloadKeys.push('orders', 'tabCounts');
            }
            if (path.includes('/admin/catalog')) {
                reloadKeys.push('products');
            }
            if (path.includes('/admin/disputes')) {
                reloadKeys.push('disputes');
            }
            if (path.includes('/admin/payouts')) {
                reloadKeys.push('payouts');
            }
            if (path.includes('/hr')) {
                reloadKeys.push('staff', 'payrolls', 'locations');
            }
            if (path.includes('/procurement')) {
                reloadKeys.push('supplies', 'requests', 'finances', 'totalItems', 'lowStockItems', 'totalValue');
            }
            if (path.includes('/accounting')) {
                reloadKeys.push('pendingRequests', 'history', 'finances', 'channelBreakdown');
            }
            if (path.includes('/reviews')) {
                reloadKeys.push('reviews');
            }
            if (path.includes('/approvals')) {
                reloadKeys.push('approvals', 'pendingCount', 'stats');
            }
            if (path.includes('/stock-request')) {
                reloadKeys.push('requests');
            }
            if (path.includes('/wholesale-sales')) {
                reloadKeys.push('orders', 'activeSalesCount', 'pendingSalesCount', 'processingSalesCount', 'shippedSalesCount', 'deliveredSalesCount', 'completedSalesCount', 'cancelledSalesCount');
            }
            if (path.includes('/sourcing-orders')) {
                reloadKeys.push('orders', 'activeOrdersCount', 'deliveredOrdersCount', 'completedOrdersCount', 'cancelledOrdersCount', 'openOrdersCount');
            }
            if (path.includes('/driver-deliveries') || path.includes('/deliveries')) {
                reloadKeys.push('activeDeliveries', 'completedToday', 'driverProfile');
            }
            if (path.includes('/staff') && !path.includes('/driver-deliveries')) {
                reloadKeys.push('attendance', 'hub');
            }

            if (user.role === 'super_admin') {
                reloadKeys.push('pendingArtisanCount', 'logs', 'adminStats');
            } else if (user.role === 'artisan' || user.role === 'staff') {
                reloadKeys.push('metrics', 'stats', 'recentOrders');
            }
            return reloadKeys;
        };

        const executeSync = () => {
            if (isReloadingRef.current || isDisposed) return;
            if (typeof document !== 'undefined' && document.hidden) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;

            isReloadingRef.current = true;
            router.reload({
                only: getPollKeys(),
                preserveScroll: true,
                preserveState: true,
                showProgress: false,
                onFinish: () => {
                    isReloadingRef.current = false;
                },
            });
        };

        const scheduleFallbackPoll = (delayMs) => {
            if (isDisposed) return;
            if (fallbackPollTimeout) {
                clearTimeout(fallbackPollTimeout);
                fallbackPollTimeout = null;
            }

            fallbackPollTimeout = setTimeout(() => {
                if (isDisposed) return;

                if (typeof document !== 'undefined' && document.hidden) {
                    // Sleep while tab is backgrounded; wake up on focus/visibilitychange
                    return;
                }
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    return;
                }

                if (isReloadingRef.current) {
                    // Previous reload is still in flight; defer next tick
                    scheduleFallbackPoll(3500);
                    return;
                }

                isReloadingRef.current = true;
                router.reload({
                    only: getPollKeys(),
                    preserveScroll: true,
                    preserveState: true,
                    showProgress: false,
                    onFinish: () => {
                        isReloadingRef.current = false;
                        if (!isDisposed) {
                            const nextDelay = isDegradedRef.current ? 18000 : 5000;
                            scheduleFallbackPoll(nextDelay);
                        }
                    },
                });
            }, delayMs);
        };

        const startFallbackPolling = () => {
            if (fallbackPollTimeout) return;
            const initialDelay = isDegradedRef.current ? 18000 : 5000;
            scheduleFallbackPoll(initialDelay);
        };

        const stopFallbackPolling = () => {
            if (fallbackPollTimeout) {
                clearTimeout(fallbackPollTimeout);
                fallbackPollTimeout = null;
            }
        };

        if (supabase) {
            // Notification Listener for User directly
            notificationChannel = supabase
                .channel(`notifications:notifiable_id=eq.${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'notifications',
                        filter: `notifiable_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const notifData = typeof payload.new.data === 'string' 
                            ? JSON.parse(payload.new.data) 
                            : payload.new.data;

                        const notifType = notifData?.type;
                        const notifChannelId = notifData?.team_channel_id;
                        const notifSenderId = notifData?.sender_id;

                        // If viewing active chat, skip database reload to prevent race conditions
                        if (
                            window.location.pathname.includes('/team-messages') &&
                            (notifType === 'team_channel_message' || notifType === 'team_mention' || notifType === 'team_message')
                        ) {
                            if (notifChannelId && currentChannel && Number(notifChannelId) === Number(currentChannel.id)) {
                                return;
                            }
                            if (!notifChannelId && currentChatUser && Number(notifSenderId) === Number(currentChatUser.id)) {
                                return;
                            }
                        }
                        
                        executeSync();
                        window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }));
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        // Do not shut down fallback polling when Supabase connects:
                        // production mutations live in Neon PostgreSQL.
                    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                        startFallbackPolling();
                    }
                });

            // Notification Listener for Effective Seller Owner (for Staff)
            const effectiveSellerId = auth?.effectiveSellerId;
            if (effectiveSellerId && effectiveSellerId !== user.id) {
                sellerNotificationChannel = supabase
                    .channel(`notifications:notifiable_id=eq.${effectiveSellerId}`)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'notifications',
                            filter: `notifiable_id=eq.${effectiveSellerId}`,
                        },
                        (payload) => {
                            const notifData = typeof payload.new.data === 'string' 
                                ? JSON.parse(payload.new.data) 
                                : payload.new.data;

                            const notifType = notifData?.type;
                            const notifChannelId = notifData?.team_channel_id;
                            const notifSenderId = notifData?.sender_id;

                            if (
                                window.location.pathname.includes('/team-messages') &&
                                (notifType === 'team_channel_message' || notifType === 'team_mention' || notifType === 'team_message')
                            ) {
                                if (notifChannelId && currentChannel && Number(notifChannelId) === Number(currentChannel.id)) {
                                    return;
                                }
                                if (!notifChannelId && currentChatUser && Number(notifSenderId) === Number(currentChatUser.id)) {
                                    return;
                                }
                            }
                            
                            executeSync();
                            window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }));
                        }
                    )
                    .subscribe();
            }

            // Order Listener (for Artisans & Staff)
            const isSellerActor = user.role === 'artisan' || user.role === 'staff';
            const sellerIdForOrders = effectiveSellerId || user.id;

            if (isSellerActor && sellerIdForOrders) {
                orderChannel = supabase
                    .channel(`orders:artisan_id=eq.${sellerIdForOrders}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'orders',
                            filter: `artisan_id=eq.${sellerIdForOrders}`,
                        },
                        (payload) => {
                            if (payload.eventType === 'INSERT' && payload.new?.order_type !== 'pos_walkin') {
                                addToast(`New Order Received! #${payload.new.order_number}`, 'success', 8000);
                                window.dispatchEvent(new CustomEvent('new-order', { detail: payload.new }));
                            }

                            const currentPath = window.location.pathname;
                            let posOnlyKeys = ['orders', 'metrics', 'stats', 'recentOrders', 'tabCounts'];
                            if (currentPath.includes('/seller/pos')) {
                                posOnlyKeys = [...posOnlyKeys, 'products', 'historySummary'];
                            } else if (currentPath.includes('/accounting')) {
                                posOnlyKeys = ['pendingRequests', 'history', 'finances', 'channelBreakdown'];
                            }

                            router.reload({
                                only: posOnlyKeys,
                                preserveScroll: true,
                            });
                        }
                    )
                    .subscribe();
            }

            // Order Listener (for Buyers)
            if (!isSellerActor && user?.id) {
                buyerOrderChannel = supabase
                    .channel(`orders:user_id=eq.${user.id}`)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'orders',
                            filter: `user_id=eq.${user.id}`,
                        },
                        () => {
                            router.reload({
                                only: ['orders'],
                                preserveScroll: true,
                            });
                        }
                    )
                    .subscribe();
            }

            // Admin Activity Listener
            if (user.role === 'super_admin') {
                adminChannel = supabase
                    .channel('admin-activity')
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'platform_activities',
                        },
                        (payload) => {
                            router.reload({
                                only: ['logs', 'adminStats'],
                                preserveScroll: true,
                            });
                        }
                    )
                    .subscribe();
            }

            // Always run fallback polling alongside Supabase: production database mutations commit to Neon PostgreSQL
            startFallbackPolling();

            // Visibility / focus event listener for immediate sync
            const handleFocusSync = () => {
                if (typeof document !== 'undefined' && !document.hidden && typeof navigator !== 'undefined' && navigator.onLine) {
                    executeSync();
                    startFallbackPolling();
                }
            };
            window.addEventListener('focus', handleFocusSync);
            document.addEventListener('visibilitychange', handleFocusSync);

            return () => {
                isDisposed = true;
                isReloadingRef.current = false;
                window.removeEventListener('focus', handleFocusSync);
                document.removeEventListener('visibilitychange', handleFocusSync);
                if (notificationChannel) supabase.removeChannel(notificationChannel);
                if (sellerNotificationChannel) supabase.removeChannel(sellerNotificationChannel);
                if (orderChannel) supabase.removeChannel(orderChannel);
                if (buyerOrderChannel) supabase.removeChannel(buyerOrderChannel);
                if (adminChannel) supabase.removeChannel(adminChannel);
                stopFallbackPolling();
            };
        } else {
            startFallbackPolling();

            const handleFocusSync = () => {
                if (typeof document !== 'undefined' && !document.hidden && typeof navigator !== 'undefined' && navigator.onLine) {
                    executeSync();
                    startFallbackPolling();
                }
            };
            window.addEventListener('focus', handleFocusSync);
            document.addEventListener('visibilitychange', handleFocusSync);

            return () => {
                isDisposed = true;
                isReloadingRef.current = false;
                window.removeEventListener('focus', handleFocusSync);
                document.removeEventListener('visibilitychange', handleFocusSync);
                stopFallbackPolling();
            };
        }
    }, [user?.id, auth?.effectiveSellerId]);
};

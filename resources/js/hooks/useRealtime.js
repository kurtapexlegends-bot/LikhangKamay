import { useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/Components/ToastContext';

/**
 * useRealtime hook
 * Listens for database changes and triggers Inertia reloads for specific keys.
 * Falls back to active Inertia polling if Supabase is unavailable in local environment.
 */
export const useRealtime = () => {
    const { auth, notifications, currentChatUser } = usePage().props;
    const { addToast } = useToast();
    const user = auth?.user;
    const prevNotificationsRef = useRef(undefined);
    const initialReloadFinished = useRef(false);

    // Track when notifications prop changes to display visual toasts for newly received unread items
    useEffect(() => {
        if (!user) {
            initialReloadFinished.current = false;
            prevNotificationsRef.current = undefined;
            return;
        }

        // If notifications is undefined, it has not been loaded (or has been flushed by full visit)
        if (notifications === undefined) {
            initialReloadFinished.current = false;
            prevNotificationsRef.current = undefined;
            return;
        }
        
        if (!initialReloadFinished.current) {
            prevNotificationsRef.current = notifications;
            initialReloadFinished.current = true;
            return;
        }

        const prev = prevNotificationsRef.current || [];
        const newUnread = (notifications || []).filter(n => 
            !n.read_at && !prev.some(p => p.id === n.id)
        );
        
        if (newUnread.length > 0) {
            newUnread.forEach(n => {
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
        prevNotificationsRef.current = notifications;
    }, [notifications, user, addToast, currentChatUser]);

    useEffect(() => {
        if (!user) return;

        // 1. Initial reload of lazy-loaded notification and message counters on mount
        const initialReloadKeys = ['notifications', 'unreadNotificationCount', 'unreadMessageCount'];
        if (user.role === 'super_admin') {
            initialReloadKeys.push('pendingArtisanCount');
        }
        router.reload({
            only: initialReloadKeys,
            preserveScroll: true,
            preserveState: true,
        });

        // 2. Setup Supabase real-time sync if available, or fall back to polling
        let notificationChannel = null;
        let sellerNotificationChannel = null;
        let orderChannel = null;
        let adminChannel = null;
        let fallbackPollInterval = null;

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
                        console.log('New notification received via Supabase:', payload);
                        
                        const reloadKeys = ['notifications', 'unreadNotificationCount'];
                        if (window.location.pathname.includes('/products')) {
                            reloadKeys.push('products');
                            reloadKeys.push('metrics');
                        }
                        if (window.location.pathname.includes('/orders')) {
                            reloadKeys.push('orders');
                        }
                        if (window.location.pathname.includes('/admin/catalog')) {
                            reloadKeys.push('products');
                        }

                        router.reload({
                            only: reloadKeys,
                            preserveScroll: true,
                        });
                        
                        window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }));
                    }
                )
                .subscribe();

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
                            console.log('New shop notification received via Supabase:', payload);
                            
                            const reloadKeys = ['notifications', 'unreadNotificationCount'];
                            if (window.location.pathname.includes('/products')) {
                                reloadKeys.push('products');
                                reloadKeys.push('metrics');
                            }
                            if (window.location.pathname.includes('/orders')) {
                                reloadKeys.push('orders');
                            }

                            router.reload({
                                only: reloadKeys,
                                preserveScroll: true,
                            });
                            
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
                            console.log('Order update received:', payload);
                            
                            if (payload.eventType === 'INSERT') {
                                addToast(`New Order Received! #${payload.new.order_number}`, 'success', 8000);
                                window.dispatchEvent(new CustomEvent('new-order', { detail: payload.new }));
                            }

                            router.reload({
                                only: ['orders', 'stats', 'recentOrders'],
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
                            table: 'activity_logs',
                        },
                        (payload) => {
                            console.log('Admin activity received:', payload);
                            router.reload({
                                only: ['logs', 'adminStats'],
                                preserveScroll: true,
                            });
                        }
                    )
                    .subscribe();
            }
        } else {
            console.log('Supabase not available. Falling back to active Inertia polling...');
            fallbackPollInterval = setInterval(() => {
                const reloadKeys = ['notifications', 'unreadNotificationCount', 'unreadMessageCount'];
                if (window.location.pathname.includes('/products')) {
                    reloadKeys.push('products');
                    reloadKeys.push('metrics');
                }
                if (window.location.pathname.includes('/orders')) {
                    reloadKeys.push('orders');
                }
                if (window.location.pathname.includes('/admin/catalog')) {
                    reloadKeys.push('products');
                }
                if (user.role === 'super_admin') {
                    reloadKeys.push('pendingArtisanCount');
                    reloadKeys.push('logs');
                    reloadKeys.push('adminStats');
                } else if (user.role === 'artisan' || user.role === 'staff') {
                    reloadKeys.push('stats');
                    reloadKeys.push('recentOrders');
                }

                router.reload({
                    only: reloadKeys,
                    preserveScroll: true,
                    preserveState: true,
                });
            }, 8000); // Check every 8 seconds
        }

        return () => {
            if (notificationChannel) supabase.removeChannel(notificationChannel);
            if (sellerNotificationChannel) supabase.removeChannel(sellerNotificationChannel);
            if (orderChannel) supabase.removeChannel(orderChannel);
            if (adminChannel) supabase.removeChannel(adminChannel);
            if (fallbackPollInterval) clearInterval(fallbackPollInterval);
        };
    }, [user?.id, auth?.effectiveSellerId]);
};

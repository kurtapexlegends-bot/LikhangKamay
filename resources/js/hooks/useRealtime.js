import { useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { supabase } from '@/utils/supabase';
import { useToast } from '@/Components/ToastContext';

/**
 * useRealtime hook
 * Listens for database changes and triggers Inertia reloads for specific keys.
 */
export const useRealtime = () => {
    const { auth } = usePage().props;
    const { addToast } = useToast();
    const user = auth?.user;

    useEffect(() => {
        if (!user || !supabase) return;

        // 1. Notification Listener
        const notificationChannel = supabase
            .channel(`notifications:user_id=eq.${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('New notification received:', payload);
                    
                    // Add visual toast
                    if (payload.new && !payload.new.read_at) {
                        addToast(payload.new.title || 'New notification', 'info', 5000);
                    }

                    // Refresh notifications and unread count
                    router.reload({
                        only: ['notifications', 'unreadNotificationCount'],
                        preserveScroll: true,
                    });
                    
                    // Optional: Dispatch a custom event for local UI feedback
                    window.dispatchEvent(new CustomEvent('new-notification', { detail: payload.new }));
                }
            )
            .subscribe();

        // 2. Order Listener (for Artisans)
        let orderChannel = null;
        if (user.role === 'artisan') {
            orderChannel = supabase
                .channel(`orders:artisan_id=eq.${user.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen for all changes (new orders, status updates)
                        schema: 'public',
                        table: 'orders',
                        filter: `artisan_id=eq.${user.id}`,
                    },
                    (payload) => {
                        console.log('Order update received:', payload);
                        
                        if (payload.eventType === 'INSERT') {
                            addToast(`New Order Received! #${payload.new.order_number}`, 'success', 8000);
                            window.dispatchEvent(new CustomEvent('new-order', { detail: payload.new }));
                        }

                        // Refresh orders and dashboard stats
                        router.reload({
                            only: ['orders', 'stats', 'recentOrders'],
                            preserveScroll: true,
                        });
                    }
                )
                .subscribe();
        }

        // 3. Admin Activity Listener
        let adminChannel = null;
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

        return () => {
            supabase.removeChannel(notificationChannel);
            if (orderChannel) supabase.removeChannel(orderChannel);
            if (adminChannel) supabase.removeChannel(adminChannel);
        };
    }, [user?.id]);
};

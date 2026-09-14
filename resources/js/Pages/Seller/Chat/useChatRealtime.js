import { useEffect } from 'react';
import { router } from '@inertiajs/react';

export default function useChatRealtime({
    auth,
    selectedUser,
    isEchoConnected,
    markAsRead,
    setMessages,
    setActiveContactList,
    setTypingUserId,
    typingTimeoutRef,
    threadCache,
    hasMoreMessages,
    activeOrderCtx,
    activeUserOrdersList,
}) {
    // Fallback polling when Echo is disconnected or offline
    useEffect(() => {
        if (isEchoConnected) return undefined;

        let tick = 0;
        const pollData = () => {
            tick += 1;
            let reloadKeys;
            if (selectedUser) {
                reloadKeys = (tick % 4 === 0) 
                    ? ['activeMessages', 'conversations', 'currentOrderContext'] 
                    : ['activeMessages'];
            } else {
                reloadKeys = ['conversations'];
            }

            router.reload({
                only: reloadKeys,
                preserveScroll: true,
                preserveState: true,
                showProgress: false,
            });
        };

        const interval = setInterval(pollData, selectedUser ? 3000 : 5000);

        const handleVisibility = () => {
            if (!document.hidden) {
                pollData();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleVisibility);
        };
    }, [isEchoConnected, selectedUser?.id]);

    // Real-time WebSockets via Echo
    useEffect(() => {
        if (!auth?.user?.id || !window.Echo) return undefined;

        const activeChannelId = auth.effectiveSellerId || auth.user.id;
        const channel = window.Echo.private(`chat.${activeChannelId}`);

        channel.listen('.message.sent', (e) => {
            const senderId = Number(e.message.sender_id);
            const myId = Number(auth.effectiveSellerId || auth.user.id);
            if (senderId === myId) return;

            if (selectedUser && senderId === Number(selectedUser.id)) {
                const newMsg = {
                    id: e.message.id,
                    text: e.message.message,
                    attachment_path: e.message.attachment_path,
                    attachment_url: e.message.attachment_url,
                    attachment_type: e.message.attachment_type,
                    sender: 'other',
                    created_at: e.message.created_at,
                    time: new Date(e.message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
                    is_read: true,
                };
                setMessages(prev => {
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    const next = [...prev, newMsg];
                    threadCache.current.set(selectedUser.id, {
                        messages: next,
                        hasMore: hasMoreMessages,
                        currentOrderContext: activeOrderCtx,
                        userOrders: activeUserOrdersList,
                        currentChatUser: selectedUser,
                    });
                    return next;
                });
                markAsRead(selectedUser.id);
            } else {
                setActiveContactList(prev => prev.map(c => {
                    if (c.id === senderId) {
                        return { ...c, unread: (c.unread || 0) + 1, lastMsg: e.message.message || 'Sent an attachment' };
                    }
                    return c;
                }));
                if (threadCache.current.has(senderId)) {
                    const cached = threadCache.current.get(senderId);
                    cached.messages.push({
                        id: e.message.id,
                        text: e.message.message,
                        sender: 'other',
                        created_at: e.message.created_at,
                    });
                }
            }
        });

        channel.listen('.message.seen', (e) => {
            const sender = e.senderId ?? e.sender_id;
            if (selectedUser && Number(sender) === Number(selectedUser.id)) {
                router.reload({ only: ['activeMessages'] });
            }
        });

        channel.listen('.user.typing', (e) => {
            const sender = Number(e.senderId ?? e.sender_id);
            if (selectedUser && sender === Number(selectedUser.id)) {
                setTypingUserId(sender);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setTypingUserId(null);
                }, 4000);
            }
        });

        return () => {
            channel.stopListening('.message.sent');
            channel.stopListening('.message.seen');
            channel.stopListening('.user.typing');
        };
    }, [auth?.user?.id, auth?.effectiveSellerId, selectedUser?.id, hasMoreMessages, activeOrderCtx, activeUserOrdersList, markAsRead, setActiveContactList, setMessages, setTypingUserId, threadCache, typingTimeoutRef]);
}

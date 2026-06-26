import { useEffect } from 'react';
import { router } from '@inertiajs/react';

/**
 * Custom hook to manage Laravel Echo subscription and listeners for Team Chat.
 *
 * @param {Object} params
 * @param {Object} params.auth - Authenticated user details.
 * @param {Object|null} params.currentChatUser - Active chat teammate.
 * @param {Object|null} params.currentChannel - Active chat channel.
 * @param {Object|null} params.activeThreadParent - Active threaded reply parent message.
 * @param {Function} params.setActiveThreadReplies - State setter for thread replies.
 * @param {Function} params.setIsCounterpartTyping - State setter for counterpart typing indicator.
 * @param {Function} params.setSyncNotice - State setter for synchronization notice message.
 * @param {Function} params.setActiveThreadParent - State setter for thread parent.
 * @param {Object} params.typingTimeoutRef - React ref for managing typing timer.
 */
export default function useTeamChatEcho({
    auth,
    currentChatUser,
    currentChannel,
    activeThreadParent,
    setActiveThreadReplies,
    setIsCounterpartTyping,
    setSyncNotice,
    setActiveThreadParent,
    typingTimeoutRef,
}) {
    useEffect(() => {
        if (!auth?.user?.id || !window.Echo) return undefined;

        const chatChannelName = `team-chat.${auth.user.id}`;
        const chatChannel = window.Echo.private(chatChannelName);

        chatChannel.listen('.team.message.sent', (e) => {
            // Ignore messages belonging to the active channel to let teamChannelInstance handle them
            if (currentChannel && e.message.team_channel_id && Number(e.message.team_channel_id) === Number(currentChannel.id)) {
                return;
            }

            const senderId = Number(e.message.sender_id);
            const myId = Number(auth.user.id);

            // Check if this is a threaded reply
            const parentId = e.message.parent_id ? Number(e.message.parent_id) : null;
            if (parentId) {
                if (activeThreadParent && Number(activeThreadParent.id) === parentId) {
                    const isMe = senderId === myId;
                    const newReply = {
                        id: e.message.id,
                        text: e.message.message,
                        attachment_path: e.message.attachment_path,
                        attachment_type: e.message.attachment_type,
                        sender: isMe ? 'me' : 'other',
                        sender_name: e.message.sender_name || (isMe ? auth.user.name : 'Teammate'),
                        sender_avatar: e.message.sender_avatar || (isMe ? auth.user.avatar : null),
                        time: new Date(e.message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        dateLabel: 'Today',
                        isRead: true,
                    };
                    setActiveThreadReplies(prev => {
                        if (prev.some(r => r.id === newReply.id)) return prev;
                        return [...prev, newReply];
                    });
                }

                // Reload main messages list to sync replies count
                router.reload({
                    only: ['activeMessages', 'conversations'],
                    preserveScroll: true,
                    preserveState: true,
                    showProgress: false,
                    onSuccess: () => setSyncNotice(null)
                });
                return;
            }

            if (senderId === myId) return;

            // Direct message check
            if (currentChatUser && senderId === Number(currentChatUser.id) && !e.message.team_channel_id) {
                if (window.axios) {
                    window.axios.post(route('team-messages.seen'), { sender_id: currentChatUser.id })
                        .then(() => {
                            router.reload({ 
                                only: ['activeMessages', 'conversations', 'currentChatUser'],
                                preserveScroll: true,
                                preserveState: true,
                                showProgress: false,
                                onSuccess: () => setSyncNotice(null)
                            });
                        })
                        .catch(() => {
                            router.reload({ 
                                only: ['activeMessages', 'conversations', 'currentChatUser'],
                                preserveScroll: true,
                                preserveState: true,
                                showProgress: false,
                                onSuccess: () => setSyncNotice(null)
                            });
                        });
                } else {
                    router.reload({ 
                        only: ['activeMessages', 'conversations', 'currentChatUser'],
                        preserveScroll: true,
                        preserveState: true,
                        showProgress: false,
                        onSuccess: () => setSyncNotice(null)
                    });
                }
            } 
            // Channel message check
            else if (currentChannel && Number(e.message.team_channel_id) === Number(currentChannel.id)) {
                if (window.axios) {
                    window.axios.post(route('team-messages.channels.seen'), { team_channel_id: currentChannel.id })
                        .then(() => {
                            router.reload({
                                only: ['activeMessages', 'conversations', 'currentChannel'],
                                preserveScroll: true,
                                preserveState: true,
                                showProgress: false,
                                onSuccess: () => setSyncNotice(null)
                            });
                        })
                        .catch(() => {
                            router.reload({
                                only: ['activeMessages', 'conversations', 'currentChannel'],
                                preserveScroll: true,
                                preserveState: true,
                                showProgress: false,
                                onSuccess: () => setSyncNotice(null)
                            });
                        });
                } else {
                    router.reload({
                        only: ['activeMessages', 'conversations', 'currentChannel'],
                        preserveScroll: true,
                        preserveState: true,
                        showProgress: false,
                        onSuccess: () => setSyncNotice(null)
                    });
                }
            } else {
                router.reload({ only: ['conversations'], showProgress: false });
            }
        });

        chatChannel.listen('.team.message.seen', (e) => {
            if (currentChatUser && Number(e.senderId) === Number(currentChatUser.id)) {
                router.reload({ 
                    only: ['activeMessages'],
                    preserveScroll: true,
                    preserveState: true,
                    showProgress: false
                });
            }
        });

        chatChannel.listen('.team.user.typing', (e) => {
            if (currentChatUser && Number(e.senderId) === Number(currentChatUser.id)) {
                setIsCounterpartTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsCounterpartTyping(false);
                }, 4000);
            }
        });

        chatChannel.listen('.team.message.reaction.updated', (e) => {
            const messageId = Number(e.messageId);
            const freshReactions = e.reactions;

            setActiveThreadParent(prev => {
                if (prev && Number(prev.id) === messageId) {
                    return { ...prev, reactions: freshReactions };
                }
                return prev;
            });

            setActiveThreadReplies(prev => prev.map(reply => {
                if (Number(reply.id) === messageId) {
                    return { ...reply, reactions: freshReactions };
                }
                return reply;
            }));

            router.reload({
                only: ['activeMessages'],
                preserveScroll: true,
                preserveState: true,
                showProgress: false,
            });
        });

        // Channel specific listener
        let teamChannelInstance = null;
        let teamChannelName = null;
        if (currentChannel) {
            teamChannelName = `team-channel.${currentChannel.id}`;
            teamChannelInstance = window.Echo.private(teamChannelName);
            
            teamChannelInstance.listen('.team.message.sent', (e) => {
                const senderId = Number(e.message.sender_id);
                const myId = Number(auth.user.id);

                const parentId = e.message.parent_id ? Number(e.message.parent_id) : null;
                if (parentId) {
                    if (activeThreadParent && Number(activeThreadParent.id) === parentId) {
                        const isMe = senderId === myId;
                        const newReply = {
                            id: e.message.id,
                            text: e.message.message,
                            attachment_path: e.message.attachment_path,
                            attachment_type: e.message.attachment_type,
                            sender: isMe ? 'me' : 'other',
                            sender_name: e.message.sender_name || (isMe ? auth.user.name : 'Teammate'),
                            sender_avatar: e.message.sender_avatar || (isMe ? auth.user.avatar : null),
                            time: new Date(e.message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            dateLabel: 'Today',
                            isRead: true,
                        };
                        setActiveThreadReplies(prev => {
                            if (prev.some(r => r.id === newReply.id)) return prev;
                            return [...prev, newReply];
                        });
                    }

                    router.reload({
                        only: ['activeMessages', 'conversations', 'currentChannel'],
                        preserveScroll: true,
                        preserveState: true,
                        showProgress: false,
                        onSuccess: () => setSyncNotice(null)
                    });
                    return;
                }

                if (senderId === myId) return;

                if (window.axios) {
                    window.axios.post(route('team-messages.channels.seen'), { team_channel_id: currentChannel.id })
                        .then(() => {
                            router.reload({
                                only: ['activeMessages', 'conversations', 'currentChannel'],
                                preserveScroll: true,
                                preserveState: true,
                                showProgress: false,
                                onSuccess: () => setSyncNotice(null)
                            });
                        })
                        .catch(() => {
                            router.reload({
                                only: ['activeMessages', 'conversations', 'currentChannel'],
                                preserveScroll: true,
                                preserveState: true,
                                showProgress: false,
                                onSuccess: () => setSyncNotice(null)
                            });
                        });
                } else {
                    router.reload({
                        only: ['activeMessages', 'conversations', 'currentChannel'],
                        preserveScroll: true,
                        preserveState: true,
                        showProgress: false,
                        onSuccess: () => setSyncNotice(null)
                    });
                }
            });
        }

        return () => {
            if (window.Echo) {
                window.Echo.leave(chatChannelName);
                if (teamChannelName) {
                    window.Echo.leave(teamChannelName);
                }
            }
        };
    }, [auth.user.id, currentChatUser?.id, currentChannel?.id, activeThreadParent?.id]);
}

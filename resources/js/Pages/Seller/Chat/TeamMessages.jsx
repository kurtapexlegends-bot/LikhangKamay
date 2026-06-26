import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import UserAvatar from '@/Components/UserAvatar';
import { ArrowLeft, MessageSquareText, Info, Hash } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useEchoConnection from '@/hooks/useEchoConnection';
import useTeamChatEcho from '@/hooks/useTeamChatEcho';
import { AnimatePresence } from 'framer-motion';

// Subcomponents
import ContactList from '@/Components/Seller/Chat/ContactList';
import MessageArea from '@/Components/Seller/Chat/MessageArea';
import MessageInput from '@/Components/Seller/Chat/MessageInput';
import TeammateInfoSidebar from '@/Components/Seller/Chat/TeammateInfoSidebar';
import ChannelInfoSidebar from '@/Components/Seller/Chat/ChannelInfoSidebar';
import ThreadSidebar from '@/Components/Seller/Chat/ThreadSidebar';
import CreateChannelModal from '@/Components/Seller/Chat/CreateChannelModal';

export default function TeamMessages({ 
    auth, 
    conversations = [], 
    activeMessages = [], 
    currentChatUser = null,
    currentChannel = null,
    eligibleContacts = []
}) {
    const isEchoConnected = useEchoConnection();
    const [showMobileList, setShowMobileList] = useState(!currentChatUser && !currentChannel);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncNotice, setSyncNotice] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [activeThreadParent, setActiveThreadParent] = useState(null);
    const [activeThreadReplies, setActiveThreadReplies] = useState([]);
    const [loadingThread, setLoadingThread] = useState(false);
    const { openSidebar } = useSellerWorkspaceShell();

    const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
    const [pendingMessages, setPendingMessages] = useState([]);
    const typingTimeoutRef = useRef(null);

    const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
    
    const form = useForm({
        receiver_id: currentChatUser?.id || '',
        team_channel_id: currentChannel?.id || '',
        message: '',
        attachment: null,
    });

    useEffect(() => {
        form.setData({
            receiver_id: currentChatUser?.id || '',
            team_channel_id: currentChannel?.id || '',
            message: '',
            attachment: null,
        });
        setPendingMessages([]);
        setActiveThreadParent(null); // Close active thread on recipient/channel swap

        if (currentChatUser) {
            setShowMobileList(false);
            if (window.axios) {
                window.axios.post(route('team-messages.seen'), { sender_id: currentChatUser.id })
                    .then(() => {
                        router.reload({ only: ['conversations'], preserveScroll: true, preserveState: true, showProgress: false });
                    })
                    .catch(() => {
                        setSyncNotice('Team inbox is temporarily stale. It will sync again shortly.');
                    });
            }
        } else if (currentChannel) {
            setShowMobileList(false);
            if (window.axios) {
                window.axios.post(route('team-messages.channels.seen'), { team_channel_id: currentChannel.id })
                    .then(() => {
                        router.reload({ only: ['conversations'], preserveScroll: true, preserveState: true, showProgress: false });
                    })
                    .catch(() => {
                        setSyncNotice('Team inbox is temporarily stale. It will sync again shortly.');
                    });
            }
        }
    }, [currentChatUser?.id, currentChannel?.id]);

    useEffect(() => {
        if (!activeThreadParent) {
            setActiveThreadReplies([]);
            return;
        }

        setLoadingThread(true);
        if (window.axios) {
            window.axios.get(route('team-messages.threads.show', activeThreadParent.id))
                .then(res => {
                    if (res.data?.success) {
                        setActiveThreadReplies(res.data.replies);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoadingThread(false));
        }
    }, [activeThreadParent?.id]);

    useEffect(() => {
        setIsCounterpartTyping(!!currentChatUser?.is_typing);
    }, [currentChatUser?.id, currentChatUser?.is_typing]);

    // Fallback polling when Echo is disconnected or offline
    useEffect(() => {
        if (isEchoConnected || (!currentChatUser && !currentChannel) || form.processing) return undefined;

        const interval = setInterval(() => {
            if (document.hidden) return;
            router.reload({
                only: ['activeMessages', 'conversations', 'currentChatUser', 'currentChannel'],
                preserveScroll: true,
                preserveState: true,
                showProgress: false,
                onSuccess: () => setSyncNotice(null)
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [isEchoConnected, currentChatUser?.id, currentChannel?.id, form.processing]);

    // Real-time WebSockets via custom hook
    useTeamChatEcho({
        auth,
        currentChatUser,
        currentChannel,
        activeThreadParent,
        setActiveThreadReplies,
        setIsCounterpartTyping,
        setSyncNotice,
        setActiveThreadParent,
        typingTimeoutRef,
    });

    const displayedMessages = useMemo(() => {
        return [...activeMessages, ...pendingMessages];
    }, [activeMessages, pendingMessages]);

    const filteredContacts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) return conversations;

        return conversations.filter((contact) =>
            `${contact.name} ${contact.roleLabel}`.toLowerCase().includes(query)
        );
    }, [conversations, searchTerm]);

    const handleToggleReaction = (messageId, emoji) => {
        if (!window.axios) return;

        window.axios.post(route('team-messages.react'), {
            team_message_id: messageId,
            emoji: emoji
        })
        .then(res => {
            if (res.data?.success) {
                const freshReactions = res.data.reactions;
                
                setActiveThreadParent(prev => {
                    if (prev && Number(prev.id) === Number(messageId)) {
                        return { ...prev, reactions: freshReactions };
                    }
                    return prev;
                });

                setActiveThreadReplies(prev => prev.map(reply => {
                    if (Number(reply.id) === Number(messageId)) {
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
            }
        })
        .catch(err => {
            console.error('Failed to toggle reaction', err);
        });
    };

    return (
        <>
            <Head title="Team Inbox" />

            <SellerHeader
                title="Team Inbox"
                subtitle="Chat with other staff members inside your shop."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-emerald-400' }}
            />

            <div className="flex-1 flex min-h-0 overflow-hidden bg-[#FDFBF9] font-sans text-stone-850">
                <ContactList
                    currentChatUser={currentChatUser}
                    currentChannel={currentChannel}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filteredContacts={filteredContacts}
                    showMobileList={showMobileList}
                    onCreateChannelClick={() => setShowCreateChannelModal(true)}
                />

                <section className={`min-w-0 flex-1 flex-col overflow-hidden bg-[#FDFBF9] ${showMobileList ? 'hidden sm:flex' : 'flex'}`}>
                    {currentChatUser ? (
                        <>
                            <div className="border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileList(true)}
                                            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:hidden"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div className="relative shrink-0 w-10 h-10">
                                            <UserAvatar user={currentChatUser} className="h-10 w-10 shadow-sm" />
                                            {currentChatUser.is_online && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white z-10" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-stone-900">{currentChatUser.name}</p>
                                            <p className={`text-[10px] font-medium flex items-center gap-1.5 ${
                                                currentChatUser.is_online ? 'text-green-600 font-bold' : 'text-stone-400'
                                            }`}>
                                                {currentChatUser.is_online
                                                    ? 'Online now'
                                                    : `Last seen ${currentChatUser.last_seen || 'recently'}`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 sm:inline-flex">
                                            Internal
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowInfoPanel(prev => !prev);
                                                setActiveThreadParent(null); // Close thread sidebar
                                            }}
                                            className={`p-2 rounded-xl transition ${
                                                showInfoPanel 
                                                    ? 'bg-clay-100 text-clay-700' 
                                                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                                            }`}
                                            title="Teammate Info"
                                        >
                                            <Info size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
 
                            <MessageArea
                                activeMessages={displayedMessages}
                                currentChatUser={{
                                    ...currentChatUser,
                                    is_typing: isCounterpartTyping
                                }}
                                syncNotice={syncNotice}
                                onReplyInThread={(msg) => {
                                    setShowInfoPanel(false);
                                    setActiveThreadParent(msg);
                                }}
                                onToggleReaction={handleToggleReaction}
                             />

                            <MessageInput
                                currentChatUser={currentChatUser}
                                currentChannel={null}
                                form={form}
                                eligibleContacts={eligibleContacts}
                                onSendStart={(tempMsg) => setPendingMessages(prev => [...prev, tempMsg])}
                                onSendFinished={(tempId, success) => {
                                    if (success) {
                                        setPendingMessages(prev => prev.filter(m => m.id !== tempId));
                                    } else {
                                        setPendingMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
                                    }
                                }}
                            />
                        </>
                    ) : currentChannel ? (
                        <>
                            <div className="border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowMobileList(true)}
                                            className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:hidden"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div className="relative shrink-0 w-10 h-10 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center text-stone-500 shadow-sm">
                                            <Hash size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-bold text-stone-900">#{currentChannel.name}</p>
                                            <p className="text-[10px] font-medium text-stone-400">
                                                {currentChannel.members_count || 0} members
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 sm:inline-flex">
                                            Channel
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowInfoPanel(prev => !prev);
                                                setActiveThreadParent(null); // Close thread sidebar
                                            }}
                                            className={`p-2 rounded-xl transition ${
                                                showInfoPanel 
                                                    ? 'bg-clay-100 text-clay-700' 
                                                    : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'
                                            }`}
                                            title="Channel Info"
                                        >
                                            <Info size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
 
                            <MessageArea
                                activeMessages={displayedMessages}
                                currentChatUser={null}
                                currentChannel={currentChannel}
                                syncNotice={syncNotice}
                                onReplyInThread={(msg) => {
                                    setShowInfoPanel(false);
                                    setActiveThreadParent(msg);
                                }}
                                onToggleReaction={handleToggleReaction}
                             />

                            <MessageInput
                                currentChatUser={null}
                                currentChannel={currentChannel}
                                form={form}
                                eligibleContacts={eligibleContacts}
                                onSendStart={(tempMsg) => setPendingMessages(prev => [...prev, tempMsg])}
                                onSendFinished={(tempId, success) => {
                                    if (success) {
                                        setPendingMessages(prev => prev.filter(m => m.id !== tempId));
                                    } else {
                                        setPendingMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
                                    }
                                }}
                            />
                        </>
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                            <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-stone-100 text-stone-300 shadow-sm">
                                <MessageSquareText size={34} color="green" />
                            </div>
                            <h2 className="mt-5 text-xl font-bold text-stone-900">Open a team thread</h2>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                                Choose a channel or a teammate from the left sidebar to start collaborating.
                            </p>
                        </div>
                    )}
                </section>

                {showInfoPanel && currentChatUser && (
                    <TeammateInfoSidebar
                        currentChatUser={currentChatUser}
                        setShowInfoPanel={setShowInfoPanel}
                        activeMessages={displayedMessages}
                    />
                )}

                {showInfoPanel && currentChannel && (
                    <ChannelInfoSidebar
                        currentChannel={currentChannel}
                        setShowInfoPanel={setShowInfoPanel}
                        activeMessages={displayedMessages}
                    />
                )}

                <AnimatePresence>
                    {activeThreadParent && (
                        <ThreadSidebar
                            auth={auth}
                            parent={activeThreadParent}
                            replies={activeThreadReplies}
                            loading={loadingThread}
                            onClose={() => setActiveThreadParent(null)}
                            onToggleReaction={handleToggleReaction}
                            eligibleContacts={eligibleContacts}
                            onReplySuccess={() => {
                                if (window.axios) {
                                    window.axios.get(route('team-messages.threads.show', activeThreadParent.id))
                                        .then(res => {
                                            if (res.data?.success) {
                                                setActiveThreadReplies(res.data.replies);
                                            }
                                        });
                                }
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>

            <CreateChannelModal 
                isOpen={showCreateChannelModal} 
                onClose={() => setShowCreateChannelModal(false)} 
                eligibleContacts={eligibleContacts} 
            />
        </>
    );
}

TeamMessages.layout = (page) => <SellerWorkspaceLayout active="team-messages" overflowHidden={true}>{page}</SellerWorkspaceLayout>;

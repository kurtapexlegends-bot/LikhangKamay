import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import UserAvatar from '@/Components/UserAvatar';
import { ArrowLeft, MessageSquareText, Info, Hash, Plus, X } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useEchoConnection from '@/hooks/useEchoConnection';

// Subcomponents
import ContactList from '@/Components/Seller/Chat/ContactList';
import MessageArea from '@/Components/Seller/Chat/MessageArea';
import MessageInput from '@/Components/Seller/Chat/MessageInput';
import TeammateInfoSidebar from '@/Components/Seller/Chat/TeammateInfoSidebar';
import ChannelInfoSidebar from '@/Components/Seller/Chat/ChannelInfoSidebar';

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

    const newChannelForm = useForm({
        name: '',
        description: '',
        member_ids: [],
    });

    useEffect(() => {
        form.setData({
            receiver_id: currentChatUser?.id || '',
            team_channel_id: currentChannel?.id || '',
            message: '',
            attachment: null,
        });
        setPendingMessages([]);

        if (currentChatUser) {
            setShowMobileList(false);
            if (window.axios) {
                window.axios.post(route('team-messages.seen'), { sender_id: currentChatUser.id }).catch(() => {
                    setSyncNotice('Team inbox is temporarily stale. It will sync again shortly.');
                });
            }
        } else if (currentChannel) {
            setShowMobileList(false);
            if (window.axios) {
                window.axios.post(route('team-messages.channels.seen'), { team_channel_id: currentChannel.id }).catch(() => {
                    setSyncNotice('Team inbox is temporarily stale. It will sync again shortly.');
                });
            }
        }
    }, [currentChatUser?.id, currentChannel?.id]);

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
                onSuccess: () => setSyncNotice(null)
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [isEchoConnected, currentChatUser?.id, currentChannel?.id, form.processing]);

    // Real-time WebSockets via Echo
    useEffect(() => {
        if (!auth?.user?.id || !window.Echo) return undefined;

        const chatChannel = window.Echo.private(`team-chat.${auth.user.id}`);

        chatChannel.listen('.team.message.sent', (e) => {
            const senderId = Number(e.message.sender_id);
            const myId = Number(auth.user.id);
            if (senderId === myId) return;

            // Direct message check
            if (currentChatUser && senderId === Number(currentChatUser.id) && !e.message.team_channel_id) {
                router.reload({ 
                    only: ['activeMessages', 'conversations', 'currentChatUser'],
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setSyncNotice(null)
                });
            } 
            // Channel message check
            else if (currentChannel && Number(e.message.team_channel_id) === Number(currentChannel.id)) {
                router.reload({
                    only: ['activeMessages', 'conversations', 'currentChannel'],
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setSyncNotice(null);
                        if (window.axios) {
                            window.axios.post(route('team-messages.channels.seen'), { team_channel_id: currentChannel.id }).catch(() => {});
                        }
                    }
                });
            } else {
                router.reload({ only: ['conversations'] });
            }
        });

        chatChannel.listen('.team.message.seen', (e) => {
            if (currentChatUser && Number(e.senderId) === Number(currentChatUser.id)) {
                router.reload({ 
                    only: ['activeMessages'],
                    preserveScroll: true,
                    preserveState: true 
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

        // Channel specific listener
        let teamChannelInstance = null;
        if (currentChannel) {
            teamChannelInstance = window.Echo.private(`team-channel.${currentChannel.id}`);
            
            teamChannelInstance.listen('.team.message.sent', (e) => {
                const senderId = Number(e.message.sender_id);
                const myId = Number(auth.user.id);
                if (senderId === myId) return;

                router.reload({
                    only: ['activeMessages', 'conversations', 'currentChannel'],
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        setSyncNotice(null);
                        if (window.axios) {
                            window.axios.post(route('team-messages.channels.seen'), { team_channel_id: currentChannel.id }).catch(() => {});
                        }
                    }
                });
            });
        }

        return () => {
            chatChannel.stopListening('.team.message.sent');
            chatChannel.stopListening('.team.message.seen');
            chatChannel.stopListening('.team.user.typing');
            if (teamChannelInstance && currentChannel) {
                teamChannelInstance.stopListening('.team.message.sent');
            }
        };
    }, [auth.user.id, currentChatUser?.id, currentChannel?.id]);

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

    const handleCreateChannelSubmit = (e) => {
        e.preventDefault();
        newChannelForm.post(route('team-messages.channels.store'), {
            onSuccess: () => {
                setShowCreateChannelModal(false);
                newChannelForm.reset();
            }
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
                                            onClick={() => setShowInfoPanel(prev => !prev)}
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
                            />

                            <MessageInput
                                currentChatUser={currentChatUser}
                                currentChannel={null}
                                form={form}
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
                                            onClick={() => setShowInfoPanel(prev => !prev)}
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
                            />

                            <MessageInput
                                currentChatUser={null}
                                currentChannel={currentChannel}
                                form={form}
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
            </div>

            {/* Create Channel Modal */}
            {showCreateChannelModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                    <div 
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-opacity" 
                        onClick={() => setShowCreateChannelModal(false)}
                    />
                    <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all border border-stone-200 font-sans text-stone-850">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                            <h3 className="text-base font-bold text-stone-950 flex items-center gap-2">
                                <Plus size={18} /> Create Channel
                            </h3>
                            <button
                                onClick={() => setShowCreateChannelModal(false)}
                                className="rounded-full p-1.5 text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition"
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateChannelSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 font-sans">
                                    Channel Name
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">#</span>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. general, marketing"
                                        value={newChannelForm.data.name}
                                        onChange={e => newChannelForm.setData('name', e.target.value)}
                                        className="w-full rounded-xl border border-stone-250 py-2.5 pl-7 pr-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                                    />
                                </div>
                                {newChannelForm.errors.name && (
                                    <p className="mt-1 text-xs text-red-600">{newChannelForm.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1 font-sans">
                                    Description
                                </label>
                                <textarea
                                    placeholder="Optional description of the channel"
                                    value={newChannelForm.data.description}
                                    onChange={e => newChannelForm.setData('description', e.target.value)}
                                    className="w-full rounded-xl border border-stone-250 py-2.5 px-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                                    rows={2}
                                />
                                {newChannelForm.errors.description && (
                                    <p className="mt-1 text-xs text-red-600">{newChannelForm.errors.description}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 font-sans">
                                    Add Members
                                </label>
                                <div className="max-h-48 overflow-y-auto space-y-2 bg-stone-50 border border-stone-200 rounded-xl p-3">
                                    {eligibleContacts.map(contact => {
                                        const isChecked = newChannelForm.data.member_ids.includes(contact.id);
                                        return (
                                            <label 
                                                key={contact.id} 
                                                className="flex items-center gap-3 cursor-pointer hover:bg-white p-1.5 rounded-lg transition"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const currentIds = [...newChannelForm.data.member_ids];
                                                        if (isChecked) {
                                                            newChannelForm.setData('member_ids', currentIds.filter(id => id !== contact.id));
                                                        } else {
                                                            newChannelForm.setData('member_ids', [...currentIds, contact.id]);
                                                        }
                                                    }}
                                                    className="rounded border-stone-300 text-clay-650 focus:ring-clay-100"
                                                />
                                                <UserAvatar user={contact} className="w-6 h-6 text-[10px] shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-stone-850 truncate leading-none">
                                                        {contact.name}
                                                    </p>
                                                    <span className="text-[9px] text-stone-400 font-bold uppercase tracking-wider">
                                                        {contact.roleLabel}
                                                    </span>
                                                </div>
                                            </label>
                                        );
                                    })}
                                    {eligibleContacts.length === 0 && (
                                        <p className="text-xs text-stone-400 italic">No other staff members available</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateChannelModal(false)}
                                    className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={newChannelForm.processing}
                                    className="rounded-xl bg-clay-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-clay-700 disabled:opacity-50"
                                >
                                    {newChannelForm.processing ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}

TeamMessages.layout = (page) => <SellerWorkspaceLayout active="team-messages" overflowHidden={true}>{page}</SellerWorkspaceLayout>;

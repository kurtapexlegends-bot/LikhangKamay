import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import SellerHeader from '@/Layouts/SellerHeader';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { ArrowLeft, MessageSquareText, Info } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useEchoConnection from '@/hooks/useEchoConnection';

// Subcomponents
import ContactList from '@/Components/Seller/Chat/ContactList';
import MessageArea from '@/Components/Seller/Chat/MessageArea';
import MessageInput from '@/Components/Seller/Chat/MessageInput';
import TeammateInfoSidebar from '@/Components/Seller/Chat/TeammateInfoSidebar';

export default function TeamMessages({ auth, conversations = [], activeMessages = [], currentChatUser = null }) {
    const isEchoConnected = useEchoConnection();
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncNotice, setSyncNotice] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const { openSidebar } = useSellerWorkspaceShell();

    const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
    const [pendingMessages, setPendingMessages] = useState([]);
    const typingTimeoutRef = useRef(null);

    const form = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
        attachment: null,
    });

    useEffect(() => {
        form.setData('receiver_id', currentChatUser?.id || '');
        setPendingMessages([]);

        if (currentChatUser) {
            setShowMobileList(false);
            if (window.axios) {
                window.axios.post(route('team-messages.seen'), { sender_id: currentChatUser.id }).catch(() => {
                    setSyncNotice('Team inbox is temporarily stale. It will sync again shortly.');
                });
            }
        }
    }, [currentChatUser, form.setData]);

    useEffect(() => {
        setIsCounterpartTyping(!!currentChatUser?.is_typing);
    }, [currentChatUser?.id, currentChatUser?.is_typing]);

    // Fallback polling when Echo is disconnected or offline
    useEffect(() => {
        if (isEchoConnected || !currentChatUser || form.processing) return undefined;

        const interval = setInterval(() => {
            if (document.hidden) return;
            router.reload({
                only: ['activeMessages', 'conversations', 'currentChatUser'],
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => setSyncNotice(null)
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [isEchoConnected, currentChatUser?.id, form.processing]);

    // Real-time WebSockets via Echo
    useEffect(() => {
        if (!auth?.user?.id || !window.Echo) return undefined;

        const channel = window.Echo.private(`team-chat.${auth.user.id}`);

        channel.listen('.team.message.sent', (e) => {
            if (currentChatUser && e.message.sender_id === currentChatUser.id) {
                router.reload({ 
                    only: ['activeMessages', 'conversations', 'currentChatUser'],
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => setSyncNotice(null)
                });
            } else {
                router.reload({ only: ['conversations'] });
            }
        });

        channel.listen('.team.message.seen', (e) => {
            if (currentChatUser && e.senderId === currentChatUser.id) {
                router.reload({ 
                    only: ['activeMessages'],
                    preserveScroll: true,
                    preserveState: true 
                });
            }
        });

        channel.listen('.team.user.typing', (e) => {
            if (currentChatUser && e.senderId === currentChatUser.id) {
                setIsCounterpartTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsCounterpartTyping(false);
                }, 4000);
            }
        });

        return () => {
            channel.stopListening('.team.message.sent');
            channel.stopListening('.team.message.seen');
            channel.stopListening('.team.user.typing');
        };
    }, [auth.user.id, currentChatUser?.id]);

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

            <div className="flex-1 flex min-h-0 overflow-hidden bg-[#FDFBF9] font-sans text-stone-800">
                <ContactList
                    conversations={conversations}
                    currentChatUser={currentChatUser}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filteredContacts={filteredContacts}
                    showMobileList={showMobileList}
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
                                Choose the seller owner or a teammate from the left.
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
            </div>
        </>
    );
}

TeamMessages.layout = (page) => <SellerWorkspaceLayout active="team-messages" overflowHidden={true}>{page}</SellerWorkspaceLayout>;

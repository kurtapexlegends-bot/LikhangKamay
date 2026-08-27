import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import BuyerNavbar from '@/Layouts/BuyerNavbar';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import { formatChatDateLabel } from '@/lib/chatTime';
import useEchoConnection from '@/hooks/useEchoConnection';

// Extracted Modular Subcomponents
import BuyerChatContacts from '@/Components/Consumer/Buyer/Chat/BuyerChatContacts';
import BuyerMessageWindow from '@/Components/Consumer/Buyer/Chat/BuyerMessageWindow';
import BuyerMessageInput from '@/Components/Consumer/Buyer/Chat/BuyerMessageInput';
import BuyerSellerInfoPanel from '@/Components/Consumer/Buyer/Chat/BuyerSellerInfoPanel';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

export default function BuyerChat({ auth, conversations = [], activeMessages = [], hasMore = false, currentChatUser = null, currentOrderContext = null, userOrders = [] }) {
    const isEchoConnected = useEchoConnection();
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [timeNow, setTimeNow] = useState(() => Date.now());
    const [activeMedia, setActiveMedia] = useState(null);
    const [isDesktop, setIsDesktop] = useState(false);
    const [typingUserId, setTypingUserId] = useState(null);
    const [pendingMessages, setPendingMessages] = useState([]);
    const typingTimeoutRef = useRef(null);

    // Thread Cache & Cursor Pagination
    const [activeContactList, setActiveContactList] = useState(conversations || []);
    const [selectedUser, setSelectedUser] = useState(currentChatUser);
    const [messages, setMessages] = useState(activeMessages || []);
    const [hasMoreMessages, setHasMoreMessages] = useState(hasMore);
    const [activeOrderCtx, setActiveOrderCtx] = useState(currentOrderContext);
    const [activeUserOrdersList, setActiveUserOrdersList] = useState(userOrders);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [isLoadingThread, setIsLoadingThread] = useState(false);

    const scrollContainerRef = useRef(null);
    const threadCache = useRef(new Map());
    const messagesEndRef = useRef(null);

    // Adjust state during render on prop changes (React recommended pattern)
    const [prevConversations, setPrevConversations] = useState(conversations);
    if (conversations !== prevConversations) {
        setPrevConversations(conversations);
        setActiveContactList(conversations || []);
    }

    const [prevChatUserId, setPrevChatUserId] = useState(currentChatUser?.id);
    if (currentChatUser?.id !== prevChatUserId) {
        setPrevChatUserId(currentChatUser?.id);
        setSelectedUser(currentChatUser);
        setMessages(activeMessages || []);
        setHasMoreMessages(hasMore);
        setActiveOrderCtx(currentOrderContext);
        setActiveUserOrdersList(userOrders);
        setIsLoadingThread(false);
    }

    const [prevActiveMessages, setPrevActiveMessages] = useState(activeMessages);
    if (activeMessages !== prevActiveMessages) {
        setPrevActiveMessages(activeMessages);
        setMessages(activeMessages || []);
        setHasMoreMessages(hasMore);
    }

    useEffect(() => {
        if (currentChatUser) {
            threadCache.current.set(currentChatUser.id, {
                messages: activeMessages || [],
                hasMore,
                currentOrderContext,
                userOrders,
                currentChatUser,
            });
        }
    }, [currentChatUser, activeMessages, hasMore, currentOrderContext, userOrders]);

    const [prevSelectedId, setPrevSelectedId] = useState(selectedUser?.id);
    if (selectedUser?.id !== prevSelectedId) {
        setPrevSelectedId(selectedUser?.id);
        setPendingMessages([]);
        if (selectedUser) {
            setShowMobileList(false);
        }
    }

    const isCounterpartTyping = Boolean(selectedUser?.is_typing || (typingUserId && selectedUser?.id === typingUserId));

    const form = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
        attachment: null
    });

    const scrollToLatest = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
    }, []);

    // Instantly pin to latest message without scrolling animation
    useLayoutEffect(() => {
        if (!loadingOlder) {
            scrollToLatest();
            const rafId = requestAnimationFrame(scrollToLatest);
            return () => cancelAnimationFrame(rafId);
        }
    }, [selectedUser?.id, messages.length, pendingMessages.length, loadingOlder, scrollToLatest]);

    const currentChatUserShopHref = selectedUser?.shop_slug
        ? route('shop.seller', selectedUser.shop_slug)
        : null;

    const currentChatUserAddress = formatStructuredAddress({
        street_address: selectedUser?.street_address,
        barangay: selectedUser?.barangay,
        city: selectedUser?.city,
        region: selectedUser?.region,
        postal_code: selectedUser?.zip_code,
    });

    // Detect screen size for responsive info drawer/sidebar
    useEffect(() => {
        const checkSize = () => setIsDesktop(window.innerWidth >= 1280);
        checkSize();
        window.addEventListener('resize', checkSize);
        return () => window.removeEventListener('resize', checkSize);
    }, []);

    // Regular interval to update relative times
    useEffect(() => {
        const interval = setInterval(() => {
            setTimeNow(Date.now());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Fallback polling when Echo is disconnected or offline
    useEffect(() => {
        if (isEchoConnected) return undefined;

        let tick = 0;
        const pollData = () => {
            tick += 1;
            // On active chat: poll activeMessages every 3s, reload conversations every 4th tick (~12s)
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

    const markAsRead = useCallback((senderId) => {
        if (!senderId) return;
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    }, []);

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
    }, [auth.user.id, selectedUser?.id, hasMoreMessages, activeOrderCtx, activeUserOrdersList, markAsRead]);

    useEffect(() => {
        if (selectedUser) {
            markAsRead(selectedUser.id);
        }
    }, [selectedUser?.id, markAsRead]);

    // Focus state & visibility listeners
    useEffect(() => {
        const handleActivity = () => {
            if (selectedUser && (!document.hidden || document.hasFocus())) {
                markAsRead(selectedUser.id);
            }
        };
        
        if (selectedUser && !showMobileList) {
            document.body.classList.add('has-sticky-action-bar');
        } else {
            document.body.classList.remove('has-sticky-action-bar');
        }

        window.addEventListener('focus', handleActivity);
        document.addEventListener('visibilitychange', handleActivity);
        return () => {
            window.removeEventListener('focus', handleActivity);
            document.removeEventListener('visibilitychange', handleActivity);
            document.body.classList.remove('has-sticky-action-bar');
        };
    }, [selectedUser, showMobileList, markAsRead]);

    // 0ms Optimistic Conversation Selection
    const onSelectConversation = useCallback((contact) => {
        if (!contact) return;
        setShowMobileList(false);
        if (selectedUser?.id === contact.id) return;

        setSelectedUser(contact);
        form.setData('receiver_id', contact.id);

        const cached = threadCache.current.get(contact.id);
        if (cached) {
            setMessages(cached.messages);
            setHasMoreMessages(cached.hasMore);
            setActiveOrderCtx(cached.currentOrderContext);
            setActiveUserOrdersList(cached.userOrders);
            setIsLoadingThread(false);
        } else {
            setMessages([]);
            setHasMoreMessages(false);
            setActiveOrderCtx(null);
            setActiveUserOrdersList([]);
            setIsLoadingThread(true);
        }

        // Instantly pin scroll to bottom for newly selected thread
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }

        setActiveContactList(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
        markAsRead(contact.id);

        router.visit(route('buyer.chat', { user_id: contact.id }), {
            only: ['activeMessages', 'hasMore', 'currentChatUser', 'currentOrderContext', 'userOrders'],
            preserveState: true,
            preserveScroll: true,
            showProgress: false,
            onSuccess: (page) => {
                const fresh = page.props;
                if (fresh.currentChatUser?.id === contact.id) {
                    setMessages(fresh.activeMessages || []);
                    setHasMoreMessages(!!fresh.hasMore);
                    setActiveOrderCtx(fresh.currentOrderContext || null);
                    setActiveUserOrdersList(fresh.userOrders || []);
                    threadCache.current.set(contact.id, {
                        messages: fresh.activeMessages || [],
                        hasMore: !!fresh.hasMore,
                        currentOrderContext: fresh.currentOrderContext || null,
                        userOrders: fresh.userOrders || [],
                        currentChatUser: fresh.currentChatUser,
                    });
                }
            },
            onFinish: () => {
                setIsLoadingThread(false);
            },
        });
    }, [selectedUser?.id, form, markAsRead]);

    // Reverse Cursor Pagination: Load Older Messages on Scroll-Up
    const handleLoadOlder = useCallback(() => {
        if (!selectedUser || loadingOlder || !hasMoreMessages || messages.length === 0) return;
        const oldestId = messages[0]?.id;
        if (!oldestId) return;

        setLoadingOlder(true);
        const container = scrollContainerRef.current;
        const prevScrollHeight = container ? container.scrollHeight : 0;
        const prevScrollTop = container ? container.scrollTop : 0;

        window.axios.get(route('chat.older-messages', selectedUser.id), {
            params: { before_id: oldestId }
        }).then(res => {
            if (res.data?.success && Array.isArray(res.data.messages)) {
                const older = res.data.messages;
                const nextHasMore = !!res.data.hasMore;
                setMessages(prev => {
                    const combined = [...older, ...prev];
                    threadCache.current.set(selectedUser.id, {
                        messages: combined,
                        hasMore: nextHasMore,
                        currentOrderContext: activeOrderCtx,
                        userOrders: activeUserOrdersList,
                        currentChatUser: selectedUser,
                    });
                    return combined;
                });
                setHasMoreMessages(nextHasMore);

                if (container) {
                    requestAnimationFrame(() => {
                        const newScrollHeight = container.scrollHeight;
                        container.scrollTop = prevScrollTop + (newScrollHeight - prevScrollHeight);
                    });
                }
            }
        }).catch(err => {
            console.error('Failed to load older messages', err);
        }).finally(() => {
            setLoadingOlder(false);
        });
    }, [selectedUser, loadingOlder, hasMoreMessages, messages, activeOrderCtx, activeUserOrdersList]);

    const displayedMessages = useMemo(() => {
        return [...messages, ...pendingMessages];
    }, [messages, pendingMessages]);

    // Memoized messages grouped by date label
    const groupedMessages = useMemo(() => displayedMessages.reduce((groups, msg) => {
        const date = formatChatDateLabel(msg.created_at, timeNow);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {}), [displayedMessages, timeNow]);

    // Extract all image attachments for the media gallery viewer
    const galleryImages = useMemo(() => displayedMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: msg.attachment_url || (msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') || msg.attachment_path.startsWith('http') || msg.attachment_path.startsWith('/storage') ? msg.attachment_path : `/storage/${msg.attachment_path}`),
            type: 'image',
            id: msg.id
        })), [displayedMessages]);

    return (
        <div className="h-screen overflow-hidden bg-[#FDFBF9] font-sans text-gray-800 flex flex-col" style={{ scrollbarGutter: 'stable' }}>
            <Head title="My Messages" />

            {/* Navbar (Hidden on mobile when in conversation) */}
            <div className={`${!showMobileList ? 'hidden sm:block' : 'block'}`}>
                <BuyerNavbar />
            </div>

            {/* Chat Workspace Container */}
            <main className={`flex-1 min-h-0 overflow-hidden max-w-7xl w-full mx-auto sm:px-6 lg:px-8 sm:py-6 ${!showMobileList ? 'p-0 sm:px-4' : 'p-4'}`}>
                <div className="bg-white border border-gray-100 shadow-lg overflow-hidden flex flex-col sm:flex-row w-full h-full sm:rounded-2xl">
                    
                    {/* Contacts sidebar pane */}
                    <BuyerChatContacts
                        conversations={activeContactList}
                        currentChatUser={selectedUser}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        timeNow={timeNow}
                        showMobileList={showMobileList}
                        onSelectConversation={onSelectConversation}
                    />

                    {/* Messages convo window pane */}
                    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-white ${!showMobileList ? 'flex' : 'hidden sm:flex'}`}>
                        <BuyerMessageWindow 
                            currentChatUser={selectedUser}
                            isCounterpartTyping={isCounterpartTyping}
                            currentOrderContext={activeOrderCtx}
                            userOrders={activeUserOrdersList}
                            groupedMessages={groupedMessages}
                            galleryImages={galleryImages}
                            setActiveMedia={setActiveMedia}
                            setShowMobileList={setShowMobileList}
                            showInfoPanel={showInfoPanel}
                            setShowInfoPanel={setShowInfoPanel}
                            timeNow={timeNow}
                            messagesEndRef={messagesEndRef}
                            hasMore={hasMoreMessages}
                            loadingOlder={loadingOlder}
                            isLoadingThread={isLoadingThread}
                            onLoadOlder={handleLoadOlder}
                            scrollContainerRef={scrollContainerRef}
                        />

                        {selectedUser && (
                            <BuyerMessageInput 
                                currentChatUser={selectedUser} 
                                form={form}
                                userOrders={activeUserOrdersList}
                                onSendStart={(tempMsg) => setPendingMessages(prev => [...prev, tempMsg])}
                                onSendFinished={(tempId, success, serverMsg) => {
                                    if (success && serverMsg) {
                                        setPendingMessages(prev => prev.filter(m => m.id !== tempId));
                                        setMessages(prev => {
                                            if (prev.some(m => m.id === serverMsg.id)) return prev;
                                            const next = [...prev, serverMsg];
                                            if (selectedUser) {
                                                threadCache.current.set(selectedUser.id, {
                                                    messages: next,
                                                    hasMore: hasMoreMessages,
                                                    currentOrderContext: activeOrderCtx,
                                                    userOrders: activeUserOrdersList,
                                                    currentChatUser: selectedUser,
                                                });
                                            }
                                            return next;
                                        });
                                        setActiveContactList(prev => prev.map(c => {
                                            if (Number(c.id) === Number(selectedUser?.id)) {
                                                return {
                                                    ...c,
                                                    lastMsg: serverMsg.text || 'Sent an attachment',
                                                    last_message_at: serverMsg.created_at,
                                                    time: 'Just now',
                                                };
                                            }
                                            return c;
                                        }));
                                    } else {
                                        setPendingMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
                                    }
                                }}
                            />
                        )}
                    </div>

                    {/* Seller info desktop pane (XL viewports) */}
                    <BuyerSellerInfoPanel
                        currentChatUser={selectedUser}
                        currentChatUserAddress={currentChatUserAddress}
                        currentChatUserShopHref={currentChatUserShopHref}
                        showInfoPanel={showInfoPanel}
                        setShowInfoPanel={setShowInfoPanel}
                        isDesktop={true}
                        activeMessages={messages}
                    />
                </div>
            </main>

            {/* Seller info slide drawer overlay (Mobile/Tablet viewports) */}
            <BuyerSellerInfoPanel
                currentChatUser={selectedUser}
                currentChatUserAddress={currentChatUserAddress}
                currentChatUserShopHref={currentChatUserShopHref}
                showInfoPanel={showInfoPanel && !isDesktop}
                setShowInfoPanel={setShowInfoPanel}
                isDesktop={false}
                activeMessages={messages}
            />

            {/* Media Viewer Lightbox */}
            <Suspense fallback={null}>
                <MediaViewer 
                    show={!!activeMedia} 
                    mediaList={galleryImages}
                    initialIndex={activeMedia?.index || 0}
                    onClose={() => setActiveMedia(null)} 
                />
            </Suspense>
        </div>
    );
}

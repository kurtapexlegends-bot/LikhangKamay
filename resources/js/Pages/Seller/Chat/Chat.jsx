import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import useEchoConnection from '@/hooks/useEchoConnection';
import { formatStructuredAddress } from '@/lib/addressFormatting';

// Subcomponents & Hooks
import ConversationListSidebar from './ConversationListSidebar';
import ChatOrderDrawer from './ChatOrderDrawer';
import ChatModals from './ChatModals';
import useChatTemplates from './useChatTemplates';
import useChatRealtime from './useChatRealtime';
import useChatMessaging from './useChatMessaging';
import MessageWindow from '@/Components/Seller/Chat/MessageWindow';
import MessageInput from '@/Components/Seller/Chat/MessageInput';

export default function Chat({
    auth,
    conversations = [],
    activeMessages = [],
    hasMore = false,
    currentChatUser = null,
    currentOrderContext = null,
    userOrders = [],
    chatTemplates = [],
    autoReplySettings = null
}) {
    const { openSidebar } = useSellerWorkspaceShell();
    const isEchoConnected = useEchoConnection();
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAutomationModal, setShowAutomationModal] = useState(false);
    const [activeMedia, setActiveMedia] = useState(null);
    const [timeNow, setTimeNow] = useState(() => Date.now());
    const [typingUserId, setTypingUserId] = useState(null);
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
    const messagesEndRef = useRef(null);
    const threadCache = useRef(new Map());

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
        if (selectedUser) {
            setShowMobileList(false);
        }
    }

    const isCounterpartTyping = Boolean(selectedUser?.is_typing || (typingUserId && selectedUser?.id === typingUserId));

    const { canEdit: canEditMessages, isReadOnly: isMessagesReadOnly } = useSellerModuleAccess('messages');

    const currentChatUserAddress = formatStructuredAddress({
        street_address: selectedUser?.street_address,
        barangay: selectedUser?.barangay,
        city: selectedUser?.city,
        region: selectedUser?.region,
        postal_code: selectedUser?.zip_code,
    });

    // Chat Templates Manager
    const templateManager = useChatTemplates();
    const {
        showTemplateManager,
        setShowTemplateManager,
        showTemplateSelector,
        setShowTemplateSelector,
    } = templateManager;

    const markAsRead = useCallback((senderId) => {
        if (!senderId) return;
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    }, []);

    // Real-Time WebSockets & Polling
    useChatRealtime({
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
    });

    // Messaging Form, Attachments & Cache Helpers
    const {
        data,
        setData,
        post,
        reset,
        processing,
        inputRef,
        fileInputRef,
        imageInputRef,
        emojiPickerRef,
        templateSelectorRef,
        attachmentPreview,
        pendingMessages,
        galleryImages,
        groupedMessages,
        signalTyping,
        handleOrderDecision,
        handleFileChange,
        removeAttachment,
        onEmojiClick,
        injectTemplate,
        onSendStart,
        onSendFinished,
    } = useChatMessaging({
        selectedUser,
        activeOrderCtx,
        activeUserOrdersList,
        hasMoreMessages,
        threadCache,
        messages,
        setMessages,
        setActiveContactList,
        timeNow,
        isMessagesReadOnly,
        setShowEmojiPicker,
        setShowTemplateSelector,
    });

    // Handle outside clicks for dropdowns
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
            if (templateSelectorRef.current && !templateSelectorRef.current.contains(event.target)) {
                setShowTemplateSelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [emojiPickerRef, templateSelectorRef, setShowEmojiPicker, setShowTemplateSelector]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeNow(Date.now());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const scrollToLatest = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        } else if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
        }
    }, []);

    useLayoutEffect(() => {
        if (!loadingOlder) {
            scrollToLatest();
            const rafId = requestAnimationFrame(scrollToLatest);
            return () => cancelAnimationFrame(rafId);
        }
    }, [selectedUser?.id, messages.length, pendingMessages.length, loadingOlder, scrollToLatest]);

    useEffect(() => {
        setData('receiver_id', selectedUser?.id || '');
        if (selectedUser) {
            if (messages.length === 0 || selectedUser.id !== data.receiver_id) {
                inputRef.current?.focus();
            }
            markAsRead(selectedUser.id);
        }
    }, [selectedUser?.id, markAsRead]);

    useEffect(() => {
        const handleActivity = () => {
            if (selectedUser && (!document.hidden || document.hasFocus())) {
                markAsRead(selectedUser.id);
            }
        };
        window.addEventListener('focus', handleActivity);
        document.addEventListener('visibilitychange', handleActivity);
        return () => {
            window.removeEventListener('focus', handleActivity);
            document.removeEventListener('visibilitychange', handleActivity);
        };
    }, [selectedUser, markAsRead]);

    // 0ms Optimistic Conversation Selection
    const onSelectConversation = useCallback((contact) => {
        if (!contact) return;
        setShowMobileList(false);
        if (selectedUser?.id === contact.id) return;

        setSelectedUser(contact);
        setData('receiver_id', contact.id);

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

        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }

        setActiveContactList(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));
        markAsRead(contact.id);

        router.visit(route('chat.index', { user_id: contact.id }), {
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
    }, [selectedUser?.id, markAsRead, setData, setMessages, setHasMoreMessages, setActiveOrderCtx, setActiveUserOrdersList]);

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
    }, [selectedUser, loadingOlder, hasMoreMessages, messages, activeOrderCtx, activeUserOrdersList, setMessages, setHasMoreMessages]);

    return (
        <>
            <Head title="Chat" />
            <SellerHeader
                title={
                    <div className="flex items-center gap-3">
                        <span>Messages</span>
                        {activeContactList.length > 0 && (
                            <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {activeContactList.length}
                            </span>
                        )}
                    </div>
                }
                subtitle="Chat directly with customers and buyers."
                auth={auth}
                onMenuClick={openSidebar}
            />

            <div className="flex-1 flex overflow-hidden">
                <ConversationListSidebar
                    conversations={activeContactList}
                    currentChatUser={selectedUser}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    timeNow={timeNow}
                    showMobileList={showMobileList}
                    setShowMobileList={setShowMobileList}
                    onOpenAutomationModal={() => setShowAutomationModal(true)}
                    onSelectConversation={onSelectConversation}
                />

                {/* CONVERSATION AREA */}
                <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FDFBF9] ${!showMobileList ? 'flex' : 'hidden sm:flex'}`}>
                    {selectedUser ? (
                        <>
                            <MessageWindow
                                currentChatUser={{
                                    ...selectedUser,
                                    is_typing: isCounterpartTyping
                                }}
                                currentOrderContext={activeOrderCtx}
                                userOrders={activeUserOrdersList}
                                groupedMessages={groupedMessages}
                                galleryImages={galleryImages}
                                setActiveMedia={setActiveMedia}
                                showInfoPanel={showInfoPanel}
                                setShowInfoPanel={setShowInfoPanel}
                                setShowMobileList={setShowMobileList}
                                timeNow={timeNow}
                                messagesEndRef={messagesEndRef}
                                hasMore={hasMoreMessages}
                                loadingOlder={loadingOlder}
                                isLoadingThread={isLoadingThread}
                                onLoadOlder={handleLoadOlder}
                                scrollContainerRef={scrollContainerRef}
                            />

                            <MessageInput
                                currentChatUser={selectedUser}
                                currentOrderContext={activeOrderCtx}
                                userOrders={activeUserOrdersList}
                                data={data}
                                setData={setData}
                                post={post}
                                reset={reset}
                                processing={processing}
                                inputRef={inputRef}
                                fileInputRef={fileInputRef}
                                imageInputRef={imageInputRef}
                                emojiPickerRef={emojiPickerRef}
                                templateSelectorRef={templateSelectorRef}
                                showEmojiPicker={showEmojiPicker}
                                setShowEmojiPicker={setShowEmojiPicker}
                                showTemplateSelector={showTemplateSelector}
                                setShowTemplateSelector={setShowTemplateSelector}
                                showTemplateManager={showTemplateManager}
                                setShowTemplateManager={setShowTemplateManager}
                                chatTemplates={chatTemplates}
                                isMessagesReadOnly={isMessagesReadOnly}
                                handleOrderDecision={handleOrderDecision}
                                handleFileChange={handleFileChange}
                                removeAttachment={removeAttachment}
                                attachmentPreview={attachmentPreview}
                                signalTyping={signalTyping}
                                onEmojiClick={onEmojiClick}
                                injectTemplate={injectTemplate}
                                onSendStart={onSendStart}
                                onSendFinished={onSendFinished}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col justify-center p-8 bg-stone-50/30">
                            <WorkspaceEmptyState
                                icon={MessageCircle}
                                title="Select a conversation"
                                description="Choose a customer from the left sidebar to view order context and start messaging."
                                compact={false}
                            />
                        </div>
                    )}
                </div>

                <ChatOrderDrawer
                    show={showInfoPanel}
                    onClose={() => setShowInfoPanel(false)}
                    currentChatUser={selectedUser}
                    currentChatUserAddress={currentChatUserAddress}
                    currentOrderContext={activeOrderCtx}
                    userOrders={activeUserOrdersList}
                    activeMessages={messages}
                    onOrderDecision={handleOrderDecision}
                />
            </div>

            <ChatModals
                activeMedia={activeMedia}
                setActiveMedia={setActiveMedia}
                galleryImages={galleryImages}
                templateManager={templateManager}
                chatTemplates={chatTemplates}
                showAutomationModal={showAutomationModal}
                setShowAutomationModal={setShowAutomationModal}
                autoReplySettings={autoReplySettings}
                canEditMessages={canEditMessages}
            />
        </>
    );
}

Chat.layout = page => <SellerWorkspaceLayout active="chat" overflowHidden={true}>{page}</SellerWorkspaceLayout>;

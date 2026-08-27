import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import useEchoConnection from '@/hooks/useEchoConnection';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import { formatChatDateLabel, formatChatRelative } from '@/lib/chatTime';
import { compressImage } from "@/utils/imageCompressor";

// Subcomponents
import ChatSidebar from '@/Components/Seller/Chat/ChatSidebar';
import MessageWindow from '@/Components/Seller/Chat/MessageWindow';
import MessageInput from '@/Components/Seller/Chat/MessageInput';
import OrderContextSidebar from '@/Components/Seller/Chat/OrderContextSidebar';
import QuickTemplateSelector from '@/Components/Seller/Chat/QuickTemplateSelector';
import ChatAutomationModal from '@/Components/Seller/Chat/ChatAutomationModal';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

export default function Chat({ auth, conversations = [], activeMessages = [], hasMore = false, currentChatUser = null, currentOrderContext = null, userOrders = [], chatTemplates = [], autoReplySettings = null }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const isEchoConnected = useEchoConnection();
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [showAutomationModal, setShowAutomationModal] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [activeMedia, setActiveMedia] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [timeNow, setTimeNow] = useState(() => Date.now());
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

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const templateSelectorRef = useRef(null);
    const lastTypingSignal = useRef(0);

    const { canEdit: canEditMessages, isReadOnly: isMessagesReadOnly } = useSellerModuleAccess('messages');

    const currentChatUserAddress = formatStructuredAddress({
        street_address: selectedUser?.street_address,
        barangay: selectedUser?.barangay,
        city: selectedUser?.city,
        region: selectedUser?.region,
        postal_code: selectedUser?.zip_code,
    });

    const revokeAttachmentPreview = () => {
        if (attachmentPreview?.url?.startsWith('blob:')) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
    };

    // Chat Message Form
    const { data, setData, post, reset, processing } = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
        attachment: null
    });

    // Chat Template Form
    const { 
        data: templateData, 
        setData: setTemplateData, 
        post: postTemplate, 
        put: putTemplate, 
        delete: deleteTemplate, 
        processing: templateProcessing, 
        reset: resetTemplate, 
        errors: templateErrors 
    } = useForm({
        id: null,
        title: '',
        shortcut: '',
        content: ''
    });

    const [editingTemplateId, setEditingTemplateId] = useState(null);
    const [deletingTemplateId, setDeletingTemplateId] = useState(null);

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
    }, []);

    useEffect(() => {
        return () => revokeAttachmentPreview();
    }, [attachmentPreview]);

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

        // Check cache for instant 0ms swap
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

        // Optimistically clear unread badge in contact list
        setActiveContactList(prev => prev.map(c => c.id === contact.id ? { ...c, unread: 0 } : c));

        // Mark as read immediately
        markAsRead(contact.id);

        // Inertia partial reload (only active chat details)
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
    }, [selectedUser?.id, markAsRead, setData]);

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

    const signalTyping = () => {
        if (!currentChatUser || isMessagesReadOnly) return;
        const now = Date.now();
        if (now - lastTypingSignal.current > 2000) {
            lastTypingSignal.current = now;
            window.axios.post(route('chat.signal-typing'), { receiver_id: currentChatUser.id });
        }
    };

    const handleOrderDecision = (nextStatus) => {
        if (!currentOrderContext?.canRespond) return;
        router.post(
            route('orders.update', currentOrderContext.orderNumber),
            { status: nextStatus },
            { preserveScroll: true, preserveState: true }
        );
    };

    const handleFileChange = async (e) => {
        if (isMessagesReadOnly) {
            e.target.value = '';
            return;
        }
        let file = e.target.files[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                file = await compressImage(file);
            }
            revokeAttachmentPreview();
            setData('attachment', file);
            setAttachment(file);
            const previewUrl = URL.createObjectURL(file);
            setAttachmentPreview({
                url: previewUrl,
                type: file.type.startsWith('image/') ? 'image' : 'document',
                name: file.name
            });
            setShowEmojiPicker(false);
            inputRef.current?.focus();
        }
    };

    const removeAttachment = () => {
        revokeAttachmentPreview();
        setData('attachment', null);
        setAttachment(null);
        setAttachmentPreview(null);
    };

    const onEmojiClick = (emojiObject) => {
        if (isMessagesReadOnly) return;
        setData('message', data.message + emojiObject.emoji);
        inputRef.current?.focus();
    };

    const injectTemplate = (content) => {
        if (isMessagesReadOnly) return;
        setData('message', content);
        setShowTemplateSelector(false);
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.style.height = 'auto';
                inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
                inputRef.current.focus();
            }
        }, 0);
    };

    const submitTemplate = (e) => {
        e.preventDefault();
        if (editingTemplateId) {
            putTemplate(route('chat.templates.update', editingTemplateId), {
                onSuccess: () => {
                    setEditingTemplateId(null);
                    resetTemplate();
                }
            });
        } else {
            postTemplate(route('chat.templates.store'), {
                onSuccess: () => {
                    resetTemplate();
                }
            });
        }
    };

    const handleEditTemplate = (template) => {
        setEditingTemplateId(template.id);
        setTemplateData({
            id: template.id,
            title: template.title,
            shortcut: template.shortcut || '',
            content: template.content
        });
    };

    const handleDeleteTemplate = (id) => {
        setDeletingTemplateId(id);
    };

    const confirmDeleteTemplate = () => {
        const id = deletingTemplateId;
        setDeletingTemplateId(null);
        deleteTemplate(route('chat.templates.destroy', id));
    };

    const displayedMessages = useMemo(() => {
        return [...messages, ...pendingMessages];
    }, [messages, pendingMessages]);

    // Extract images for gallery
    const galleryImages = useMemo(() => displayedMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: msg.attachment_url || (msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') || msg.attachment_path.startsWith('http') || msg.attachment_path.startsWith('/storage') ? msg.attachment_path : `/storage/${msg.attachment_path}`),
            type: 'image',
            id: msg.id
        })), [displayedMessages]);

    // Group messages by day
    const groupedMessages = useMemo(() => displayedMessages.reduce((groups, msg) => {
        const date = formatChatDateLabel(msg.created_at, timeNow);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {}), [displayedMessages, timeNow]);

    return (
        <>
            <Head title="Chat" />
            <SellerHeader
                title={
                    <div className="flex items-center gap-3">
                        <span>Messages</span>
                        {activeContactList.length > 0 && (
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
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
                    <ChatSidebar
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

                    {showInfoPanel && (
                        <OrderContextSidebar
                            currentChatUser={selectedUser}
                            setShowInfoPanel={setShowInfoPanel}
                            currentChatUserAddress={currentChatUserAddress}
                            activeMessages={messages}
                        />
                    )}
                </div>

                <Suspense fallback={null}>
                    <MediaViewer 
                        show={!!activeMedia} 
                        mediaList={galleryImages}
                        initialIndex={activeMedia?.index || 0}
                        onClose={() => setActiveMedia(null)} 
                    />
                </Suspense>

                <QuickTemplateSelector
                    showTemplateManager={showTemplateManager}
                    setShowTemplateManager={setShowTemplateManager}
                    chatTemplates={chatTemplates}
                    editingTemplateId={editingTemplateId}
                    setEditingTemplateId={setEditingTemplateId}
                    templateData={templateData}
                    setTemplateData={setTemplateData}
                    templateProcessing={templateProcessing}
                    submitTemplate={submitTemplate}
                    resetTemplate={resetTemplate}
                    templateErrors={templateErrors}
                    handleEditTemplate={handleEditTemplate}
                    handleDeleteTemplate={handleDeleteTemplate}
                    deletingTemplateId={deletingTemplateId}
                    setDeletingTemplateId={setDeletingTemplateId}
                    confirmDeleteTemplate={confirmDeleteTemplate}
                />

                <ChatAutomationModal
                    isOpen={showAutomationModal}
                    onClose={() => setShowAutomationModal(false)}
                    autoReplySettings={autoReplySettings}
                    chatTemplates={chatTemplates}
                    canEdit={canEditMessages}
                />
        </>
    );
}

Chat.layout = page => <SellerWorkspaceLayout active="chat" overflowHidden={true}>{page}</SellerWorkspaceLayout>;

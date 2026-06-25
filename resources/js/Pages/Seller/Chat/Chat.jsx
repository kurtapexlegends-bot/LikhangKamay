import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import useSellerModuleAccess from '@/hooks/useSellerModuleAccess';
import useEchoConnection from '@/hooks/useEchoConnection';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import { formatChatDateLabel, formatChatRelative } from '@/lib/chatTime';

// Subcomponents
import ChatSidebar from '@/Components/Seller/Chat/ChatSidebar';
import MessageWindow from '@/Components/Seller/Chat/MessageWindow';
import MessageInput from '@/Components/Seller/Chat/MessageInput';
import OrderContextSidebar from '@/Components/Seller/Chat/OrderContextSidebar';
import QuickTemplateSelector from '@/Components/Seller/Chat/QuickTemplateSelector';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

export default function Chat({ auth, conversations, activeMessages, currentChatUser, currentOrderContext = null, chatTemplates = [] }) {
    const { openSidebar } = useSellerWorkspaceShell();
    const isEchoConnected = useEchoConnection();
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [showTemplateSelector, setShowTemplateSelector] = useState(false);
    const [activeMedia, setActiveMedia] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [timeNow, setTimeNow] = useState(Date.now());
    const [isCounterpartTyping, setIsCounterpartTyping] = useState(false);
    const [pendingMessages, setPendingMessages] = useState([]);
    const typingTimeoutRef = useRef(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const templateSelectorRef = useRef(null);
    const lastTypingSignal = useRef(0);

    const { canEdit: canEditMessages, isReadOnly: isMessagesReadOnly } = useSellerModuleAccess('messages');

    const currentChatUserAddress = formatStructuredAddress({
        street_address: currentChatUser?.street_address,
        barangay: currentChatUser?.barangay,
        city: currentChatUser?.city,
        region: currentChatUser?.region,
        postal_code: currentChatUser?.zip_code,
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

    useEffect(() => {
        setIsCounterpartTyping(!!currentChatUser?.is_typing);
    }, [currentChatUser?.id, currentChatUser?.is_typing]);

    // Fallback polling when Echo is disconnected or offline
    useEffect(() => {
        if (isEchoConnected || !currentChatUser || processing) return undefined;

        const interval = setInterval(() => {
            if (document.hidden) return;
            router.reload({
                only: ['activeMessages', 'conversations', 'currentOrderContext'],
                preserveScroll: true,
                preserveState: true,
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [isEchoConnected, currentChatUser?.id, processing]);

    // Real-time WebSockets via Echo
    useEffect(() => {
        if (!auth?.user?.id || !window.Echo) return undefined;

        const channel = window.Echo.private(`chat.${auth.user.id}`);

        channel.listen('.message.sent', (e) => {
            const senderId = Number(e.message.sender_id);
            const myId = Number(auth.effectiveSellerId || auth.user.id);
            if (senderId === myId) return;

            if (currentChatUser && senderId === Number(currentChatUser.id)) {
                router.reload({ only: ['activeMessages', 'conversations', 'currentOrderContext'] });
            } else {
                router.reload({ only: ['conversations'] });
            }
        });

        channel.listen('.message.seen', (e) => {
            if (currentChatUser && Number(e.senderId) === Number(currentChatUser.id)) {
                router.reload({ only: ['activeMessages'] });
            }
        });

        channel.listen('.user.typing', (e) => {
            if (currentChatUser && Number(e.senderId) === Number(currentChatUser.id)) {
                setIsCounterpartTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsCounterpartTyping(false);
                }, 4000);
            }
        });

        return () => {
            channel.stopListening('.message.sent');
            channel.stopListening('.message.seen');
            channel.stopListening('.user.typing');
        };
    }, [auth.user.id, currentChatUser?.id]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeMessages]);

    const markAsRead = (senderId) => {
        if (!senderId) return;
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    };

    useEffect(() => {
        setData('receiver_id', currentChatUser?.id || '');
        setPendingMessages([]);
        if (currentChatUser) {
            setShowMobileList(false);
            if (activeMessages.length === 0 || currentChatUser.id !== data.receiver_id) {
                inputRef.current?.focus();
            }
            if (document.hasFocus()) {
                markAsRead(currentChatUser.id);
            }
        }
    }, [currentChatUser, activeMessages.length]);

    useEffect(() => {
        const handleFocus = () => {
            if (currentChatUser && document.hasFocus()) {
                markAsRead(currentChatUser.id);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentChatUser]);

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

    const handleFileChange = (e) => {
        if (isMessagesReadOnly) {
            e.target.value = '';
            return;
        }
        const file = e.target.files[0];
        if (file) {
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
        return [...activeMessages, ...pendingMessages];
    }, [activeMessages, pendingMessages]);

    // Extract images for gallery
    const galleryImages = useMemo(() => displayedMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') ? msg.attachment_path : `/storage/${msg.attachment_path}`,
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
                        <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full hidden sm:flex">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                            Live
                        </div>
                        {conversations.length > 0 && (
                            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                {conversations.length}
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
                        conversations={conversations}
                        currentChatUser={currentChatUser}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        timeNow={timeNow}
                        showMobileList={showMobileList}
                        setShowMobileList={setShowMobileList}
                    />

                    {/* CONVERSATION AREA */}
                    <div className={`flex-1 flex flex-col min-h-0 overflow-hidden bg-[#FDFBF9] ${!showMobileList ? 'flex' : 'hidden sm:flex'}`}>
                        {currentChatUser ? (
                            <>
                                <MessageWindow
                                    currentChatUser={{
                                        ...currentChatUser,
                                        is_typing: isCounterpartTyping
                                    }}
                                    currentOrderContext={currentOrderContext}
                                    groupedMessages={groupedMessages}
                                    galleryImages={galleryImages}
                                    setActiveMedia={setActiveMedia}
                                    showInfoPanel={showInfoPanel}
                                    setShowInfoPanel={setShowInfoPanel}
                                    setShowMobileList={setShowMobileList}
                                    timeNow={timeNow}
                                    messagesEndRef={messagesEndRef}
                                />

                                <MessageInput
                                    currentChatUser={currentChatUser}
                                    currentOrderContext={currentOrderContext}
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
                            currentChatUser={currentChatUser}
                            setShowInfoPanel={setShowInfoPanel}
                            currentChatUserAddress={currentChatUserAddress}
                            activeMessages={activeMessages}
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
        </>
    );
}

Chat.layout = page => <SellerWorkspaceLayout active="chat" overflowHidden={true}>{page}</SellerWorkspaceLayout>;

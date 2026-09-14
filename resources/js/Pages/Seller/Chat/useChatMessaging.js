import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useForm, router } from '@inertiajs/react';
import { formatChatDateLabel } from '@/lib/chatTime';
import { compressImage } from '@/utils/imageCompressor';

export default function useChatMessaging({
    selectedUser,
    activeOrderCtx,
    activeUserOrdersList,
    hasMoreMessages,
    threadCache,
    messages = [],
    setMessages,
    setActiveContactList,
    timeNow,
    isMessagesReadOnly,
    setShowEmojiPicker,
    setShowTemplateSelector,
}) {
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const templateSelectorRef = useRef(null);
    const lastTypingSignal = useRef(0);

    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [pendingMessages, setPendingMessages] = useState([]);

    const { data, setData, post, reset, processing } = useForm({
        receiver_id: selectedUser?.id || '',
        message: '',
        attachment: null,
    });

    const revokeAttachmentPreview = useCallback(() => {
        if (attachmentPreview?.url?.startsWith('blob:')) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
    }, [attachmentPreview]);

    useEffect(() => {
        return () => revokeAttachmentPreview();
    }, [revokeAttachmentPreview]);

    const signalTyping = useCallback(() => {
        if (!selectedUser || isMessagesReadOnly) return;
        const now = Date.now();
        if (now - lastTypingSignal.current > 2000) {
            lastTypingSignal.current = now;
            window.axios.post(route('chat.signal-typing'), { receiver_id: selectedUser.id });
        }
    }, [selectedUser, isMessagesReadOnly]);

    const handleOrderDecision = useCallback((nextStatus) => {
        if (!activeOrderCtx?.canRespond) return;
        router.post(
            route('orders.update', activeOrderCtx.orderNumber),
            { status: nextStatus },
            { preserveScroll: true, preserveState: true }
        );
    }, [activeOrderCtx]);

    const handleFileChange = useCallback(async (e) => {
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
    }, [isMessagesReadOnly, revokeAttachmentPreview, setData, setShowEmojiPicker]);

    const removeAttachment = useCallback(() => {
        revokeAttachmentPreview();
        setData('attachment', null);
        setAttachment(null);
        setAttachmentPreview(null);
    }, [revokeAttachmentPreview, setData]);

    const onEmojiClick = useCallback((emojiObject) => {
        if (isMessagesReadOnly) return;
        setData('message', data.message + emojiObject.emoji);
        inputRef.current?.focus();
    }, [isMessagesReadOnly, data.message, setData]);

    const injectTemplate = useCallback((content) => {
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
    }, [isMessagesReadOnly, setData, setShowTemplateSelector]);

    const onSendStart = useCallback((tempMsg) => {
        setPendingMessages(prev => [...prev, tempMsg]);
    }, []);

    const onSendFinished = useCallback((tempId, success, serverMsg) => {
        if (success && serverMsg) {
            setPendingMessages(prev => prev.filter(m => m.id !== tempId));
            setMessages(prev => {
                if (prev.some(m => m.id === serverMsg.id)) return prev;
                const next = [...prev, serverMsg];
                if (selectedUser && threadCache?.current) {
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
    }, [hasMoreMessages, activeOrderCtx, activeUserOrdersList, selectedUser, setActiveContactList, setMessages, threadCache]);

    const displayedMessages = useMemo(() => {
        return [...messages, ...pendingMessages];
    }, [messages, pendingMessages]);

    const galleryImages = useMemo(() => displayedMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: msg.attachment_url || (msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') || msg.attachment_path.startsWith('http') || msg.attachment_path.startsWith('/storage') ? msg.attachment_path : `/storage/${msg.attachment_path}`),
            type: 'image',
            id: msg.id
        })), [displayedMessages]);

    const groupedMessages = useMemo(() => displayedMessages.reduce((groups, msg) => {
        const date = formatChatDateLabel(msg.created_at, timeNow);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {}), [displayedMessages, timeNow]);

    return {
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
        setPendingMessages,
        displayedMessages,
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
    };
}

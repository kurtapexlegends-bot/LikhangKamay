import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
    AlertCircle,
    FileIcon,
    Image as ImageIcon,
    Paperclip,
    Send,
    Smile,
    X,
    MessageCircle,
} from 'lucide-react';

export default function MessageInput({ 
    currentChatUser, 
    currentChannel,
    form,

    // Props passed by Chat.jsx (Seller-Buyer Chat)
    data: propData,
    setData: propSetData,
    post: propPost,
    processing: propProcessing,
    reset: propReset,
    errors: propErrors = {},

    inputRef: propInputRef,
    fileInputRef: propFileInputRef,
    imageInputRef: propImageInputRef,
    emojiPickerRef: propEmojiPickerRef,

    showEmojiPicker: propShowEmojiPicker,
    setShowEmojiPicker: propSetShowEmojiPicker,
    attachmentPreview: propAttachmentPreview,
    removeAttachment: propRemoveAttachment,
    handleFileChange: propHandleFileChange,
    onEmojiClick: propOnEmojiClick,
    signalTyping: propSignalTyping,

    // Other props from Chat.jsx
    isMessagesReadOnly = false,
    chatTemplates = [],
    showTemplateSelector = false,
    setShowTemplateSelector,
    showTemplateManager,
    setShowTemplateManager,
    injectTemplate,
    templateSelectorRef,
    currentOrderContext,
    handleOrderDecision,

    // Optimistic UI update callbacks
    onSendStart,
    onSendFinished
}) {
    // 1. Resolve form hooks or individual props
    const data = form ? form.data : propData;
    const setData = form ? form.setData : propSetData;
    const post = form ? form.post : propPost;
    const processing = form ? form.processing : propProcessing;
    const reset = form ? form.reset : propReset;
    const errors = form ? (form.errors || {}) : (propErrors || {});

    // 2. Resolve states (internal states as fallback for Team Inbox)
    const [internalShowEmojiPicker, internalSetShowEmojiPicker] = useState(false);
    const showEmojiPicker = form ? internalShowEmojiPicker : propShowEmojiPicker;
    const setShowEmojiPicker = form ? internalSetShowEmojiPicker : propSetShowEmojiPicker;

    const [internalAttachmentPreview, internalSetAttachmentPreview] = useState(null);
    const attachmentPreview = form ? internalAttachmentPreview : propAttachmentPreview;
    const setAttachmentPreview = form ? internalSetAttachmentPreview : null;

    const [attachmentPreviewBroken, setAttachmentPreviewBroken] = useState(false);

    // 3. Resolve refs
    const localInputRef = useRef(null);
    const inputRef = form ? localInputRef : propInputRef;

    const localFileInputRef = useRef(null);
    const fileInputRef = form ? localFileInputRef : propFileInputRef;

    const localImageInputRef = useRef(null);
    const imageInputRef = form ? localImageInputRef : propImageInputRef;

    const localEmojiPickerRef = useRef(null);
    const emojiPickerRef = form ? localEmojiPickerRef : propEmojiPickerRef;

    // 4. Typing trigger
    const lastTypingSignal = useRef(0);
    const signalTyping = () => {
        if (!currentChatUser) return;
        if (form) {
            // Team Messages
            const now = Date.now();
            if (now - lastTypingSignal.current > 2000) {
                lastTypingSignal.current = now;
                if (window.axios) {
                    window.axios.post(route('team-messages.signal-typing'), { receiver_id: currentChatUser.id }).catch(() => {});
                }
            }
        } else {
            // Seller-Buyer Chat
            if (propSignalTyping) {
                propSignalTyping();
            }
        }
    };

    // When chat user or channel changes, focus input
    useEffect(() => {
        if (currentChatUser || currentChannel) {
            inputRef.current?.focus();
        }
    }, [currentChatUser?.id, currentChannel?.id]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!data.message.trim() && !data.attachment) return;

        const messageText = data.message;
        const tempId = `temp-${Date.now()}`;

        const optimisticMsg = {
            id: tempId,
            text: messageText,
            attachment_path: attachmentPreview ? attachmentPreview.url : null,
            attachment_type: attachmentPreview ? attachmentPreview.type : null,
            sender: 'me',
            created_at: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            is_read: false,
            status: 'sending'
        };

        if (onSendStart) {
            onSendStart(optimisticMsg);
        }

        setData('message', '');
        if (inputRef.current) {
            inputRef.current.style.height = 'auto';
        }

        if (form) {
            // Team Messages submission
            post(route('team-messages.store'), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    if (attachmentPreview?.url) {
                        URL.revokeObjectURL(attachmentPreview.url);
                    }
                    reset('attachment');
                    if (setAttachmentPreview) setAttachmentPreview(null);
                    setShowEmojiPicker(false);
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                    if (onSendFinished) onSendFinished(tempId, true);
                },
                onError: () => {
                    setData('message', messageText);
                    if (onSendFinished) onSendFinished(tempId, false);
                }
            });
        } else {
            // Seller-Buyer Chat submission
            post(route('chat.store'), {
                preserveScroll: true,
                forceFormData: true,
                onSuccess: () => {
                    reset('attachment');
                    if (propRemoveAttachment) propRemoveAttachment();
                    setShowEmojiPicker(false);
                    if (inputRef.current) {
                        inputRef.current.focus();
                    }
                    if (onSendFinished) onSendFinished(tempId, true);
                },
                onError: () => {
                    setData('message', messageText);
                    if (onSendFinished) onSendFinished(tempId, false);
                }
            });
        }
    };

    const handleFileChange = (event) => {
        if (form) {
            const file = event.target.files?.[0];
            if (!file) return;

            if (attachmentPreview?.url) {
                URL.revokeObjectURL(attachmentPreview.url);
            }

            setData('attachment', file);
            setAttachmentPreviewBroken(false);
            if (setAttachmentPreview) {
                setAttachmentPreview({
                    url: URL.createObjectURL(file),
                    name: file.name,
                    type: file.type.startsWith('image/') ? 'image' : 'document',
                });
            }
            setShowEmojiPicker(false);
            inputRef.current?.focus();
        } else {
            if (propHandleFileChange) {
                propHandleFileChange(event);
            }
        }
    };

    const removeAttachment = () => {
        if (form) {
            if (attachmentPreview?.url) {
                URL.revokeObjectURL(attachmentPreview.url);
            }
            setData('attachment', null);
            if (setAttachmentPreview) setAttachmentPreview(null);
        } else {
            if (propRemoveAttachment) {
                propRemoveAttachment();
            }
        }
    };

    const onEmojiClick = (emojiObject) => {
        if (form) {
            setData('message', data.message + emojiObject.emoji);
            inputRef.current?.focus();
        } else {
            if (propOnEmojiClick) {
                propOnEmojiClick(emojiObject);
            }
        }
    };

    return (
        <div className="relative z-10 w-full shrink-0 border-t border-gray-100 bg-white/90 p-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] backdrop-blur-md sm:p-4">
            <div className="relative mx-auto flex w-full max-w-4xl flex-col">
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full right-3 z-50 mb-2 overflow-hidden rounded-2xl border border-gray-100 shadow-2xl sm:right-4">
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme="light"
                            lazyLoadEmojis
                        />
                    </div>
                )}

                {/* Quick Templates Panel (Seller-Buyer Chat Only) */}
                {!form && showTemplateSelector && (
                    <div ref={templateSelectorRef} className="absolute bottom-full left-3 sm:left-4 mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 bg-white border border-gray-100 shadow-2xl rounded-2xl w-72 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Quick Templates</span>
                            <button 
                                onClick={() => setShowTemplateManager(true)}
                                className="text-[10px] font-bold text-clay-600 hover:text-clay-700 uppercase tracking-wider"
                                type="button"
                            >
                                Manage
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto p-1 divide-y divide-gray-50 custom-scrollbar">
                            {chatTemplates.length > 0 ? (
                                chatTemplates.map((tpl) => (
                                    <button
                                        key={tpl.id}
                                        onClick={() => injectTemplate(tpl.content)}
                                        className="w-full text-left px-3 py-2.5 hover:bg-stone-50 transition rounded-lg text-xs font-semibold text-gray-700 flex flex-col gap-0.5"
                                        type="button"
                                    >
                                        <span className="font-bold text-gray-900 truncate block w-full">{tpl.title}</span>
                                        <span className="text-gray-500 line-clamp-2 leading-relaxed">{tpl.content}</span>
                                    </button>
                                ))
                            ) : (
                                <div className="p-6 text-center">
                                    <p className="text-[11px] text-gray-400 font-medium">No templates found.</p>
                                    <button 
                                        onClick={() => { setShowTemplateSelector(false); setShowTemplateManager(true); }}
                                        className="mt-2 text-[11px] font-bold text-clay-600 hover:text-clay-700"
                                        type="button"
                                    >
                                        Create your first template
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {attachmentPreview && (
                    <div className="group mb-3 mt-3 flex items-start justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex min-w-0 items-center gap-3 overflow-hidden">
                            {attachmentPreview.type === 'image' ? (
                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                                    {attachmentPreviewBroken ? (
                                        <div className="flex h-full w-full items-center justify-center bg-stone-50 text-stone-400">
                                            <FileIcon size={18} />
                                        </div>
                                    ) : (
                                        <img src={attachmentPreview.url} alt="Preview" className="h-full w-full object-cover" onError={() => setAttachmentPreviewBroken(true)} />
                                    )}
                                </div>
                            ) : (
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-clay-500 shadow-sm">
                                    <FileIcon size={24} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="mb-0.5 truncate text-sm font-medium text-gray-800">{attachmentPreview.name}</p>
                                <p className="text-xs text-gray-500">
                                    {attachmentPreview.type === 'image' ? 'Image File' : 'Document File'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={removeAttachment}
                            className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {(errors.message || errors.attachment) && (
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700">
                        <AlertCircle size={13} />
                        {errors.message || errors.attachment}
                    </p>
                )}

                <form onSubmit={handleSubmit} className="flex w-full items-end gap-2 sm:gap-3">
                    <div className="relative flex flex-1 items-center overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-1 shadow-sm transition-all focus-within:border-clay-400 focus-within:ring-4 focus-within:ring-clay-50">
                        <div className="flex items-center gap-0.5 px-1">
                            {/* Templates Button (Seller-Buyer Chat Only) */}
                            {!form && (
                                <button 
                                    type="button"
                                    onClick={() => !isMessagesReadOnly && setShowTemplateSelector(!showTemplateSelector)}
                                    disabled={isMessagesReadOnly}
                                    className={`hidden sm:flex p-2 rounded-xl transition-all duration-200 min-h-[40px] min-w-[40px] items-center justify-center ${
                                        isMessagesReadOnly
                                            ? 'cursor-not-allowed text-gray-300'
                                            : showTemplateSelector 
                                                ? 'bg-white text-clay-600 shadow-sm'
                                                : 'text-gray-400 hover:bg-white hover:text-clay-600'
                                    }`}
                                    title="Quick Templates"
                                >
                                    <MessageCircle size={20} />
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                disabled={isMessagesReadOnly}
                                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Attach image"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isMessagesReadOnly}
                                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Attach file"
                            >
                                <Paperclip size={20} />
                            </button>
                        </div>

                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={data.message}
                            onChange={(event) => {
                                setData('message', event.target.value);
                                event.target.style.height = 'auto';
                                event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
                                signalTyping();
                            }}
                            disabled={isMessagesReadOnly}
                            placeholder={isMessagesReadOnly ? "Chat is read-only..." : (form ? "Message your team..." : "Type your message here...")}
                            className="custom-scrollbar max-h-[120px] min-h-[42px] w-full flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-sm font-medium leading-relaxed text-gray-700 placeholder-gray-400 focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSubmit(event);
                                } else {
                                    signalTyping();
                                }
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => !isMessagesReadOnly && setShowEmojiPicker((value) => !value)}
                            disabled={isMessagesReadOnly}
                            className={`mx-1 shrink-0 rounded-xl p-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${showEmojiPicker ? 'bg-white text-clay-600 shadow-sm' : 'text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm'}`}
                            title="Add emoji"
                            aria-expanded={showEmojiPicker}
                            aria-label="Toggle emoji picker"
                        >
                            <Smile size={20} />
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={processing || isMessagesReadOnly || (!data.message.trim() && !data.attachment)}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay-600 text-white transition-all hover:bg-clay-700 hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed"
                    >
                        <Send size={20} />
                    </button>
                </form>

                <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import {
    AlertCircle,
    Send,
    Smile,
} from 'lucide-react';
import MentionsList, { useMentions } from './MentionsList';
import { SlashCommandsList, useSlashCommands } from './SlashCommandsList';
import TemplateDropdown from './TemplateDropdown';
import { compressImage } from "@/utils/imageCompressor";
import { OrderMentionsList, useOrderMentions } from '@/Components/Chat/OrderMentionsList';
import EmojiPickerPopover from './EmojiPickerPopover';
import MessageAttachmentPreview from './MessageAttachmentPreview';
import MessageActionButtons from './MessageActionButtons';
import useChatClickOutside from './hooks/useChatClickOutside';
import { createOptimisticMessage } from './chatInputHelpers';

export default function MessageInput({ 
    currentChatUser, 
    currentChannel,
    form,
    userOrders = [],
    eligibleContacts = [],

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
    const [isSending, setIsSending] = useState(false);
    const showEmojiPicker = form ? internalShowEmojiPicker : propShowEmojiPicker;
    const setShowEmojiPicker = form ? internalSetShowEmojiPicker : propSetShowEmojiPicker;

    const [internalAttachmentPreview, internalSetAttachmentPreview] = useState(null);
    const attachmentPreview = form ? internalAttachmentPreview : propAttachmentPreview;
    const setAttachmentPreview = form ? internalSetAttachmentPreview : null;

    // 3. Resolve refs
    const localInputRef = useRef(null);
    const inputRef = form ? localInputRef : propInputRef;

    const localFileInputRef = useRef(null);
    const fileInputRef = form ? localFileInputRef : propFileInputRef;

    const localImageInputRef = useRef(null);
    const imageInputRef = form ? localImageInputRef : propImageInputRef;

    const localEmojiPickerRef = useRef(null);
    const emojiPickerRef = form ? localEmojiPickerRef : propEmojiPickerRef;
    
    const mentionsDropdownRef = useRef(null);
    const orderMentionsRef = useRef(null);
    const slashCommandsDropdownRef = useRef(null);

    // 4. Typing trigger
    const lastTypingSignal = useRef(0);

    // 5. Mentions Custom Hook Integration
    const {
        isDropdownVisible,
        filteredMentions,
        mentionIndex,
        selectMention,
        checkMentions,
        handleKeyDown: handleMentionsKeyDown,
        setShowMentions
    } = useMentions({
        message: data.message,
        setMessage: (val) => {
            setData('message', val);
        },
        inputRef,
        eligibleContacts,
        currentChannel
    });

    const {
        isDropdownVisible: isSlashDropdownVisible,
        filteredTemplates: filteredSlashTemplates,
        selectedIndex: slashSelectedIndex,
        selectTemplate: selectSlashTemplate,
        checkSlashCommands,
        handleKeyDown: handleSlashKeyDown,
        setShowSlashMenu
    } = useSlashCommands({
        message: data.message,
        setMessage: (val) => setData('message', val),
        inputRef,
        chatTemplates
    });

    const {
        isDropdownVisible: isOrderDropdownVisible,
        filteredOrders,
        orderIndex,
        checkOrderMentions,
        selectOrder,
        toggleManualPicker,
        closeDropdown: closeOrderDropdown
    } = useOrderMentions({
        message: data.message,
        setMessage: (val) => setData('message', val),
        inputRef,
        userOrders
    });

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

    // When chat user changes, focus input and reset typing
    useEffect(() => {
        if (currentChatUser || currentChannel) {
            inputRef.current?.focus();
        }
    }, [currentChatUser?.id, currentChannel?.id]);

    // Click outside handler for dropdowns
    useChatClickOutside({
        showEmojiPicker,
        setShowEmojiPicker,
        emojiPickerRef,
        showTemplateSelector,
        setShowTemplateSelector,
        templateSelectorRef,
        isDropdownVisible,
        setShowMentions,
        mentionsDropdownRef,
        isSlashDropdownVisible,
        setShowSlashMenu,
        slashCommandsDropdownRef,
    });

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!data.message.trim() && !data.attachment) return;
        if (isSending) return;

        const messageText = data.message;
        const tempId = `temp-${Date.now()}`;
        const optimisticMsg = createOptimisticMessage(tempId, messageText, attachmentPreview);

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
                showProgress: false,
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
            const formData = new FormData();
            formData.append('receiver_id', currentChatUser.id);
            if (messageText) {
                formData.append('message', messageText);
            }
            if (data.attachment) {
                formData.append('attachment', data.attachment);
            }

            reset('attachment');
            if (propRemoveAttachment) propRemoveAttachment();
            setShowEmojiPicker(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
            setIsSending(true);

            window.axios.post(route('chat.store'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json',
                }
            }).then(res => {
                if (res.data?.success && res.data.message) {
                    if (onSendFinished) onSendFinished(tempId, true, res.data.message);
                } else {
                    if (onSendFinished) onSendFinished(tempId, false);
                }
            }).catch(err => {
                console.error('Failed to send message:', err);
                setData('message', messageText);
                if (onSendFinished) onSendFinished(tempId, false);
            }).finally(() => {
                setIsSending(false);
            });
        }
    };

    const handleFileChange = async (event) => {
        if (form) {
            let file = event.target.files?.[0];
            if (!file) return;

            if (file.type.startsWith('image/')) {
                file = await compressImage(file);
            }

            if (attachmentPreview?.url) {
                URL.revokeObjectURL(attachmentPreview.url);
            }

            setData('attachment', file);
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
            const newMsg = data.message + emojiObject.emoji;
            setData('message', newMsg);
            
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.style.height = 'auto';
                    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
                }
            }, 10);
        } else {
            if (propOnEmojiClick) {
                propOnEmojiClick(emojiObject);
            }
        }
    };

    return (
        <div className="relative z-10 w-full shrink-0 border-t border-stone-200/80 bg-white p-3 shadow-xs sm:p-4">
            <div className="relative mx-auto flex w-full max-w-4xl flex-col">
                <SlashCommandsList
                    ref={slashCommandsDropdownRef}
                    isVisible={!form && isSlashDropdownVisible}
                    filteredTemplates={filteredSlashTemplates}
                    selectedIndex={slashSelectedIndex}
                    onSelect={selectSlashTemplate}
                />

                <MentionsList
                    ref={mentionsDropdownRef}
                    isVisible={isDropdownVisible}
                    filteredMentions={filteredMentions}
                    mentionIndex={mentionIndex}
                    onSelect={selectMention}
                />
                
                <EmojiPickerPopover
                    showEmojiPicker={showEmojiPicker}
                    emojiPickerRef={emojiPickerRef}
                    onEmojiClick={onEmojiClick}
                />

                {/* Quick Templates Panel (Seller-Buyer Chat Only) */}
                <TemplateDropdown
                    isVisible={!form && showTemplateSelector}
                    dropdownRef={templateSelectorRef}
                    chatTemplates={chatTemplates}
                    onSelect={(content) => {
                        injectTemplate(content);
                    }}
                    onManage={() => setShowTemplateManager(true)}
                    onCreateFirst={() => { setShowTemplateSelector(false); setShowTemplateManager(true); }}
                />

                <MessageAttachmentPreview
                    attachmentPreview={attachmentPreview}
                    removeAttachment={removeAttachment}
                />

                {(errors.message || errors.attachment) && (
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-semibold text-red-700">
                        <AlertCircle size={13} />
                        {errors.message || errors.attachment}
                    </p>
                )}

                {/* Order Mentions Autocomplete Popup */}
                <OrderMentionsList
                    ref={orderMentionsRef}
                    isVisible={isOrderDropdownVisible}
                    orders={filteredOrders}
                    orderIndex={orderIndex}
                    onSelect={selectOrder}
                    onClose={closeOrderDropdown}
                />

                <form onSubmit={handleSubmit} className="flex w-full items-end gap-2 sm:gap-3">
                    <div className="relative flex flex-1 items-center overflow-visible rounded-2xl border border-gray-200 bg-gray-50 p-1 shadow-sm transition-all focus-within:border-clay-400 focus-within:ring-4 focus-within:ring-clay-50">
                        <MessageActionButtons
                            isTeamChat={!!form}
                            isMessagesReadOnly={isMessagesReadOnly}
                            showTemplateSelector={showTemplateSelector}
                            setShowTemplateSelector={setShowTemplateSelector}
                            imageInputRef={imageInputRef}
                            fileInputRef={fileInputRef}
                            userOrders={userOrders}
                            toggleManualPicker={toggleManualPicker}
                        />

                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={data.message}
                            onChange={(event) => {
                                const val = event.target.value;
                                setData('message', val);
                                event.target.style.height = 'auto';
                                event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`;
                                signalTyping();
                                checkSlashCommands(val, event.target.selectionStart);
                                checkMentions(val, event.target.selectionStart);
                                checkOrderMentions(val, event.target.selectionStart);
                            }}
                            onSelect={(event) => {
                                checkSlashCommands(event.target.value, event.target.selectionStart);
                                checkMentions(event.target.value, event.target.selectionStart);
                                checkOrderMentions(event.target.value, event.target.selectionStart);
                            }}
                            disabled={isMessagesReadOnly}
                            placeholder={isMessagesReadOnly ? "Chat is read-only..." : (form ? "Message your team..." : "Type a message, / for templates, @ for orders...")}
                            className="custom-scrollbar max-h-[120px] min-h-[42px] w-full flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-sm font-medium leading-relaxed text-gray-700 placeholder-gray-400 focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            onKeyDown={(event) => {
                                if (handleSlashKeyDown(event)) {
                                    return;
                                }

                                if (handleMentionsKeyDown(event)) {
                                    return;
                                }

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
                        disabled={isSending || processing || isMessagesReadOnly || (!data.message.trim() && !data.attachment)}
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

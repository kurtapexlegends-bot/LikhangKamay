import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useForm } from '@inertiajs/react';
import { Send, Paperclip, Image as ImageIcon, Smile, FileIcon, X, Package } from 'lucide-react';
import { compressImage } from "@/utils/imageCompressor";
import { OrderMentionsList, useOrderMentions } from '@/Components/Chat/OrderMentionsList';

const EmojiPicker = lazy(() => import('emoji-picker-react'));

const BUYER_QUICK_REPLIES = [
    'Hello! Is this product available?',
    'Can I customize the color or size?',
    'When will this order be shipped?',
    'Thank you so much!'
];

export default function BuyerMessageInput({ currentChatUser, form, userOrders = [], hasMessages = false, onSendStart, onSendFinished }) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [attachmentError, setAttachmentError] = useState(null);

    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const orderMentionsRef = useRef(null);
    const lastTypingSignal = useRef(0);

    const { data, setData, post, reset, processing } = form;

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

    // Sync receiver_id and focus on chat user change
    useEffect(() => {
        setData('receiver_id', currentChatUser?.id || '');
        if (currentChatUser) {
            inputRef.current?.focus();
        }
        removeAttachment();
        setShowEmojiPicker(false);
    }, [currentChatUser]);

    // Handle clicks outside Emoji Picker & Mentions
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
            if (orderMentionsRef.current && !orderMentionsRef.current.contains(event.target)) {
                closeOrderDropdown();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [isSending, setIsSending] = useState(false);

    const revokeAttachmentPreview = () => {
        if (attachmentPreview?.url?.startsWith('blob:')) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
    };

    const handleSendMessage = async (e) => {
        if (e) e.preventDefault();
        const trimmed = (data.message || '').trim();
        const currentAttachment = attachment || data.attachment;
        if (!trimmed && !currentAttachment) return;
        if (isSending) return;

        const messageText = trimmed;
        const tempId = `temp-${Date.now()}`;
        const currentPreview = attachmentPreview;

        const optimisticMsg = {
            id: tempId,
            text: messageText,
            attachment_path: currentPreview ? currentPreview.url : null,
            attachment_type: currentPreview ? currentPreview.type : null,
            sender: 'me',
            created_at: new Date().toISOString(),
            time: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
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

        const formData = new FormData();
        formData.append('receiver_id', currentChatUser.id);
        if (messageText) {
            formData.append('message', messageText);
        }
        if (currentAttachment) {
            formData.append('attachment', currentAttachment);
        }

        reset('attachment');
        revokeAttachmentPreview();
        setAttachment(null);
        setAttachmentPreview(null);
        setShowEmojiPicker(false);
        setIsSending(true);

        try {
            const res = await window.axios.post(route('chat.store'), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Accept': 'application/json',
                }
            });

            if (res.data?.success && res.data.message) {
                if (onSendFinished) onSendFinished(tempId, true, res.data.message);
            } else {
                if (onSendFinished) onSendFinished(tempId, false);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
            setData('message', messageText);
            if (onSendFinished) onSendFinished(tempId, false);
        } finally {
            setIsSending(false);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const handleFileChange = async (e) => {
        setAttachmentError(null);
        let file = e.target.files?.[0];
        if (file) {
            if (file.type.startsWith('image/')) {
                file = await compressImage(file);
            }
            if (file.size > 4 * 1024 * 1024) {
                setAttachmentError('Files must be 4MB or smaller. Please choose a smaller file.');
                if (e.target) e.target.value = '';
                return;
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
        setAttachmentError(null);
        revokeAttachmentPreview();
        setData('attachment', null);
        setAttachment(null);
        setAttachmentPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const onEmojiClick = (emojiObject) => {
        setData('message', data.message + emojiObject.emoji);
        inputRef.current?.focus();
    };

    const signalTyping = () => {
        if (!currentChatUser) return;
        const now = Date.now();
        // Throttle typing signals to once every 2 seconds
        if (now - lastTypingSignal.current > 2000) {
            lastTypingSignal.current = now;
            window.axios.post(route('chat.signal-typing'), { receiver_id: currentChatUser.id });
        }
    };

    if (!currentChatUser) return null;

    return (
        <div className="p-2 sm:p-2.5 bg-white/95 backdrop-blur-md border-t border-gray-150 shrink-0 relative shadow-[0_-2px_4px_-1px_rgba(0,0,0,0.03)] z-10 w-full">
            <div className="max-w-3xl mx-auto flex flex-col">
                {/* Quick Replies Carousel (Shown for new conversations to prompt starter inquiries) */}
                {!hasMessages && (
                    <div className="flex overflow-x-auto flex-nowrap gap-1.5 pb-2 mb-1.5 no-scrollbar">
                        {BUYER_QUICK_REPLIES.map((replyText, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                    setData('message', replyText);
                                    setTimeout(() => {
                                        if (inputRef.current) {
                                            inputRef.current.style.height = 'auto';
                                            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 60) + 'px';
                                            inputRef.current.focus();
                                        }
                                    }, 0);
                                }}
                                className="px-2.5 py-1 bg-clay-50/80 border border-clay-100 hover:bg-clay-100 text-clay-700 text-[11px] font-semibold rounded-full whitespace-nowrap min-h-[28px] flex items-center justify-center active:scale-95 transition-all shadow-2xs"
                            >
                                {replyText}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full right-3 sm:right-4 mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                        <Suspense fallback={<div className="h-[350px] w-[300px] flex items-center justify-center bg-white text-xs text-stone-400">Loading emojis...</div>}>
                            <EmojiPicker 
                                onEmojiClick={onEmojiClick}
                                autoFocusSearch={false}
                                theme="light"
                                lazyLoadEmojis={true}
                            />
                        </Suspense>
                    </div>
                )}

                {/* Attachment Error Banner */}
                {attachmentError && (
                    <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between text-xs text-red-700 animate-in fade-in">
                        <span>{attachmentError}</span>
                        <button
                            type="button"
                            onClick={() => setAttachmentError(null)}
                            className="text-red-500 hover:text-red-700 ml-2"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}

                {/* Attachment Preview */}
                {attachmentPreview && (
                    <div className="mb-2 mt-1 p-2 bg-gray-50/90 rounded-lg border border-gray-200 flex items-center justify-between group animate-in fade-in slide-in-from-bottom-1">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                            {attachmentPreview.type === 'image' ? (
                                <div className="w-11 h-11 rounded-md overflow-hidden shrink-0 border border-gray-200 shadow-2xs bg-white">
                                    <img
                                        src={attachmentPreview.url}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.currentTarget.onerror = null;
                                            e.currentTarget.src = '/images/placeholder.svg';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="w-9 h-9 rounded-md bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-2xs text-clay-500">
                                    <FileIcon size={18} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-gray-800 truncate mb-0.5">{attachmentPreview.name}</p>
                                <p className="text-[10px] text-gray-500">
                                    {attachmentPreview.type === 'image' ? 'Image File' : 'Document File'}
                                </p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={removeAttachment}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors shrink-0"
                            title="Remove attachment"
                        >
                            <X size={14} />
                        </button>
                    </div>
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

                <form onSubmit={handleSendMessage} className="flex w-full flex-col gap-2">
                    <div className="flex items-end gap-2 sm:gap-2.5 w-full">
                        <div className="flex-1 relative bg-gray-50 border border-gray-200 focus-within:border-clay-400 focus-within:ring-2 focus-within:ring-clay-100 rounded-2xl flex items-center p-1 transition-all overflow-visible shadow-2xs">
                            <div className="flex items-center gap-0.5 px-0.5">
                                <button 
                                    type="button" 
                                    onClick={() => imageInputRef.current?.click()}
                                    className="p-2 rounded-xl transition-all text-gray-400 hover:bg-white hover:text-clay-600 flex items-center justify-center min-h-[36px] min-w-[36px]"
                                    title="Attach Image"
                                >
                                    <ImageIcon size={19} />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 rounded-xl transition-all text-gray-400 hover:bg-white hover:text-clay-600 flex items-center justify-center min-h-[36px] min-w-[36px]"
                                    title="Attach Document"
                                >
                                    <Paperclip size={19} />
                                </button>
                                {userOrders && userOrders.length > 0 && (
                                    <button 
                                        type="button" 
                                        onClick={toggleManualPicker}
                                        className="p-2 rounded-xl transition-all text-gray-400 hover:bg-white hover:text-clay-600 flex items-center justify-center min-h-[36px] min-w-[36px]"
                                        title="Tag Specific Order (@)"
                                    >
                                        <Package size={19} />
                                    </button>
                                )}
                            </div>

                            <textarea 
                                ref={inputRef}
                                rows={1}
                                value={data.message}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setData('message', val);
                                    checkOrderMentions(val, e.target.selectionStart);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, window.innerWidth < 640 ? 80 : 120) + 'px';
                                    signalTyping();
                                }}
                                placeholder="Type a message or @ to tag an order..." 
                                className="flex-1 w-full px-2.5 py-2 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-800 placeholder-gray-400 resize-none max-h-[80px] sm:max-h-[120px] custom-scrollbar leading-relaxed"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    } else {
                                        signalTyping();
                                    }
                                }}
                            />
                            
                            <button 
                                type="button" 
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className={`p-2 mx-0.5 rounded-xl transition-all shrink-0 flex items-center justify-center min-h-[36px] min-w-[36px] ${showEmojiPicker ? 'bg-white text-clay-600 shadow-2xs' : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                                title="Insert Emoji"
                            >
                                <Smile size={19} />
                            </button>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isSending || processing || (!data.message.trim() && !attachment && !data.attachment)}
                            className="h-11 w-11 sm:h-12 sm:w-12 min-h-[44px] min-w-[44px] rounded-2xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed bg-clay-600 text-white hover:bg-clay-700 shadow-sm hover:shadow-md active:scale-95"
                            title="Send message"
                        >
                            <Send size={19} />
                        </button>
                    </div>
                </form>

                {/* Hidden File Inputs */}
                <input 
                    type="file" 
                    ref={imageInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                />
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" 
                    className="hidden" 
                />
            </div>
        </div>
    );
}

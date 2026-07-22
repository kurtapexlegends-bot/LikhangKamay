import React, { useState, useEffect, useRef } from 'react';
import { useForm } from '@inertiajs/react';
import { Send, Paperclip, Image as ImageIcon, Smile, FileIcon, X } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { compressImage } from '@/utils/imageCompressor';

const BUYER_QUICK_REPLIES = [
    'Hello! Is this product available?',
    'Can I customize the color or size?',
    'When will this order be shipped?',
    'Thank you so much!'
];

export default function BuyerMessageInput({ currentChatUser, form, onSendStart, onSendFinished }) {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);

    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const lastTypingSignal = useRef(0);

    const { data, setData, post, reset, processing } = form;

    // Sync receiver_id and focus on chat user change
    useEffect(() => {
        setData('receiver_id', currentChatUser?.id || '');
        if (currentChatUser) {
            inputRef.current?.focus();
        }
        removeAttachment();
        setShowEmojiPicker(false);
    }, [currentChatUser]);

    // Handle clicks outside Emoji Picker
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const revokeAttachmentPreview = () => {
        if (attachmentPreview?.url?.startsWith('blob:')) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
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

        post(route('chat.store'), {
            onSuccess: () => {
                reset('attachment');
                revokeAttachmentPreview();
                setAttachment(null);
                setAttachmentPreview(null);
                setShowEmojiPicker(false);
                if (onSendFinished) onSendFinished(tempId, true);
            },
            onError: () => {
                setData('message', messageText);
                if (onSendFinished) onSendFinished(tempId, false);
            },
            preserveScroll: true
        });
    };

    const handleFileChange = async (e) => {
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
        <div className="p-3 sm:p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 shrink-0 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 w-full">
            <div className="max-w-3xl mx-auto flex flex-col">
                {/* Mobile Quick Replies Carousel */}
                <div className="flex sm:hidden overflow-x-auto flex-nowrap gap-2 pb-2.5 mb-2.5 no-scrollbar">
                    {BUYER_QUICK_REPLIES.map((replyText, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => {
                                setData('message', replyText);
                                setTimeout(() => {
                                    if (inputRef.current) {
                                        inputRef.current.style.height = 'auto';
                                        inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 70) + 'px';
                                        inputRef.current.focus();
                                    }
                                }, 0);
                            }}
                            className="px-4 py-2 bg-clay-50 border border-clay-100 hover:bg-clay-100 text-clay-700 text-xs font-bold rounded-full whitespace-nowrap min-h-[38px] flex items-center justify-center active:scale-95 transition-all"
                        >
                            {replyText}
                        </button>
                    ))}
                </div>
                
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="absolute bottom-full right-3 sm:right-4 mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                        <EmojiPicker 
                            onEmojiClick={onEmojiClick}
                            autoFocusSearch={false}
                            theme="light"
                            lazyLoadEmojis={true}
                        />
                    </div>
                )}

                {/* Attachment Preview */}
                {attachmentPreview && (
                    <div className="mb-3 mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between group animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-center gap-3 overflow-hidden">
                            {attachmentPreview.type === 'image' ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200 shadow-sm bg-white">
                                    <img src={attachmentPreview.url} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm text-clay-500">
                                    <FileIcon size={24} />
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate mb-0.5">{attachmentPreview.name}</p>
                                <p className="text-xs text-gray-500">
                                    {attachmentPreview.type === 'image' ? 'Image File' : 'Document File'}
                                </p>
                            </div>
                        </div>
                        <button 
                            type="button" 
                            onClick={removeAttachment}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                <form onSubmit={handleSendMessage} className="flex w-full flex-col gap-3">
                    <div className="flex items-end gap-2 sm:gap-3 w-full">
                        <div className="flex-1 relative bg-gray-50 border border-gray-200 focus-within:border-clay-400 focus-within:ring-4 focus-within:ring-clay-50 rounded-2xl flex items-center p-1 transition-all overflow-hidden shadow-sm">
                            <div className="flex items-center gap-0.5 px-1">
                                <button 
                                    type="button" 
                                    onClick={() => imageInputRef.current?.click()}
                                    className="p-2.5 sm:p-2 rounded-xl transition-all duration-200 text-gray-400 hover:bg-white hover:text-clay-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    title="Attach Image"
                                >
                                    <ImageIcon size={20} />
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2.5 sm:p-2 rounded-xl transition-all duration-200 text-gray-400 hover:bg-white hover:text-clay-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                                    title="Attach Document"
                                >
                                    <Paperclip size={20} />
                                </button>
                            </div>

                            <textarea 
                                ref={inputRef}
                                rows={1}
                                value={data.message}
                                onChange={(e) => {
                                    setData('message', e.target.value);
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, window.innerWidth < 640 ? 70 : 120) + 'px';
                                    signalTyping();
                                }}
                                placeholder="Type your message here..." 
                                className="flex-1 w-full px-3 py-2.5 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 placeholder-gray-400 resize-none max-h-[70px] sm:max-h-[120px] custom-scrollbar leading-relaxed"
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
                                className={`p-2.5 sm:p-2 mx-1 rounded-xl transition-all shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center ${showEmojiPicker ? 'bg-white text-clay-600 shadow-sm' : 'text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm'}`}
                                title="Insert Emoji"
                            >
                                <Smile size={20} />
                            </button>
                        </div>
                        <button 
                            type="submit" 
                            disabled={processing || (!data.message.trim() && !data.attachment)}
                            className="h-12 w-12 rounded-2xl flex items-center justify-center transition-all shrink-0 disabled:opacity-50 disabled:hover:shadow-none disabled:cursor-not-allowed bg-clay-600 text-white hover:bg-clay-700 hover:shadow-lg"
                        >
                            <Send size={20} />
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

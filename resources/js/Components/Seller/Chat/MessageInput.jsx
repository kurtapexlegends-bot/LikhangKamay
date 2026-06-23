import React, { useEffect, useState, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
    AlertCircle,
    FileIcon,
    Image as ImageIcon,
    Paperclip,
    Send,
    Smile,
    X,
} from 'lucide-react';

export default function MessageInput({ currentChatUser, form }) {
    const { data, setData, post, processing, reset, errors } = form;

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [attachmentPreviewBroken, setAttachmentPreviewBroken] = useState(false);

    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => () => {
        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
    }, [attachmentPreview]);

    // When chat user changes, focus input
    useEffect(() => {
        if (currentChatUser) {
            inputRef.current?.focus();
        }
    }, [currentChatUser]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!data.message.trim() && !data.attachment) return;

        post(route('team-messages.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                if (attachmentPreview?.url) {
                    URL.revokeObjectURL(attachmentPreview.url);
                }
                reset('message', 'attachment');
                setAttachmentPreview(null);
                setShowEmojiPicker(false);
                if (inputRef.current) {
                    inputRef.current.style.height = 'auto';
                    inputRef.current.focus();
                }
            },
        });
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }

        setData('attachment', file);
        setAttachmentPreviewBroken(false);
        setAttachmentPreview({
            url: URL.createObjectURL(file),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'document',
        });
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const removeAttachment = () => {
        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }

        setData('attachment', null);
        setAttachmentPreview(null);
    };

    const onEmojiClick = (emojiObject) => {
        setData('message', data.message + emojiObject.emoji);
        inputRef.current?.focus();
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
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600"
                                title="Attach image"
                            >
                                <ImageIcon size={20} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="rounded-xl p-2 text-gray-400 transition-all duration-200 hover:bg-white hover:text-clay-600"
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
                            }}
                            placeholder="Message your team..."
                            className="custom-scrollbar max-h-[120px] min-h-[42px] w-full flex-1 resize-none border-none bg-transparent px-3 py-2.5 text-sm font-medium leading-relaxed text-gray-700 placeholder-gray-400 focus:ring-0"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && !event.shiftKey) {
                                    event.preventDefault();
                                    handleSubmit(event);
                                }
                            }}
                        />

                        <button
                            type="button"
                            onClick={() => setShowEmojiPicker((value) => !value)}
                            className={`mx-1 shrink-0 rounded-xl p-2 transition-all ${showEmojiPicker ? 'bg-white text-clay-600 shadow-sm' : 'text-gray-400 hover:bg-white hover:text-gray-600 hover:shadow-sm'}`}
                            title="Add emoji"
                            aria-expanded={showEmojiPicker}
                            aria-label="Toggle emoji picker"
                        >
                            <Smile size={20} />
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={processing || (!data.message.trim() && !data.attachment)}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-clay-600 text-white transition-all hover:bg-clay-700 hover:shadow-lg disabled:opacity-50 disabled:hover:shadow-none"
                    >
                        <Send size={20} className="ml-1" />
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

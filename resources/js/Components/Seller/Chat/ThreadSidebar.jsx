import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Paperclip, FileIcon, ImageIcon, AlertCircle } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { useForm } from '@inertiajs/react';

export default function ThreadSidebar({
    auth,
    parent,
    replies = [],
    onClose,
    loading = false,
    onReplySuccess
}) {
    const repliesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);

    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [attachmentPreviewBroken, setAttachmentPreviewBroken] = useState(false);

    const form = useForm({
        parent_id: parent?.id || '',
        message: '',
        attachment: null,
    });

    useEffect(() => {
        if (parent) {
            form.setData('parent_id', parent.id);
        }
    }, [parent?.id]);

    useEffect(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [replies]);

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }

        form.setData('attachment', file);
        setAttachmentPreviewBroken(false);
        setAttachmentPreview({
            url: URL.createObjectURL(file),
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'document',
        });
    };

    const removeAttachment = () => {
        if (attachmentPreview?.url) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
        form.setData('attachment', null);
        setAttachmentPreview(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.data.message.trim() && !form.data.attachment) return;

        form.post(route('team-messages.store'), {
            preserveScroll: true,
            preserveState: true,
            forceFormData: true,
            onSuccess: () => {
                form.reset('message', 'attachment');
                if (attachmentPreview?.url) {
                    URL.revokeObjectURL(attachmentPreview.url);
                }
                setAttachmentPreview(null);
                if (onReplySuccess) {
                    onReplySuccess();
                }
            }
        });
    };

    if (!parent) return null;

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className="fixed inset-0 bg-stone-900/35 backdrop-blur-[1px] z-50 xl:hidden animate-in fade-in duration-200"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 z-50 xl:z-auto w-80 max-w-[85vw] xl:max-w-none xl:w-80 bg-white border-l border-stone-200 flex flex-col shrink-0 h-full shadow-2xl xl:shadow-none xl:relative animate-in slide-in-from-right duration-300 font-sans text-stone-850">
                {/* Header */}
                <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <h3 className="font-bold text-stone-900 text-sm tracking-wide uppercase">Thread</h3>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-stone-400 hover:text-stone-600 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                        type="button"
                    >
                        <X size={18} />
                    </button>
                </header>

                {/* Parent Message Card */}
                <div className="p-4 bg-stone-50 border-b border-stone-100 shrink-0">
                    <div className="flex items-start gap-2.5">
                        <UserAvatar
                            user={{ name: parent.sender_name, avatar: parent.sender_avatar }}
                            className="w-7 h-7 text-[10px] shrink-0 shadow-sm"
                        />
                        <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between mb-0.5">
                                <span className="text-[11px] font-bold text-stone-800 truncate">
                                    {parent.sender_name || 'Teammate'}
                                </span>
                                <span className="text-[9px] text-stone-400 font-medium">
                                    {parent.time}
                                </span>
                            </div>

                            {parent.attachment_path && parent.attachment_type === 'image' && (
                                <div className="mb-2 overflow-hidden rounded-lg border border-stone-200 bg-white">
                                    <img
                                        src={`/storage/${parent.attachment_path}`}
                                        alt="Thread parent attachment"
                                        className="max-h-24 w-full object-cover"
                                    />
                                </div>
                            )}

                            {parent.attachment_path && parent.attachment_type === 'document' && (
                                <div className="mb-2 flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600">
                                    <FileIcon size={12} className="text-stone-400" />
                                    <span className="truncate">Document Attachment</span>
                                </div>
                            )}

                            <p className="text-xs text-stone-600 leading-relaxed break-words">{parent.text}</p>
                        </div>
                    </div>
                </div>

                {/* Replies Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF9F6]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-stone-450 text-center mb-1">
                        Replies
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-8">
                            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"></span>
                        </div>
                    ) : (
                        replies.map((reply) => (
                            <div
                                key={reply.id}
                                className={`flex items-start gap-2.5 ${reply.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                {reply.sender !== 'me' && (
                                    <UserAvatar
                                        user={{ name: reply.sender_name, avatar: reply.sender_avatar }}
                                        className="w-7 h-7 text-[9px] shrink-0 shadow-sm"
                                    />
                                )}
                                <div className="flex flex-col max-w-[82%]">
                                    {reply.sender !== 'me' && reply.sender_name && (
                                        <span className="text-[9px] font-bold text-stone-400 mb-0.5 ml-0.5">
                                            {reply.sender_name}
                                        </span>
                                    )}
                                    <div
                                        className={`rounded-2xl px-3 py-2 shadow-xs text-xs ${
                                            reply.sender === 'me'
                                                ? 'rounded-tr-xs bg-clay-600 text-white'
                                                : 'rounded-tl-xs border border-stone-200 bg-white text-stone-700'
                                        }`}
                                    >
                                        {reply.attachment_path && reply.attachment_type === 'image' && (
                                            <div className="mb-1.5 overflow-hidden rounded-lg bg-white/10">
                                                <img
                                                    src={`/storage/${reply.attachment_path}`}
                                                    alt="Thread reply attachment"
                                                    className="max-h-36 w-full object-contain"
                                                />
                                            </div>
                                        )}

                                        {reply.attachment_path && reply.attachment_type === 'document' && (
                                            <a
                                                href={`/storage/${reply.attachment_path}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`mb-1.5 flex items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition ${
                                                    reply.sender === 'me'
                                                        ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                                                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                                                }`}
                                            >
                                                <FileIcon size={12} />
                                                <span className="truncate">Document</span>
                                            </a>
                                        )}

                                        <p className="leading-relaxed break-words">{reply.text}</p>
                                        <span
                                            className={`block text-[9px] mt-1.5 text-right font-medium ${
                                                reply.sender === 'me' ? 'text-white/75' : 'text-stone-400'
                                            }`}
                                        >
                                            {reply.time}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}

                    {!loading && replies.length === 0 && (
                        <p className="text-center text-[11px] text-stone-400 italic py-6">
                            No replies yet. Start the thread.
                        </p>
                    )}

                    <div ref={repliesEndRef} />
                </div>

                {/* Reply Form */}
                <div className="p-3 border-t border-stone-100 bg-white shrink-0">
                    {attachmentPreview && (
                        <div className="mb-2 flex items-start justify-between rounded-lg border border-stone-200 bg-stone-50 p-2">
                            <div className="flex min-w-0 items-center gap-2">
                                {attachmentPreview.type === 'image' ? (
                                    <img
                                        src={attachmentPreview.url}
                                        alt="Preview"
                                        className="h-10 w-10 rounded object-cover border border-stone-200 bg-white"
                                        onError={() => setAttachmentPreviewBroken(true)}
                                    />
                                ) : (
                                    <div className="flex h-8 w-8 items-center justify-center rounded border border-stone-200 bg-white text-stone-400">
                                        <FileIcon size={14} />
                                    </div>
                                )}
                                <span className="truncate text-[10px] font-semibold text-stone-600 max-w-[120px]">
                                    {attachmentPreview.name}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={removeAttachment}
                                className="text-stone-400 hover:text-red-500 p-0.5 rounded"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {form.errors.message && (
                        <p className="mb-1 inline-flex items-center gap-1.5 text-[9px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                            <AlertCircle size={10} /> {form.errors.message}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="flex items-end gap-1.5">
                        <div className="relative flex-1 flex items-center bg-stone-50 border border-stone-200 rounded-xl px-2 py-1">
                            <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="p-1 text-stone-400 hover:text-clay-600 rounded-lg"
                                title="Add image"
                            >
                                <ImageIcon size={16} />
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="p-1 text-stone-400 hover:text-clay-600 rounded-lg mr-1"
                                title="Add file"
                            >
                                <Paperclip size={16} />
                            </button>
                            <input
                                type="text"
                                value={form.data.message}
                                onChange={(e) => form.setData('message', e.target.value)}
                                placeholder="Reply in thread..."
                                className="w-full bg-transparent border-none p-1 text-xs text-stone-700 placeholder-stone-400 focus:ring-0"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={form.processing || (!form.data.message.trim() && !form.data.attachment)}
                            className="bg-clay-600 text-white p-2 rounded-xl hover:bg-clay-700 shrink-0 disabled:opacity-50 min-h-[34px] min-w-[34px] flex items-center justify-center"
                        >
                            <Send size={14} />
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
        </>
    );
}

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Send, Paperclip, FileIcon, ImageIcon, AlertCircle, Smile } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { useForm } from '@inertiajs/react';

export default function ThreadSidebar({
    auth,
    parent,
    replies = [],
    onClose,
    loading = false,
    onReplySuccess,
    onToggleReaction,
    eligibleContacts = [],
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

    const [activePickerId, setActivePickerId] = useState(null);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionIndex, setMentionIndex] = useState(0);
    const [showMentions, setShowMentions] = useState(false);
    const [mentionStart, setMentionStart] = useState(-1);
    
    const inputRef = useRef(null);

    const checkMentions = (text, cursorPosition) => {
        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        
        if (lastAtIndex !== -1) {
            const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
            const isValidTrigger = lastAtIndex === 0 || /\s/.test(charBeforeAt);
            
            if (isValidTrigger) {
                const query = textBeforeCursor.slice(lastAtIndex + 1);
                if (!query.includes('\n') && query.length < 25) {
                    setMentionStart(lastAtIndex);
                    setMentionSearch(query);
                    setShowMentions(true);
                    setMentionIndex(0);
                    return;
                }
            }
        }
        setShowMentions(false);
    };

    const filteredMentions = useMemo(() => {
        if (!showMentions) return [];
        const search = mentionSearch.toLowerCase();
        return (eligibleContacts || []).filter(contact => 
            contact.name.toLowerCase().includes(search)
        );
    }, [eligibleContacts, showMentions, mentionSearch]);

    const isDropdownVisible = showMentions && filteredMentions.length > 0;

    const selectMention = (contact) => {
        if (mentionStart === -1) return;
        
        const messageText = form.data.message;
        const beforeAt = messageText.slice(0, mentionStart);
        
        const cursorPosition = inputRef.current ? inputRef.current.selectionStart : messageText.length;
        const afterMention = messageText.slice(cursorPosition);
        
        const replacement = `@[${contact.name}] `;
        const newText = beforeAt + replacement + afterMention;
        
        form.setData('message', newText);
        setShowMentions(false);
        
        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
                const newCursorPos = beforeAt.length + replacement.length;
                inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 10);
    };

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
                <div className="p-4 bg-stone-50 border-b border-stone-100 shrink-0 group relative">
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
                                <span className="text-[9px] text-stone-400 font-medium mr-5">
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

                            <p className="text-xs text-stone-600 leading-relaxed break-words whitespace-pre-wrap">{renderMessageTextWithMentions(parent.text, auth?.user)}</p>

                            {/* Reactions display for parent */}
                            {parent.reactions && parent.reactions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {parent.reactions.map((react) => (
                                        <button
                                            key={react.emoji}
                                            type="button"
                                            onClick={() => onToggleReaction && onToggleReaction(parent.id, react.emoji)}
                                            className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold shadow-3xs transition select-none ${
                                                react.reacted_by_me
                                                    ? 'bg-clay-50 border-clay-300 text-clay-700 hover:bg-clay-100'
                                                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                            }`}
                                            title={react.users_list ? react.users_list.join(', ') : ''}
                                        >
                                            <span>{react.emoji}</span>
                                            <span>{react.count}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add reaction trigger button for parent message in sidebar */}
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                type="button"
                                onClick={() => setActivePickerId(activePickerId === parent.id ? null : parent.id)}
                                className={`p-1 rounded text-stone-400 hover:bg-stone-200 hover:text-stone-600 transition relative ${activePickerId === parent.id ? 'bg-stone-205 text-stone-600' : ''}`}
                                title="Add reaction"
                            >
                                <Smile size={12} />
                            </button>
                            {activePickerId === parent.id && (
                                <ReactionPicker
                                    onSelect={(emoji) => {
                                        onToggleReaction && onToggleReaction(parent.id, emoji);
                                        setActivePickerId(null);
                                    }}
                                    onClose={() => setActivePickerId(null)}
                                    className="absolute right-0 top-full mt-1 z-20"
                                />
                            )}
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
                                className={`flex items-start gap-2.5 group relative ${reply.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                            >
                                {reply.sender === 'me' && (
                                    <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity relative">
                                        <button
                                            type="button"
                                            onClick={() => setActivePickerId(activePickerId === reply.id ? null : reply.id)}
                                            className={`p-1 rounded text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition relative ${activePickerId === reply.id ? 'bg-stone-150 text-stone-600' : ''}`}
                                            title="Add reaction"
                                        >
                                            <Smile size={12} />
                                        </button>
                                        {activePickerId === reply.id && (
                                            <ReactionPicker
                                                onSelect={(emoji) => {
                                                    onToggleReaction && onToggleReaction(reply.id, emoji);
                                                    setActivePickerId(null);
                                                }}
                                                onClose={() => setActivePickerId(null)}
                                                className="absolute bottom-full mb-1 right-0 z-20"
                                            />
                                        )}
                                    </div>
                                )}

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

                                        <p className="leading-relaxed break-words whitespace-pre-wrap">{renderMessageTextWithMentions(reply.text, auth?.user)}</p>
                                        <span
                                            className={`block text-[9px] mt-1.5 text-right font-medium ${
                                                reply.sender === 'me' ? 'text-white/75' : 'text-stone-400'
                                            }`}
                                        >
                                            {reply.time}
                                        </span>
                                    </div>

                                    {/* Reactions display for reply */}
                                    {reply.reactions && reply.reactions.length > 0 && (
                                        <div className={`flex flex-wrap gap-1 mt-1 ${reply.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                            {reply.reactions.map((react) => (
                                                <button
                                                    key={react.emoji}
                                                    type="button"
                                                    onClick={() => onToggleReaction && onToggleReaction(reply.id, react.emoji)}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold shadow-3xs transition select-none ${
                                                        react.reacted_by_me
                                                            ? 'bg-clay-50 border-clay-300 text-clay-700 hover:bg-clay-100'
                                                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                                    }`}
                                                    title={react.users_list ? react.users_list.join(', ') : ''}
                                                >
                                                    <span>{react.emoji}</span>
                                                    <span>{react.count}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {reply.sender !== 'me' && (
                                    <div className="flex items-center self-center opacity-0 group-hover:opacity-100 transition-opacity relative">
                                        <button
                                            type="button"
                                            onClick={() => setActivePickerId(activePickerId === reply.id ? null : reply.id)}
                                            className={`p-1 rounded text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition relative ${activePickerId === reply.id ? 'bg-stone-150 text-stone-600' : ''}`}
                                            title="Add reaction"
                                        >
                                            <Smile size={12} />
                                        </button>
                                        {activePickerId === reply.id && (
                                            <ReactionPicker
                                                onSelect={(emoji) => {
                                                    onToggleReaction && onToggleReaction(reply.id, emoji);
                                                    setActivePickerId(null);
                                                }}
                                                onClose={() => setActivePickerId(null)}
                                                className="absolute bottom-full mb-1 left-0 z-20"
                                            />
                                        )}
                                    </div>
                                )}
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
                <div className="p-3 border-t border-stone-100 bg-white shrink-0 relative">
                    {isDropdownVisible && (
                        <div className="absolute bottom-full left-3 right-3 mb-2 z-50 bg-white border border-stone-200 shadow-xl rounded-xl overflow-hidden font-sans text-xs">
                            <div className="px-3 py-2 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between text-stone-400 font-bold uppercase tracking-wider text-[9px]">
                                <span>Mention Teammate</span>
                                <span>{filteredMentions.length} matches</span>
                            </div>
                            <div className="max-h-36 overflow-y-auto p-1 divide-y divide-stone-50 custom-scrollbar">
                                {filteredMentions.map((contact, idx) => (
                                    <button
                                        key={contact.id}
                                        type="button"
                                        onClick={() => selectMention(contact)}
                                        className={`w-full text-left px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${
                                            idx === mentionIndex 
                                                ? 'bg-clay-50 text-clay-800 font-bold' 
                                                : 'hover:bg-stone-50 text-stone-700'
                                        }`}
                                    >
                                        <UserAvatar user={contact} className="w-4 h-4 text-[7px] shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate leading-none text-[11px] text-stone-900">{contact.name}</p>
                                            <span className="text-[8px] text-stone-400 font-bold uppercase tracking-wider">
                                                {contact.roleLabel}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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
                                ref={inputRef}
                                type="text"
                                value={form.data.message}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    form.setData('message', val);
                                    checkMentions(val, e.target.selectionStart);
                                }}
                                onSelect={(e) => {
                                    checkMentions(e.target.value, e.target.selectionStart);
                                }}
                                onKeyDown={(e) => {
                                    if (isDropdownVisible) {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setMentionIndex((prev) => (prev + 1) % filteredMentions.length);
                                            return;
                                        }
                                        if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setMentionIndex((prev) => (prev - 1 + filteredMentions.length) % filteredMentions.length);
                                            return;
                                        }
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            selectMention(filteredMentions[mentionIndex]);
                                            return;
                                        }
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setShowMentions(false);
                                            return;
                                        }
                                    }
                                }}
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

function ReactionPicker({ onSelect, onClose, className = '' }) {
    const pickerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (pickerRef.current && !pickerRef.current.contains(event.target)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

    return (
        <div
            ref={pickerRef}
            className={`flex items-center gap-1 border border-stone-200 bg-white px-2 py-1 shadow-md rounded-full animate-in fade-in zoom-in-95 duration-100 ${className}`}
        >
            {emojis.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="hover:scale-125 active:scale-95 transition text-[13px] p-0.5"
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
}

function renderMessageTextWithMentions(text, authUser) {
    if (!text) return null;
    
    const regex = /@\[([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
        const matchIndex = match.index;
        const name = match[1];
        
        if (matchIndex > lastIndex) {
            parts.push(text.slice(lastIndex, matchIndex));
        }
        
        const isMe = authUser && authUser.name && authUser.name.toLowerCase() === name.toLowerCase();
        
        parts.push(
            <span
                key={matchIndex}
                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold font-sans ${
                    isMe 
                        ? 'bg-clay-100 text-clay-850 border border-clay-200' 
                        : 'bg-stone-100 text-stone-700 border border-stone-200/60'
                }`}
            >
                @{name}
            </span>
        );
        
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
}

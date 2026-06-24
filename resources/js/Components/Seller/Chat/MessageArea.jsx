import React, { useEffect, useMemo, useState, useRef, lazy, Suspense } from 'react';
import { AlertCircle, MessageSquareText, FileIcon, Clock, Check, CheckCheck, Smile } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { usePage } from '@inertiajs/react';

const MediaViewer = lazy(() => import('@/Components/Chat/MediaViewer'));

const groupMessagesByDate = (messages) => messages.reduce((groups, message) => {
    const key = message.dateLabel || 'Today';
    if (!groups[key]) {
        groups[key] = [];
    }
    groups[key].push(message);
    return groups;
}, {});

const attachmentLabel = (message) => {
    if (!message?.attachment_path) {
        return null;
    }

    return message.attachment_type === 'image' ? 'Image attachment' : 'Document attachment';
};

export default function MessageArea({
    activeMessages,
    currentChatUser,
    currentChannel,
    syncNotice,
    onReplyInThread,
    onToggleReaction,
}) {
    const { auth } = usePage().props;
    const authUser = auth?.user;
    const [activeMedia, setActiveMedia] = useState(null);
    const [brokenMessageImages, setBrokenMessageImages] = useState({});
    const [activePickerId, setActivePickerId] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);

    const groupedMessages = useMemo(() => groupMessagesByDate(activeMessages), [activeMessages]);

    const galleryImages = useMemo(() => activeMessages
        .filter((message) => message.attachment_path && message.attachment_type === 'image')
        .map((message) => ({
            id: message.id,
            url: `/storage/${message.attachment_path}`,
            type: 'image',
        })), [activeMessages]);

    return (
        <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 font-sans">
                {syncNotice && (
                    <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700">
                        <AlertCircle size={13} />
                        {syncNotice}
                    </div>
                )}
                {Object.keys(groupedMessages).map((dateLabel) => (
                    <div key={dateLabel}>
                        <div className="mb-3 flex items-center gap-3">
                            <div className="h-px flex-1 bg-stone-200" />
                            <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                {dateLabel}
                            </span>
                            <div className="h-px flex-1 bg-stone-200" />
                        </div>

                        <div className="space-y-3">
                            {groupedMessages[dateLabel].map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex items-end gap-2.5 group ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                                >
                                    {message.sender !== 'me' && (currentChannel || message.sender_name) && (
                                        <div className="shrink-0 mb-1">
                                            <UserAvatar 
                                                user={{ name: message.sender_name, avatar: message.sender_avatar }} 
                                                className="w-7 h-7 text-[10px] shadow-sm" 
                                            />
                                        </div>
                                    )}

                                    {message.sender === 'me' && (
                                        <div className="flex items-center self-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                                            <button
                                                type="button"
                                                onClick={() => setActivePickerId(activePickerId === message.id ? null : message.id)}
                                                className={`p-1.5 rounded-lg transition relative ${activePickerId === message.id ? 'bg-stone-100 text-stone-650' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'}`}
                                                title="Add reaction"
                                            >
                                                <Smile size={14} />
                                            </button>
                                            
                                            {activePickerId === message.id && (
                                                <ReactionPicker
                                                    onSelect={(emoji) => {
                                                        onToggleReaction && onToggleReaction(message.id, emoji);
                                                        setActivePickerId(null);
                                                    }}
                                                    onClose={() => setActivePickerId(null)}
                                                    className="absolute bottom-full mb-1 right-0 z-20"
                                                />
                                            )}

                                            {onReplyInThread && (
                                                <button
                                                    type="button"
                                                    onClick={() => onReplyInThread(message)}
                                                    className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
                                                    title="Reply in thread"
                                                >
                                                    <MessageSquareText size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex flex-col max-w-[78%]">
                                        {message.sender !== 'me' && message.sender_name && currentChannel && (
                                            <span className="text-[10px] font-bold text-stone-400 mb-0.5 ml-1 leading-none">
                                                {message.sender_name}
                                            </span>
                                        )}
                                        <div
                                            className={`rounded-[1.35rem] px-3.5 py-3 shadow-sm ${
                                                message.sender === 'me'
                                                    ? 'rounded-br-md bg-clay-600 text-white'
                                                    : 'rounded-bl-md border border-stone-200 bg-white text-stone-700'
                                            }`}
                                        >
                                            {message.attachment_path && message.attachment_type === 'image' && (
                                                <div className="mb-2 overflow-hidden rounded-xl bg-white/10">
                                                    {brokenMessageImages[message.id] ? (
                                                        <div
                                                            className={`flex min-h-[140px] items-center justify-center rounded-xl border border-dashed px-4 py-6 text-center text-xs font-medium ${
                                                                message.sender === 'me'
                                                                    ? 'border-white/20 text-white/80'
                                                                    : 'border-stone-200 bg-stone-50 text-stone-500'
                                                            }`}
                                                        >
                                                            Image unavailable.
                                                        </div>
                                                    ) : (
                                                        <img
                                                            src={message.attachment_path.startsWith('blob:') || message.attachment_path.startsWith('data:') ? message.attachment_path : `/storage/${message.attachment_path}`}
                                                            alt="Team attachment"
                                                            className="max-h-56 w-full cursor-zoom-in object-contain transition hover:scale-[1.02]"
                                                            onClick={() => {
                                                                const index = galleryImages.findIndex((image) => image.id === message.id);
                                                                setActiveMedia({
                                                                    index: index >= 0 ? index : 0,
                                                                });
                                                            }}
                                                            onError={() =>
                                                                setBrokenMessageImages((current) => ({ ...current, [message.id]: true }))
                                                            }
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {message.attachment_path && message.attachment_type === 'document' && (
                                                <a
                                                    href={message.attachment_path.startsWith('blob:') || message.attachment_path.startsWith('data:') ? message.attachment_path : `/storage/${message.attachment_path}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`mb-2 flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                                                        message.sender === 'me'
                                                            ? 'border-white/15 bg-white/10 text-white hover:bg-white/15'
                                                            : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                                                    }`}
                                                >
                                                    <FileIcon size={16} />
                                                    <span>{attachmentLabel(message)}</span>
                                                </a>
                                            )}

                                            {message.text ? <p className="text-sm leading-6 whitespace-pre-wrap">{renderMessageTextWithMentions(message.text, authUser)}</p> : null}
                                            <div
                                                className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${
                                                    message.sender === 'me' ? 'text-white/75 justify-end' : 'text-stone-400'
                                                }`}
                                            >
                                                {message.status === 'sending' ? (
                                                    <>
                                                        <Clock size={10} className="animate-pulse" />
                                                        <span className="animate-pulse">Sending...</span>
                                                    </>
                                                ) : message.status === 'failed' ? (
                                                    <>
                                                        <AlertCircle size={11} className={`${message.sender === 'me' ? 'text-red-200' : 'text-red-500'} shrink-0`} />
                                                        <span className={`${message.sender === 'me' ? 'text-red-200 font-bold' : 'text-red-500 font-bold'}`}>Failed to send</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={10} />
                                                        <span>{message.time}</span>
                                                        {message.sender === 'me' && (
                                                            message.isRead || message.is_read ? (
                                                                <CheckCheck size={13} className="text-clay-200 shrink-0" />
                                                            ) : (
                                                                <Check size={13} className="text-white/60 shrink-0" />
                                                            )
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {message.reactions && message.reactions.length > 0 && (
                                            <div className={`flex flex-wrap gap-1 mt-1.5 ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                                {message.reactions.map((react) => (
                                                    <button
                                                        key={react.emoji}
                                                        type="button"
                                                        onClick={() => onToggleReaction && onToggleReaction(message.id, react.emoji)}
                                                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold shadow-2xs transition select-none ${
                                                            react.reacted_by_me
                                                                ? 'bg-clay-50 border-clay-300 text-clay-700 hover:bg-clay-100'
                                                                : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                                        }`}
                                                        title={react.users_list ? react.users_list.join(', ') : ''}
                                                    >
                                                        <span>{react.emoji}</span>
                                                        <span className="text-[10px]">{react.count}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {message.replies_count > 0 && onReplyInThread && (
                                            <button
                                                type="button"
                                                onClick={() => onReplyInThread(message)}
                                                className={`mt-1.5 text-[10px] font-bold text-clay-700 hover:underline flex items-center gap-1 leading-none ${
                                                    message.sender === 'me' ? 'self-end mr-1' : 'self-start ml-1'
                                                }`}
                                            >
                                                <MessageSquareText size={11} />
                                                <span>
                                                    {message.replies_count} {message.replies_count === 1 ? 'reply' : 'replies'}
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    {message.sender !== 'me' && (
                                        <div className="flex items-center self-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity relative">
                                            {onReplyInThread && (
                                                <button
                                                    type="button"
                                                    onClick={() => onReplyInThread(message)}
                                                    className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
                                                    title="Reply in thread"
                                                >
                                                    <MessageSquareText size={14} />
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => setActivePickerId(activePickerId === message.id ? null : message.id)}
                                                className={`p-1.5 rounded-lg transition relative ${activePickerId === message.id ? 'bg-stone-100 text-stone-650' : 'text-stone-400 hover:bg-stone-100 hover:text-stone-600'}`}
                                                title="Add reaction"
                                            >
                                                <Smile size={14} />
                                            </button>

                                            {activePickerId === message.id && (
                                                <ReactionPicker
                                                    onSelect={(emoji) => {
                                                        onToggleReaction && onToggleReaction(message.id, emoji);
                                                        setActivePickerId(null);
                                                    }}
                                                    onClose={() => setActivePickerId(null)}
                                                    className="absolute bottom-full mb-1 left-0 z-20"
                                                />
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                {Object.keys(groupedMessages).length === 0 && (
                    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-stone-100 text-stone-300 shadow-sm">
                            <MessageSquareText size={34} />
                        </div>
                        <h2 className="mt-5 text-xl font-bold text-stone-900">Start the conversation</h2>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                            Send a quick update, file, or image to {currentChatUser ? currentChatUser.name : `#${currentChannel?.name}`}.
                        </p>
                    </div>
                )}

                {currentChatUser && currentChatUser.is_typing && (
                    <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white text-stone-500 border border-stone-200 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm flex items-center gap-1.5">
                            <div className="flex gap-1 shrink-0">
                                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-stone-300 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Typing</span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <Suspense fallback={null}>
                <MediaViewer
                    show={!!activeMedia}
                    mediaList={galleryImages}
                    initialIndex={activeMedia?.index || 0}
                    onClose={() => setActiveMedia(null)}
                />
            </Suspense>
        </div>
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
            className={`flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 shadow-md animate-in fade-in zoom-in-95 duration-100 ${className}`}
        >
            {emojis.map((emoji) => (
                <button
                    key={emoji}
                    type="button"
                    onClick={() => onSelect(emoji)}
                    className="hover:scale-125 active:scale-95 transition text-base p-1"
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

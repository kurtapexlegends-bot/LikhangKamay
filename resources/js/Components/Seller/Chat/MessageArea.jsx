import React, { useEffect, useMemo, useState, useRef, lazy, Suspense } from 'react';
import { AlertCircle, MessageSquareText, FileIcon, Clock, Check, CheckCheck } from 'lucide-react';

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
    syncNotice,
}) {
    const [activeMedia, setActiveMedia] = useState(null);
    const [brokenMessageImages, setBrokenMessageImages] = useState({});
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
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
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
                                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`max-w-[78%] rounded-[1.35rem] px-3.5 py-3 shadow-sm ${
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
                                                        Image unavailable. The rest of this conversation is still safe to continue.
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={`/storage/${message.attachment_path}`}
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
                                                href={`/storage/${message.attachment_path}`}
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

                                        {message.text ? <p className="text-sm leading-6">{message.text}</p> : null}
                                        <div
                                            className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${
                                                message.sender === 'me' ? 'text-white/75 justify-end' : 'text-stone-400'
                                            }`}
                                        >
                                            <Clock size={10} />
                                            <span>{message.time}</span>
                                            {message.sender === 'me' && (
                                                message.isRead || message.is_read ? (
                                                    <CheckCheck size={13} className="text-clay-200 shrink-0" />
                                                ) : (
                                                    <Check size={13} className="text-white/60 shrink-0" />
                                                )
                                            )}
                                        </div>
                                    </div>
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
                            Send a quick update, file, or image to {currentChatUser.name}.
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

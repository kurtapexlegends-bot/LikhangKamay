import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import EmojiPicker from 'emoji-picker-react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import UserAvatar from '@/Components/UserAvatar';
import MediaViewer from '@/Components/Chat/MediaViewer';
import {
    ArrowLeft,
    FileIcon,
    Image as ImageIcon,
    MessageSquareText,
    Paperclip,
    Search,
    Send,
    Smile,
    Users,
    X,
} from 'lucide-react';

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

export default function TeamMessages({ auth, conversations = [], activeMessages = [], currentChatUser = null }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [searchTerm, setSearchTerm] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [activeMedia, setActiveMedia] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);

    const { data, setData, post, processing, reset, errors } = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
        attachment: null,
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setData('receiver_id', currentChatUser?.id || '');

        if (currentChatUser) {
            setShowMobileList(false);
            inputRef.current?.focus();
            window.axios.post(route('team-messages.seen'), { sender_id: currentChatUser.id });
        }
    }, [currentChatUser, setData]);

    useEffect(() => {
        if (!currentChatUser) return undefined;

        const interval = setInterval(() => {
            router.reload({ only: ['conversations', 'activeMessages', 'currentChatUser'] });
        }, 4000);

        return () => clearInterval(interval);
    }, [currentChatUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activeMessages]);

    const filteredContacts = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        if (!query) return conversations;

        return conversations.filter((contact) =>
            `${contact.name} ${contact.roleLabel}`.toLowerCase().includes(query)
        );
    }, [conversations, searchTerm]);

    const groupedMessages = useMemo(() => groupMessagesByDate(activeMessages), [activeMessages]);

    const galleryImages = useMemo(() => activeMessages
        .filter((message) => message.attachment_path && message.attachment_type === 'image')
        .map((message) => ({
            id: message.id,
            url: `/storage/${message.attachment_path}`,
            type: 'image',
        })), [activeMessages]);

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!data.message.trim() && !data.attachment) return;

        post(route('team-messages.store'), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
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

        setData('attachment', file);
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
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-stone-800">
            <Head title="Team Inbox" />

            <SellerSidebar
                active="team-messages"
                user={auth.user}
                mobileOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex min-h-screen flex-col lg:ml-56">
                <SellerHeader
                    title="Team Inbox"
                    subtitle="Internal messages only."
                    auth={auth}
                    onMenuClick={() => setSidebarOpen(true)}
                    badge={{ label: 'Internal', iconColor: 'text-emerald-400' }}
                />

                <div className="min-h-0 flex flex-1 overflow-hidden">
                    <aside
                        className={`w-full shrink-0 border-r border-stone-200 bg-white sm:w-80 sm:min-w-[20rem] sm:max-w-[20rem] ${
                            showMobileList ? 'block' : 'hidden sm:block'
                        }`}
                    >
                        <div className="flex h-full min-h-0 flex-col">
                            <div className="border-b border-stone-100 px-3.5 py-3">
                                <div className="relative">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                    <input
                                        value={searchTerm}
                                        onChange={(event) => setSearchTerm(event.target.value)}
                                        placeholder="Search teammates"
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                                    />
                                </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {filteredContacts.length > 0 ? filteredContacts.map((contact) => (
                                    <Link
                                        key={contact.id}
                                        href={route('team-messages.index', { user_id: contact.id })}
                                        className={`flex w-full items-start gap-3 border-l-[3px] px-3.5 py-3 transition ${
                                            currentChatUser?.id === contact.id
                                                ? 'border-emerald-500 bg-emerald-50/60'
                                                : 'border-transparent hover:bg-stone-50'
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            <UserAvatar user={contact} className="h-10 w-10 shadow-sm" />
                                            {contact.unread > 0 && (
                                                <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                    {contact.unread}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="truncate text-sm font-bold text-stone-900">{contact.name}</p>
                                                <span className="text-[10px] font-medium text-stone-400">{contact.time}</span>
                                            </div>
                                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                                                {contact.roleLabel}
                                            </p>
                                            <p className={`mt-1.5 truncate text-xs ${contact.unread > 0 ? 'font-bold text-stone-800' : 'text-stone-500'}`}>
                                                {contact.lastMessage}
                                            </p>
                                        </div>
                                    </Link>
                                )) : (
                                    <div className="p-8 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-stone-100 text-stone-300">
                                            <Users size={24} />
                                        </div>
                                        <p className="mt-4 text-sm font-bold text-stone-700">No teammates found</p>
                                        <p className="mt-1 text-xs text-stone-400">Try another search.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </aside>

                    <section className={`min-w-0 flex-1 flex-col overflow-hidden bg-[#F7F3EE] ${showMobileList ? 'hidden sm:flex' : 'flex'}`}>
                        {currentChatUser ? (
                            <>
                                <div className="border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowMobileList(true)}
                                                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:hidden"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <UserAvatar user={currentChatUser} className="h-10 w-10 shadow-sm" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-stone-900">{currentChatUser.name}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                                                    {currentChatUser.roleLabel}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 sm:inline-flex">
                                            Internal
                                        </div>
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                                    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
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
                                                                        />
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

                                                                {message.text ? (
                                                                    <p className="text-sm leading-6">{message.text}</p>
                                                                ) : null}
                                                                <p className={`mt-2 text-[11px] font-medium ${message.sender === 'me' ? 'text-white/75' : 'text-stone-400'}`}>
                                                                    {message.time}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        {Object.keys(groupedMessages).length === 0 && (
                                            <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 text-center">
                                                <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-600 shadow-sm">
                                                    <MessageSquareText size={34} />
                                                </div>
                                                <h2 className="mt-5 text-xl font-bold text-stone-900">Start the conversation</h2>
                                                <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                                                    Send a quick update, file, or image to {currentChatUser.name}.
                                                </p>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

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
                                                            <img src={attachmentPreview.url} alt="Preview" className="h-full w-full object-cover" />
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

                                        {errors.message && (
                                            <p className="mb-2 text-sm font-medium text-red-600">{errors.message}</p>
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
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                                <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-emerald-50 text-emerald-600 shadow-sm">
                                    <MessageSquareText size={34} />
                                </div>
                                <h2 className="mt-5 text-xl font-bold text-stone-900">Open a team thread</h2>
                                <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                                    Choose the seller owner or a teammate from the left.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <MediaViewer
                show={!!activeMedia}
                mediaList={galleryImages}
                initialIndex={activeMedia?.index || 0}
                onClose={() => setActiveMedia(null)}
            />
        </div>
    );
}

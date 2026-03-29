import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import UserAvatar from '@/Components/UserAvatar';
import {
    ArrowLeft,
    MessageSquareText,
    Search,
    Send,
    ShieldCheck,
    Users,
} from 'lucide-react';

const groupMessagesByDate = (messages) => messages.reduce((groups, message) => {
    const key = message.dateLabel || 'Today';
    if (!groups[key]) {
        groups[key] = [];
    }
    groups[key].push(message);
    return groups;
}, {});

export default function TeamMessages({ auth, conversations = [], activeMessages = [], currentChatUser = null }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [searchTerm, setSearchTerm] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const { data, setData, post, processing, reset } = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
    });

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

    const handleSubmit = (event) => {
        event.preventDefault();

        if (!data.message.trim() || !data.receiver_id) return;

        post(route('team-messages.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('message');
                inputRef.current?.focus();
            },
        });
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
                    subtitle="Internal owner and staff conversations only."
                    auth={auth}
                    onMenuClick={() => setSidebarOpen(true)}
                    badge={{ label: 'Internal Only', iconColor: 'text-emerald-400' }}
                />

                <div className="flex flex-1 overflow-hidden">
                    <aside className={`w-full border-r border-stone-200 bg-white sm:w-80 ${showMobileList ? 'block' : 'hidden sm:block'}`}>
                        <div className="border-b border-stone-100 p-4">
                            <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4">
                                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-emerald-700">
                                    Team Channel
                                </p>
                                <p className="mt-2 text-sm leading-6 text-emerald-800">
                                    This inbox is separate from buyer chat and only works inside the same seller organization.
                                </p>
                            </div>

                            <div className="relative mt-4">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                                <input
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                    placeholder="Search teammates..."
                                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                                />
                            </div>
                        </div>

                        <div className="max-h-[calc(100vh-14rem)] overflow-y-auto">
                            {filteredContacts.length > 0 ? filteredContacts.map((contact) => (
                                <Link
                                    key={contact.id}
                                    href={route('team-messages.index', { user_id: contact.id })}
                                    className={`flex items-start gap-3 border-l-4 px-4 py-4 transition ${
                                        currentChatUser?.id === contact.id
                                            ? 'border-emerald-500 bg-emerald-50/60'
                                            : 'border-transparent hover:bg-stone-50'
                                    }`}
                                >
                                    <UserAvatar user={contact} className="h-11 w-11 shadow-sm" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="truncate text-sm font-bold text-stone-900">{contact.name}</p>
                                            <span className="text-[10px] font-medium text-stone-400">{contact.time}</span>
                                        </div>
                                        <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                            {contact.roleLabel}
                                        </p>
                                        <p className={`mt-2 truncate text-xs ${contact.unread > 0 ? 'font-bold text-stone-800' : 'text-stone-500'}`}>
                                            {contact.lastMessage}
                                        </p>
                                    </div>
                                    {contact.unread > 0 && (
                                        <span className="mt-1 inline-flex min-w-[20px] justify-center rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white">
                                            {contact.unread}
                                        </span>
                                    )}
                                </Link>
                            )) : (
                                <div className="p-8 text-center">
                                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-stone-100 text-stone-300">
                                        <Users size={28} />
                                    </div>
                                    <p className="mt-4 text-sm font-bold text-stone-700">No teammates found</p>
                                    <p className="mt-1 text-xs text-stone-400">Try another name or role search.</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className={`flex flex-1 flex-col bg-[#FDFBF9] ${showMobileList ? 'hidden sm:flex' : 'flex'}`}>
                        {currentChatUser ? (
                            <>
                                <div className="border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowMobileList(true)}
                                                className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 sm:hidden"
                                            >
                                                <ArrowLeft size={18} />
                                            </button>
                                            <UserAvatar user={currentChatUser} className="h-11 w-11 shadow-sm" />
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-stone-900">{currentChatUser.name}</p>
                                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                                    {currentChatUser.roleLabel}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-700 sm:inline-flex">
                                            Internal Conversation
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
                                    <div className="mx-auto flex max-w-4xl flex-col gap-4">
                                        <div className="rounded-[1.5rem] border border-stone-200 bg-white p-4 shadow-sm">
                                            <div className="flex items-start gap-3">
                                                <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-stone-900">Internal messaging only</p>
                                                    <p className="mt-1 text-sm leading-6 text-stone-500">
                                                        Use this inbox for seller-owner and staff coordination. Buyer conversations remain in the customer chat module.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {Object.keys(groupedMessages).map((dateLabel) => (
                                            <div key={dateLabel}>
                                                <div className="mb-3 flex items-center gap-3">
                                                    <div className="h-px flex-1 bg-stone-200" />
                                                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-stone-400">
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
                                                                className={`max-w-xl rounded-[1.5rem] px-4 py-3 shadow-sm ${
                                                                    message.sender === 'me'
                                                                        ? 'rounded-br-md bg-clay-600 text-white'
                                                                        : 'rounded-bl-md border border-stone-200 bg-white text-stone-700'
                                                                }`}
                                                            >
                                                                <p className="text-sm leading-6">{message.text}</p>
                                                                <p className={`mt-2 text-[11px] font-medium ${message.sender === 'me' ? 'text-white/75' : 'text-stone-400'}`}>
                                                                    {message.time}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <div ref={messagesEndRef} />
                                    </div>
                                </div>

                                <div className="border-t border-stone-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-6">
                                    <form onSubmit={handleSubmit} className="mx-auto flex max-w-4xl items-end gap-3">
                                        <textarea
                                            ref={inputRef}
                                            rows={1}
                                            value={data.message}
                                            onChange={(event) => setData('message', event.target.value)}
                                            placeholder="Message your team..."
                                            className="max-h-36 min-h-[52px] flex-1 resize-none rounded-[1.5rem] border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700 focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                                        />
                                        <button
                                            type="submit"
                                            disabled={processing || !data.message.trim()}
                                            className="inline-flex h-12 w-12 items-center justify-center rounded-[1.25rem] bg-clay-600 text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Send size={18} />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-50 text-emerald-600 shadow-sm">
                                    <MessageSquareText size={40} />
                                </div>
                                <h2 className="mt-6 text-2xl font-bold text-stone-900">Start a team conversation</h2>
                                <p className="mt-3 max-w-md text-sm leading-7 text-stone-500">
                                    Pick the seller owner or a teammate from the left panel. This module is isolated from buyer chat and stays inside the same seller organization.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

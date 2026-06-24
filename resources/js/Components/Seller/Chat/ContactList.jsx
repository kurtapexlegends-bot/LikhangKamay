import React from 'react';
import { Link } from '@inertiajs/react';
import UserAvatar from '@/Components/UserAvatar';
import { Search, Hash, Plus } from 'lucide-react';

export default function ContactList({
    currentChatUser,
    currentChannel,
    searchTerm,
    setSearchTerm,
    filteredContacts,
    showMobileList,
    onCreateChannelClick,
}) {
    const channelsList = filteredContacts.filter(c => c.type === 'channel');
    const directList = filteredContacts.filter(c => c.type === 'direct');

    return (
        <aside
            className={`w-full shrink-0 border-r border-stone-200 bg-white sm:w-80 sm:min-w-[20rem] sm:max-w-[20rem] ${
                showMobileList ? 'block' : 'hidden sm:block'
            }`}
        >
            <div className="flex h-full min-h-0 flex-col font-sans">
                {/* Sidebar Header with Create Channel Action */}
                <div className="border-b border-stone-100 px-3.5 py-3 flex items-center justify-between gap-2 shrink-0">
                    <div className="relative flex-1 min-w-0">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                        <input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Search..."
                            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pl-9 pr-4 text-sm focus:border-clay-400 focus:bg-white focus:ring-clay-100"
                        />
                    </div>
                    <button
                        onClick={onCreateChannelClick}
                        className="p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-600 rounded-xl transition flex items-center justify-center min-h-[42px] min-w-[42px]"
                        title="Create Channel"
                        type="button"
                    >
                        <Plus size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto py-3 space-y-4">
                    {/* Channels Section */}
                    <div>
                        <div className="px-3.5 mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Channels
                            </span>
                        </div>
                        {channelsList.length > 0 ? (
                            channelsList.map((contact) => {
                                const isActive = currentChannel?.id === contact.id;
                                return (
                                    <Link
                                        key={`channel-${contact.id}`}
                                        href={route('team-messages.index', { channel_id: contact.id })}
                                        className={`flex w-full items-start gap-3 border-l-[3px] px-3.5 py-2.5 transition ${
                                            isActive
                                                ? 'border-emerald-500 bg-emerald-50/60 font-medium'
                                                : 'border-transparent hover:bg-stone-50'
                                        }`}
                                    >
                                        <div className="relative shrink-0 w-9 h-9 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-center text-stone-500 shadow-sm">
                                            <Hash size={16} />
                                            {contact.unread > 0 && (
                                                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                                                    {contact.unread}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-sm font-bold text-stone-900">#{contact.name}</p>
                                                <span className="text-[10px] font-medium text-stone-400">{contact.time}</span>
                                            </div>
                                            <p className={`mt-0.5 truncate text-[11px] ${contact.unread > 0 ? 'font-bold text-stone-850' : 'text-stone-500'}`}>
                                                {contact.lastMessage}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <p className="px-3.5 py-1 text-xs text-stone-400 italic">No channels joined</p>
                        )}
                    </div>

                    {/* Direct Messages Section */}
                    <div>
                        <div className="px-3.5 mb-1.5 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Direct Messages
                            </span>
                        </div>
                        {directList.length > 0 ? (
                            directList.map((contact) => {
                                const isActive = !currentChannel && currentChatUser?.id === contact.id;
                                return (
                                    <Link
                                        key={`direct-${contact.id}`}
                                        href={route('team-messages.index', { user_id: contact.id })}
                                        className={`flex w-full items-start gap-3 border-l-[3px] px-3.5 py-2.5 transition ${
                                            isActive
                                                ? 'border-emerald-500 bg-emerald-50/60 font-medium'
                                                : 'border-transparent hover:bg-stone-50'
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            <UserAvatar user={contact} className="h-9 w-9 text-xs shadow-sm" />
                                            {contact.is_online && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border-2 border-white z-10" />
                                            )}
                                            {contact.unread > 0 && (
                                                <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white">
                                                    {contact.unread}
                                                </span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="truncate text-sm font-bold text-stone-900">{contact.name}</p>
                                                <span className="text-[10px] font-medium text-stone-400">{contact.time}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                                <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400 shrink-0 bg-stone-100 px-1 py-0.2 rounded leading-none">
                                                    {contact.roleLabel}
                                                </span>
                                                <p className={`truncate text-[11px] flex-1 ${contact.unread > 0 ? 'font-bold text-stone-850' : 'text-stone-500'}`}>
                                                    {contact.lastMessage}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <p className="px-3.5 py-1 text-xs text-stone-400 italic">No teammates found</p>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}

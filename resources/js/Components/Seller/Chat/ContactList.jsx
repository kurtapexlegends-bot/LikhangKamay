import React from 'react';
import { Link } from '@inertiajs/react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { Search, Users } from 'lucide-react';

export default function ContactList({
    conversations,
    currentChatUser,
    searchTerm,
    setSearchTerm,
    filteredContacts,
    showMobileList,
}) {
    return (
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
                    {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => (
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
                        ))
                    ) : (
                        <div className="p-6">
                            <WorkspaceEmptyState
                                compact
                                icon={Users}
                                title="No teammates found"
                                description="Try another search or wait for teammate conversations to appear."
                            />
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
}

import React from 'react';
import { Link } from '@inertiajs/react';
import { Search, MessageCircle } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { formatChatRelative } from '@/lib/chatTime';

export default function BuyerChatContacts({
    conversations,
    currentChatUser,
    searchTerm,
    setSearchTerm,
    timeNow,
    showMobileList,
}) {
    const filteredContacts = conversations.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`w-full sm:w-80 sm:max-w-[20rem] border-r border-gray-100 flex flex-col bg-gradient-to-b from-white to-gray-50 ${showMobileList ? 'block' : 'hidden sm:flex'}`}>
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-gray-900 text-lg">Messages</h2>
                    <span className="bg-clay-100 text-clay-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {conversations.length}
                    </span>
                </div>
            </div>
            {/* Search */}
            <div className="p-3 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search sellers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-clay-100 focus:border-clay-500 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Contact List */}
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                        <Link 
                            key={contact.id} 
                            href={route('buyer.chat', { user_id: contact.id })}
                            className={`w-full p-3 flex gap-3 transition-all text-left border-l-4 group ${
                                currentChatUser?.id === contact.id 
                                ? 'bg-clay-50 border-clay-600 shadow-sm' 
                                : 'hover:bg-gray-50 border-transparent hover:border-gray-300'
                            }`}
                        >
                            <div className="relative shrink-0">
                                <UserAvatar user={contact} className="w-10 h-10 shadow-sm" />
                                {/* Unread Badge */}
                                {contact.unread > 0 && (
                                    <div className="absolute -top-1.5 -right-1.5 z-20 bg-red-500 text-white text-[9px] font-bold px-1 py-0.5 rounded-full border-2 border-white text-center flex items-center justify-center min-w-[16px] h-[16px]">
                                        {contact.unread}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`text-sm font-bold truncate ${
                                        currentChatUser?.id === contact.id ? 'text-clay-700' : 'text-gray-900'
                                    }`}>
                                        {contact.name}
                                    </h4>
                                    <span className="text-[10px] text-gray-400 font-medium shrink-0 ml-2">
                                        {formatChatRelative(contact.last_message_at, timeNow, { compact: true }) || contact.time}
                                    </span>
                                </div>
                                <p className={`text-xs truncate ${contact.unread > 0 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                                    {contact.lastMsg}
                                </p>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-4">
                        <WorkspaceEmptyState
                            icon={MessageCircle}
                            title="No conversations yet"
                            description="Your chats with sellers will appear here"
                            compact={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

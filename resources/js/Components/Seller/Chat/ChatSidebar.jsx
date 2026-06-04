import React from 'react';
import { Link } from '@inertiajs/react';
import { Search, MessageCircle } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { formatChatRelative } from '@/lib/chatTime';

export default function ChatSidebar({
    conversations,
    currentChatUser,
    searchTerm,
    setSearchTerm,
    timeNow,
    showMobileList,
    setShowMobileList
}) {
    const filteredContacts = conversations.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={`w-full sm:w-80 bg-white border-r border-gray-100 flex flex-col shrink-0 ${showMobileList ? 'block' : 'hidden sm:flex'}`}>
            {/* Search Input */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search customers..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-100 focus:border-clay-500 transition-all min-h-[44px]"
                    />
                </div>
            </div>

            {/* Contacts list */}
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => (
                        <Link 
                            key={contact.id} 
                            href={route('chat.index', { user_id: contact.id })}
                            onClick={() => setShowMobileList(false)}
                            className={`w-full p-3 flex gap-3 transition-all text-left border-l-4 group min-h-[44px] ${
                                currentChatUser?.id === contact.id 
                                ? 'bg-clay-50 border-clay-600 shadow-sm' 
                                : 'hover:bg-gray-50 border-transparent hover:border-gray-300'
                            }`}
                        >
                            <div className="relative shrink-0">
                                <UserAvatar user={contact} className="w-10 h-10 shadow-sm" />
                                {contact.unread > 0 && (
                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 mt-0.5 rounded-full border border-white">
                                        {contact.unread}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-0.5">
                                    <h4 className={`text-xs font-bold truncate ${
                                        currentChatUser?.id === contact.id ? 'text-clay-700' : 'text-gray-900'
                                    }`}>
                                        {contact.name}
                                    </h4>
                                    <span className="text-[9px] text-gray-400 font-medium shrink-0 ml-2">
                                        {formatChatRelative(contact.last_message_at, timeNow, { compact: true }) || contact.time}
                                    </span>
                                </div>
                                <p className={`text-[10px] truncate ${contact.unread > 0 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                                    {contact.lastMsg}
                                </p>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="p-4">
                        <WorkspaceEmptyState 
                            icon={MessageCircle} 
                            title="No conversations" 
                            description="Customer chats will appear here" 
                            compact={true}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

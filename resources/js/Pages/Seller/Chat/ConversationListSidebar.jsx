import React from 'react';
import { Search, MessageCircle, Bot } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { formatChatRelative } from '@/lib/chatTime';

export default function ConversationListSidebar({
    conversations = [],
    currentChatUser = null,
    searchTerm = '',
    setSearchTerm,
    timeNow,
    showMobileList = true,
    setShowMobileList,
    onOpenAutomationModal,
    onSelectConversation,
}) {
    const filteredContacts = conversations.filter((c) =>
        (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    return (
        <aside
            aria-label="Conversation list"
            className={`w-full sm:w-80 bg-white border-r border-gray-100 flex flex-col shrink-0 ${
                showMobileList ? 'block' : 'hidden sm:flex'
            }`}
        >
            {/* Search & Automations Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50 flex items-center gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-100 focus:border-clay-500 transition-all min-h-[44px]"
                    />
                </div>
                {onOpenAutomationModal && (
                    <button
                        type="button"
                        onClick={onOpenAutomationModal}
                        title="Chat Automations & Templates"
                        className="shrink-0 p-2.5 bg-clay-50 hover:bg-clay-100 text-clay-700 border border-clay-200 rounded-xl transition shadow-2xs flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
                    >
                        <Bot size={18} />
                    </button>
                )}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
                {filteredContacts.length > 0 ? (
                    filteredContacts.map((contact) => {
                        const isSelected = currentChatUser?.id === contact.id;
                        return (
                            <button
                                key={contact.id}
                                type="button"
                                onClick={() => {
                                    if (setShowMobileList) setShowMobileList(false);
                                    if (onSelectConversation) {
                                        onSelectConversation(contact);
                                    }
                                }}
                                className={`w-full p-3 flex gap-3 transition-colors duration-150 text-left border-l-4 group min-h-[44px] cursor-pointer ${
                                    isSelected
                                        ? 'bg-clay-50 border-clay-600 shadow-xs'
                                        : 'hover:bg-stone-50 border-transparent hover:border-stone-300'
                                }`}
                            >
                                <div className="relative shrink-0">
                                    <UserAvatar user={contact} className="w-10 h-10 shadow-xs" />
                                    {contact.unread > 0 && (
                                        <div className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white leading-none">
                                            {contact.unread}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h4
                                            className={`text-xs font-bold truncate ${
                                                isSelected ? 'text-clay-700' : 'text-stone-900'
                                            }`}
                                        >
                                            {contact.name}
                                        </h4>
                                        <span className="text-[9px] text-stone-400 font-medium shrink-0 ml-2">
                                            {formatChatRelative(contact.last_message_at, timeNow, { compact: true }) || contact.time}
                                        </span>
                                    </div>
                                    <p
                                        className={`text-[10px] truncate ${
                                            contact.unread > 0 ? 'font-bold text-stone-800' : 'text-stone-500'
                                        }`}
                                    >
                                        {contact.lastMsg || 'No messages yet'}
                                    </p>
                                </div>
                            </button>
                        );
                    })
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
        </aside>
    );
}

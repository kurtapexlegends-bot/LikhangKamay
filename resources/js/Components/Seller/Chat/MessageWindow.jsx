import React from 'react';
import { Link } from '@inertiajs/react';
import { 
    ArrowLeft, ShoppingBag, Info, Clock, 
    CheckCheck, Check, FileIcon, MessageCircle, AlertCircle 
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import OrderContextCard from '@/Components/Chat/OrderContextCard';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { formatChatClock, formatChatRelative } from '@/lib/chatTime';

export default function MessageWindow({
    currentChatUser,
    currentOrderContext,
    groupedMessages,
    galleryImages,
    setActiveMedia,
    showInfoPanel,
    setShowInfoPanel,
    setShowMobileList,
    timeNow,
    messagesEndRef
}) {
    if (!currentChatUser) return null;

    return (
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-[#FDFBF9]">
            {/* Chat Header */}
            <div className="border-b border-gray-100 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 bg-white/90 backdrop-blur-md shrink-0 sticky top-0 z-20 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <button 
                        onClick={() => setShowMobileList(true)}
                        className="sm:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none"
                        type="button"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="relative shrink-0 w-10 h-10">
                        <UserAvatar user={currentChatUser} className="w-10 h-10 shadow-sm border border-stone-100" />
                        {currentChatUser.is_online && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white z-10" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-sm text-gray-900 truncate">{currentChatUser.name}</h3>
                        <p className={`text-[10px] font-medium flex items-center gap-1.5 ${
                            currentChatUser.is_online ? 'text-green-600' : 'text-gray-400'
                        }`}>
                            {currentChatUser.is_online
                                ? 'Online now'
                                : `Last seen ${formatChatRelative(currentChatUser.last_seen_at_iso, timeNow) || currentChatUser.last_seen || 'recently'}`}
                        </p>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <Link 
                        href={route('orders.index')}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-clay-600 hover:bg-clay-50 rounded-xl transition border border-gray-100 bg-white min-h-[44px] shadow-sm text-xs font-bold"
                        title="View Orders"
                    >
                        <ShoppingBag size={16} />
                        <span className="hidden md:inline">View Orders</span>
                    </Link>
                    <button 
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={`p-2.5 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center border border-transparent ${
                            showInfoPanel 
                            ? 'bg-clay-100 text-clay-700 border-clay-200 shadow-sm' 
                            : 'text-gray-400 hover:text-clay-600 hover:bg-clay-50 border-gray-100 bg-white shadow-sm'
                        }`}
                        title="Customer Info"
                        type="button"
                    >
                        <Info size={16} />
                    </button>
                </div>
            </div>

            <OrderContextCard
                order={currentOrderContext}
                viewer="seller"
            />

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FDFBF9]">
                {Object.keys(groupedMessages).length > 0 ? (
                    Object.entries(groupedMessages).map(([date, messages]) => (
                        <div key={date}>
                            {/* Date Divider */}
                            <div className="flex items-center justify-center mb-4">
                                <div className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-[0_1px_1px_rgba(0,0,0,0.02)]">
                                    {date}
                                </div>
                            </div>
                            
                            {/* Messages List */}
                            <div className="space-y-3">
                                {messages.map((msg) => (
                                    <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        <div className="max-w-[75%] group">
                                            <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                msg.sender === 'me' 
                                                ? 'bg-gradient-to-br from-clay-500 to-clay-600 text-white rounded-br-md' 
                                                : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md'
                                            }`}>
                                                {msg.attachment_path && msg.attachment_type === 'image' && (
                                                    <div className="mb-2 rounded-xl overflow-hidden bg-white/10 group-hover:shadow-md transition-shadow">
                                                        <img 
                                                            src={msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') ? msg.attachment_path : `/storage/${msg.attachment_path}`} 
                                                            alt="Attachment" 
                                                            className="max-h-48 md:max-h-64 object-contain w-full cursor-zoom-in hover:scale-105 transition-transform duration-300"
                                                            onClick={() => {
                                                                const index = galleryImages.findIndex(img => img.id === msg.id);
                                                                if (index >= 0) {
                                                                    setActiveMedia({ 
                                                                        index,
                                                                        ...galleryImages[index]
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                {msg.attachment_path && msg.attachment_type === 'document' && (
                                                    <a 
                                                        href={msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') ? msg.attachment_path : `/storage/${msg.attachment_path}`} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className={`flex items-center gap-2 p-2.5 md:p-3 rounded-xl mb-2 transition-colors min-h-[44px] ${
                                                            msg.sender === 'me' 
                                                            ? 'bg-clay-400/20 hover:bg-clay-400/30' 
                                                            : 'bg-gray-50 hover:bg-gray-100'
                                                        }`}
                                                    >
                                                        <div className={`p-2 rounded-lg ${msg.sender === 'me' ? 'bg-clay-500 text-white' : 'bg-white text-gray-500 shadow-sm'}`}>
                                                            <FileIcon size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0 pr-4">
                                                            <span className="block text-xs md:text-sm font-medium truncate underline underline-offset-2">
                                                                {msg.attachment_path.split('/').pop()}
                                                            </span>
                                                            <span className="text-[10px] md:text-xs opacity-70">Click to download</span>
                                                        </div>
                                                    </a>
                                                )}
                                                <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                                            </div>
                                            <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${
                                                msg.sender === 'me' ? 'justify-end text-gray-400' : 'text-gray-400'
                                            }`}>
                                                {msg.status === 'sending' ? (
                                                    <>
                                                        <Clock size={10} className="animate-pulse" />
                                                        <span className="animate-pulse font-medium">Sending...</span>
                                                    </>
                                                ) : msg.status === 'failed' ? (
                                                    <>
                                                        <AlertCircle size={11} className="text-red-500 shrink-0" />
                                                        <span className="text-red-500 font-bold">Failed to send</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock size={10} />
                                                        <span>{formatChatClock(msg.created_at) || msg.time}</span>
                                                        {msg.sender === 'me' && (
                                                            msg.is_read ? (
                                                                <CheckCheck size={14} className="text-clay-500 shrink-0" />
                                                            ) : (
                                                                <Check size={14} className="text-gray-400 shrink-0" />
                                                            )
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full p-4">
                        <WorkspaceEmptyState 
                            icon={MessageCircle} 
                            title="No messages yet" 
                            description="Send a message to start the conversation with this customer." 
                            compact={true}
                        />
                    </div>
                )}
                {currentChatUser.is_typing && (
                    <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-left-2 duration-300">
                        <div className="bg-white text-gray-500 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm flex items-center gap-1.5">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Typing</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}

import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ShoppingBag, Info, Clock, CheckCheck, Check, MessageCircle, FileIcon, AlertCircle } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import OrderContextCard from '@/Components/Chat/OrderContextCard';
import OrderMentionChip from '@/Components/Chat/OrderMentionChip';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { formatChatClock, formatChatRelative } from '@/lib/chatTime';

export default function BuyerMessageWindow({
    currentChatUser,
    activeMessages,
    currentOrderContext,
    userOrders = [],
    groupedMessages,
    galleryImages,
    setActiveMedia,
    messagesEndRef,
    setShowMobileList,
    showInfoPanel,
    setShowInfoPanel,
    timeNow,
    hasMore = false,
    loadingOlder = false,
    isLoadingThread = false,
    onLoadOlder,
    scrollContainerRef,
}) {
    if (!currentChatUser) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center px-6 bg-white">
                <div className="w-24 h-24 bg-gradient-to-br from-clay-50 to-clay-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                    <MessageCircle size={40} className="text-clay-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Your Messages</h3>
                <p className="text-gray-500 text-sm max-w-xs mb-6">
                    Select a conversation to chat with sellers about your orders and products
                </p>
                <Link 
                    href="/shop"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-clay-600 text-white rounded-xl font-bold text-sm hover:bg-clay-700 shadow-lg shadow-clay-200 transition-all hover:-translate-y-0.5"
                >
                    <ShoppingBag size={16} /> Browse Shop
                </Link>
            </div>
        );
    }

    const handleScroll = (e) => {
        if (e.currentTarget.scrollTop < 60 && hasMore && !loadingOlder && onLoadOlder) {
            onLoadOlder();
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
            {/* ACTIVE CHAT HEADER */}
            <div className="bg-white/95 backdrop-blur-md border-b border-gray-100 flex items-center justify-between gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-2.5 shrink-0 shadow-2xs sticky top-0 z-20">
                <div className="flex min-w-0 items-center gap-2.5">
                    <button 
                        onClick={() => setShowMobileList(true)}
                        className="sm:hidden p-2 -ml-1 text-gray-500 hover:text-gray-700 rounded-xl hover:bg-stone-50 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
                        title="Back to conversations"
                        aria-label="Back to conversations"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative shrink-0 w-10 h-10">
                        <UserAvatar user={currentChatUser} className="w-10 h-10 shadow-2xs border border-stone-150" />
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white z-10 ${currentChatUser.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 text-sm sm:text-base truncate leading-tight">{currentChatUser.shop_name || currentChatUser.name}</h2>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            {currentChatUser.is_online ? (
                                <span className="text-green-600 font-bold">Online</span>
                            ) : (
                                formatChatRelative(currentChatUser.last_seen_at_iso, timeNow) || currentChatUser.last_seen
                            )}
                        </p>
                    </div>
                </div>
                
                <div className="flex shrink-0 items-center gap-1">
                    <Link 
                        href={route('my-orders.index')}
                        className="p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-50/80 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title="View Orders"
                        aria-label="View Orders"
                    >
                        <ShoppingBag size={20} />
                    </Link>
                    <button 
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={`p-2 rounded-xl transition min-h-[44px] min-w-[44px] flex items-center justify-center ${showInfoPanel ? 'bg-clay-100 text-clay-700' : 'text-gray-400 hover:text-clay-600 hover:bg-clay-50/80'}`}
                        title="Seller Info"
                        aria-label="Seller Info"
                    >
                        <Info size={20} />
                    </button>
                </div>
            </div>

            <OrderContextCard order={currentOrderContext} viewer="buyer" />

            {/* MESSAGES AREA */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#FDFBF9]"
            >
                <div className="max-w-3xl mx-auto space-y-3">
                    {loadingOlder && (
                        <div className="flex items-center justify-center py-2">
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100/90 text-stone-500 text-xs font-semibold">
                                <div className="w-3 h-3 border-2 border-clay-500 border-t-transparent rounded-full animate-spin" />
                                <span>Loading older messages...</span>
                            </div>
                        </div>
                    )}
                    {isLoadingThread ? (
                        <div className="space-y-4 p-2 animate-pulse">
                            <div className="flex justify-start">
                                <div className="h-10 w-48 bg-stone-200/60 rounded-2xl rounded-bl-md" />
                            </div>
                            <div className="flex justify-end">
                                <div className="h-14 w-60 bg-clay-200/40 rounded-2xl rounded-br-md" />
                            </div>
                            <div className="flex justify-start">
                                <div className="h-10 w-40 bg-stone-200/60 rounded-2xl rounded-bl-md" />
                            </div>
                            <div className="flex justify-end">
                                <div className="h-12 w-52 bg-clay-200/40 rounded-2xl rounded-br-md" />
                            </div>
                        </div>
                    ) : Object.keys(groupedMessages).length > 0 ? (
                        Object.entries(groupedMessages).map(([date, messages]) => (
                            <div key={date}>
                                {/* Date Divider */}
                                <div className="flex items-center justify-center my-3 sm:my-3.5">
                                    <div className="bg-stone-100/90 text-stone-600 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-2xs">
                                        {date}
                                    </div>
                                </div>
                                
                                {/* Messages */}
                                <div className="space-y-2.5">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-[85%] sm:max-w-[70%] group">
                                                <div className={`rounded-2xl px-4 py-2.5 text-sm sm:text-sm shadow-2xs leading-relaxed ${
                                                    msg.sender === 'me' 
                                                    ? 'bg-clay-600 text-white rounded-br-xs' 
                                                    : 'bg-white text-gray-800 border border-stone-200/70 rounded-bl-xs'
                                                }`}>
                                                    {msg.attachment_path && msg.attachment_type === 'image' && (
                                                        <div className="mb-2 rounded-xl overflow-hidden bg-white/10 group-hover:shadow-xs transition-shadow">
                                                            <img 
                                                                src={msg.attachment_url || (msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') || msg.attachment_path.startsWith('http') || msg.attachment_path.startsWith('/storage') ? msg.attachment_path : `/storage/${msg.attachment_path}`)} 
                                                                alt="Attachment" 
                                                                className="max-h-56 md:max-h-64 object-contain w-full cursor-zoom-in hover:scale-102 transition-transform duration-200"
                                                                onClick={() => {
                                                                    const index = galleryImages.findIndex(img => img.id === msg.id);
                                                                    setActiveMedia({ 
                                                                        index: index >= 0 ? index : 0,
                                                                        ...galleryImages[index >= 0 ? index : 0]
                                                                    });
                                                                }}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = '/images/placeholder.svg';
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    {msg.attachment_path && msg.attachment_type === 'document' && (
                                                        <a 
                                                            href={msg.attachment_url || (msg.attachment_path.startsWith('blob:') || msg.attachment_path.startsWith('data:') || msg.attachment_path.startsWith('http') || msg.attachment_path.startsWith('/storage') ? msg.attachment_path : `/storage/${msg.attachment_path}`)} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className={`flex items-center gap-2.5 p-2.5 rounded-xl mb-1.5 transition-colors ${
                                                                msg.sender === 'me' 
                                                                ? 'bg-clay-500/30 hover:bg-clay-500/40' 
                                                                : 'bg-stone-50 hover:bg-stone-100'
                                                            }`}
                                                        >
                                                            <div className={`p-2 rounded-lg ${msg.sender === 'me' ? 'bg-clay-500 text-white' : 'bg-white text-stone-500 shadow-2xs'}`}>
                                                                <FileIcon size={16} />
                                                            </div>
                                                            <div className="flex-1 min-w-0 pr-2">
                                                                <span className="block text-xs font-semibold truncate underline underline-offset-2">
                                                                    {msg.attachment_path.split('/').pop()}
                                                                </span>
                                                                <span className="text-[10px] opacity-75">Click to download</span>
                                                            </div>
                                                        </a>
                                                    )}
                                                    {msg.text && (
                                                        <p className="leading-relaxed whitespace-pre-wrap word-break-words text-sm sm:text-sm">
                                                            <OrderMentionChip text={msg.text} userOrders={userOrders} isMe={msg.sender === 'me'} />
                                                        </p>
                                                    )}
                                                </div>
                                                <div className={`flex items-center gap-1.5 mt-1 text-[11px] ${
                                                    msg.sender === 'me' ? 'justify-end text-gray-400' : 'text-gray-400'
                                                }`}>
                                                    {msg.status === 'sending' ? (
                                                        <>
                                                            <Clock size={11} className="animate-pulse" />
                                                            <span className="animate-pulse font-medium">Sending...</span>
                                                        </>
                                                    ) : msg.status === 'failed' ? (
                                                        <>
                                                            <AlertCircle size={12} className="text-red-500 shrink-0" />
                                                            <span className="text-red-500 font-bold">Failed to send</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock size={11} />
                                                            <span>{formatChatClock(msg.created_at) || msg.time}</span>
                                                            {msg.sender === 'me' && (
                                                                msg.is_read ? (
                                                                    <CheckCheck size={15} className="text-clay-500 shrink-0" />
                                                                ) : (
                                                                    <Check size={15} className="text-gray-400 shrink-0" />
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
                        <div className="h-full flex items-center justify-center">
                            <WorkspaceEmptyState
                                icon={MessageCircle}
                                title="Start the conversation"
                                description={`Say hi to ${currentChatUser.name} and discuss your order details!`}
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
        </div>
    );
}

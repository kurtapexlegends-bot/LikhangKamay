import React from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ShoppingBag, Info, Clock, CheckCheck, Check, MessageCircle, FileIcon } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import OrderContextCard from '@/Components/Chat/OrderContextCard';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { formatChatClock, formatChatRelative } from '@/lib/chatTime';

export default function BuyerMessageWindow({
    currentChatUser,
    activeMessages,
    currentOrderContext,
    groupedMessages,
    galleryImages,
    setActiveMedia,
    messagesEndRef,
    setShowMobileList,
    showInfoPanel,
    setShowInfoPanel,
    timeNow,
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

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
            {/* ACTIVE CHAT HEADER */}
            <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 shrink-0 shadow-sm sticky top-0 z-20">
                <div className="flex min-w-0 items-center gap-3">
                    <button 
                        onClick={() => setShowMobileList(true)}
                        className="sm:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="relative shrink-0 w-10 h-10">
                        <UserAvatar user={currentChatUser} className="w-10 h-10 shadow-sm border border-stone-100" />
                        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white z-10 ${currentChatUser.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    </div>
                    <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 text-sm truncate">{currentChatUser.shop_name || currentChatUser.name}</h2>
                        <p className="text-[10px] text-gray-500 font-medium">
                            {currentChatUser.is_online ? (
                                <span className="text-green-600 font-bold">Online</span>
                            ) : (
                                formatChatRelative(currentChatUser.last_seen_at_iso, timeNow) || currentChatUser.last_seen
                            )}
                        </p>
                    </div>
                </div>
                
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <Link 
                        href={route('my-orders.index')}
                        className="p-3 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-xl transition"
                        title="View Orders"
                    >
                        <ShoppingBag size={22} className="sm:w-4.5 sm:h-4.5" />
                    </Link>
                    <button 
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={`p-3 rounded-xl transition ${showInfoPanel ? 'bg-clay-100 text-clay-700' : 'text-gray-400 hover:text-clay-600 hover:bg-clay-50'}`}
                    >
                        <Info size={22} className="sm:w-4.5 sm:h-4.5" />
                    </button>
                </div>
            </div>

            <OrderContextCard order={currentOrderContext} viewer="buyer" />

            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FDFBF9] scroll-smooth">
                <div className="max-w-3xl mx-auto space-y-4">
                    {Object.keys(groupedMessages).length > 0 ? (
                        Object.entries(groupedMessages).map(([date, messages]) => (
                            <div key={date}>
                                {/* Date Divider */}
                                <div className="flex items-center justify-center mb-4">
                                    <div className="bg-gray-100 text-gray-500 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                                        {date}
                                    </div>
                                </div>
                                
                                {/* Messages */}
                                <div className="space-y-3">
                                    {messages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] group`}>
                                                <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                    msg.sender === 'me' 
                                                    ? 'bg-gradient-to-br from-clay-500 to-clay-600 text-white rounded-br-md' 
                                                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md'
                                                }`}>
                                                    {msg.attachment_path && msg.attachment_type === 'image' && (
                                                        <div className="mb-2 rounded-xl overflow-hidden bg-white/10 group-hover:shadow-md transition-shadow">
                                                            <img 
                                                                src={`/storage/${msg.attachment_path}`} 
                                                                alt="Attachment" 
                                                                className="max-h-48 md:max-h-64 object-contain w-full cursor-zoom-in hover:scale-105 transition-transform duration-300"
                                                                onClick={() => {
                                                                    const index = galleryImages.findIndex(img => img.id === msg.id);
                                                                    setActiveMedia({ 
                                                                        index: index >= 0 ? index : 0,
                                                                        ...galleryImages[index >= 0 ? index : 0]
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                    {msg.attachment_path && msg.attachment_type === 'document' && (
                                                        <a 
                                                            href={`/storage/${msg.attachment_path}`} 
                                                            target="_blank" 
                                                            rel="noreferrer"
                                                            className={`flex items-center gap-2 p-2.5 md:p-3 rounded-xl mb-2 transition-colors ${
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
                                                    {msg.text && <p className="leading-relaxed whitespace-pre-wrap word-break-words text-sm">{msg.text}</p>}
                                                </div>
                                                <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${
                                                    msg.sender === 'me' ? 'justify-end text-gray-400' : 'text-gray-400'
                                                }`}>
                                                    <Clock size={10} />
                                                    <span>{formatChatClock(msg.created_at) || msg.time}</span>
                                                    {msg.sender === 'me' && (
                                                        msg.is_read ? (
                                                            <CheckCheck size={14} className="text-clay-500" />
                                                        ) : (
                                                            <Check size={14} className="text-gray-400" />
                                                        )
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
                            <div className="bg-white text-gray-505 border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2 shadow-sm flex items-center gap-1.5">
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

import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import Dropdown from '@/Components/Dropdown';
import NotificationDropdown from '@/Components/NotificationDropdown';
import { 
    Search, Send, Paperclip, Info, 
    Image as ImageIcon, ChevronDown, User, LogOut,
    MessageCircle, CheckCheck, Clock, Smile, ShoppingBag, ArrowLeft, Menu
} from 'lucide-react';

export default function Chat({ auth, conversations, activeMessages, currentChatUser }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const { data, setData, post, reset, processing } = useForm({
        receiver_id: currentChatUser?.id || '',
        message: ''
    });

    // --- REAL-TIME POLLING ---
    useEffect(() => {
        if (!currentChatUser) return;
        const interval = setInterval(() => {
            router.reload({ only: ['activeMessages', 'conversations'] });
        }, 3000);
        return () => clearInterval(interval);
    }, [currentChatUser]);

    // --- AUTO SCROLL ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeMessages]);

    // --- MARK AS SEEN FUNCTION ---
    const markAsRead = (senderId) => {
        if (!senderId) return;
        // Use axios strictly for background updates (no page reload)
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    };

    // Trigger mark as read when chat opens OR when new messages arrive
    useEffect(() => {
        setData('receiver_id', currentChatUser?.id || '');
        if (currentChatUser) {
            setShowMobileList(false);
            // Only focus input on initial load/switch, not every poll
            if (activeMessages.length === 0 || currentChatUser.id !== data.receiver_id) {
                inputRef.current?.focus();
            }
            // Only mark as read if user is looking at the page
            if (document.hasFocus()) {
                markAsRead(currentChatUser.id);
            }
        }
    }, [currentChatUser, activeMessages.length]);

    // Track window focus to mark as read when user comes back
    useEffect(() => {
        const handleFocus = () => {
            if (currentChatUser) {
                markAsRead(currentChatUser.id);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentChatUser]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!data.message.trim()) return;
        post(route('chat.store'), {
            onSuccess: () => reset('message'),
            preserveScroll: true
        });
    };

    const filteredContacts = conversations.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group messages by date
    const groupedMessages = activeMessages.reduce((groups, msg) => {
        const date = msg.date || 'Today';
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {});

    return (
        <div className="min-h-screen bg-[#FDFBF9] flex font-sans text-gray-800">
            <Head title="Messages" />
            <SellerSidebar active="chat" user={auth.user} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col min-w-0 lg:ml-56 h-screen transition-all duration-300">
                
                {/* --- HEADER --- */}
                {/* --- HEADER --- */}
                <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8 shrink-0 z-20 sticky top-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-clay-600">
                            <Menu size={24} />
                        </button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-gray-900">Messages</h1>
                                <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-bold px-2.5 py-1 rounded-full hidden sm:flex">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                    Live
                                </div>
                                {conversations.length > 0 && (
                                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {conversations.length}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5 hidden sm:block">
                                Communicate with your customers
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* 1. Actions */}
                        <div className="flex items-center gap-3">
                            <NotificationDropdown />
                        </div>

                        {/* Divider */}
                        <div className="h-8 w-px bg-gray-200"></div>

                        {/* 2. Profile Dropdown */}
                        <div className="relative">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <span className="inline-flex rounded-md">
                                        <button type="button" className="inline-flex items-center gap-3 px-1 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 bg-transparent hover:text-gray-700 focus:outline-none transition ease-in-out duration-150">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-900">{auth.user.shop_name || auth.user.name}</p>
                                                <p className="text-[10px] text-gray-500">Seller Account</p>
                                            </div>
                                            <div className="w-9 h-9 rounded-full bg-clay-100 flex items-center justify-center text-clay-700 font-bold border border-clay-200 uppercase overflow-hidden">
                                                {auth.user.avatar ? (
                                                    <img 
                                                    src={auth.user.avatar.startsWith('http') ? auth.user.avatar : `/storage/${auth.user.avatar}`} 
                                                        alt={auth.user.name} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    (auth.user.shop_name || auth.user.name).charAt(0)
                                                )}
                                            </div>
                                            <ChevronDown size={16} className="text-gray-400" />
                                        </button>
                                    </span>
                                </Dropdown.Trigger>
                                <Dropdown.Content>
                                    <Dropdown.Link href={route('profile.edit')} className="flex items-center gap-2">
                                        <User size={16} /> Profile
                                    </Dropdown.Link>
                                    <Dropdown.Link href={route('logout')} method="post" as="button" className="flex items-center gap-2 text-red-600 hover:text-red-700">
                                        <LogOut size={16} /> Log Out
                                    </Dropdown.Link>
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </div>
                </header>

                {/* --- CHAT INTERFACE --- */}
                <div className="flex-1 flex overflow-hidden">
                    
                    {/* LEFT: CONTACT LIST */}
                    <div className={`w-full sm:w-80 bg-white border-r border-gray-100 flex flex-col ${showMobileList ? 'block' : 'hidden sm:flex'}`}>
                        {/* Search */}
                        <div className="p-4 border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Search customers..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-clay-100 focus:border-clay-500 transition-all"
                                />
                            </div>
                        </div>

                        {/* Contacts */}
                        <div className="flex-1 overflow-y-auto">
                            {filteredContacts.length > 0 ? (
                                filteredContacts.map((contact) => (
                                    <Link 
                                        key={contact.id} 
                                        href={route('chat.index', { user_id: contact.id })}
                                        className={`w-full p-3 flex gap-3 transition-all text-left border-l-4 group ${
                                            currentChatUser?.id === contact.id 
                                            ? 'bg-clay-50 border-clay-600 shadow-sm' 
                                            : 'hover:bg-gray-50 border-transparent hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            {contact.avatar_url ? (
                                                <img 
                                                    src={contact.avatar_url} 
                                                    alt={contact.name} 
                                                    className="w-10 h-10 rounded-xl object-cover shadow-sm"
                                                />
                                            ) : (
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase shadow-sm ${
                                                    currentChatUser?.id === contact.id
                                                    ? 'bg-gradient-to-br from-clay-400 to-clay-600 text-white'
                                                    : 'bg-gray-100 text-gray-600 group-hover:bg-clay-100 group-hover:text-clay-700'
                                                }`}>
                                                    {contact.initial}
                                                </div>
                                            )}
                                            {/* Unread Badge */}
                                            {contact.unread > 0 && (
                                                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
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
                                                <span className="text-[9px] text-gray-400 font-medium shrink-0 ml-2">{contact.time}</span>
                                            </div>
                                            <p className={`text-[10px] truncate ${contact.unread > 0 ? 'font-bold text-gray-800' : 'text-gray-500'}`}>
                                                {contact.lastMsg}
                                            </p>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <MessageCircle size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No conversations</p>
                                    <p className="text-xs text-gray-400 mt-1">Customer chats will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: CONVERSATION AREA */}
                    <div className={`flex-1 flex flex-col bg-[#FDFBF9] ${!showMobileList ? 'block' : 'hidden sm:flex'}`}>
                        
                        {currentChatUser ? (
                            <>
                                {/* Chat Header */}
                                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-white shrink-0 shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <button 
                                            onClick={() => setShowMobileList(true)}
                                            className="sm:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
                                        >
                                            <ArrowLeft size={18} />
                                        </button>
                                        <div className="relative">
                                            {currentChatUser.avatar ? (
                                                 <img 
                                                src={currentChatUser.avatar.startsWith('http') ? currentChatUser.avatar : `/storage/${currentChatUser.avatar}`} 
                                                    alt={currentChatUser.name} 
                                                    className="w-10 h-10 rounded-xl object-cover shadow-sm"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-clay-400 to-clay-600 flex items-center justify-center font-bold text-white uppercase shadow-sm">
                                                    {(currentChatUser.shop_name || currentChatUser.name).charAt(0)}
                                                </div>
                                            )}
                                            {currentChatUser.is_online && (
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-gray-900">{currentChatUser.name}</h3>
                                            <p className={`text-[10px] font-medium flex items-center gap-1.5 ${
                                                currentChatUser.is_online ? 'text-green-600' : 'text-gray-400'
                                            }`}>
                                                <span className={`w-1 h-1 rounded-full ${
                                                    currentChatUser.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'
                                                }`} />
                                                {currentChatUser.is_online ? 'Online now' : `Last seen ${currentChatUser.last_seen || 'recently'}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Link 
                                            href={route('orders.index')}
                                            className="p-2.5 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-xl transition"
                                            title="View Orders"
                                        >
                                            <ShoppingBag size={18} />
                                        </Link>
                                        <button className="p-2.5 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-xl transition">
                                            <Info size={18} />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages Feed */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#FDFBF9] to-white">
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
                                                            <div className="max-w-[75%] group">
                                                                <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
                                                                    msg.sender === 'me' 
                                                                    ? 'bg-gradient-to-br from-clay-500 to-clay-600 text-white rounded-br-md' 
                                                                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-md'
                                                                }`}>
                                                                    <p className="leading-relaxed">{msg.text}</p>
                                                                </div>
                                                                <div className={`flex items-center gap-1.5 mt-1.5 text-[10px] ${
                                                                    msg.sender === 'me' ? 'justify-end text-gray-400' : 'text-gray-400'
                                                                }`}>
                                                                    <Clock size={10} />
                                                                    <span>{msg.time}</span>
                                                                    {msg.sender === 'me' && (
                                                                        <CheckCheck size={12} className="text-clay-500" />
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <div className="w-20 h-20 bg-clay-50 rounded-2xl flex items-center justify-center mb-4">
                                                <MessageCircle size={32} className="text-clay-300" />
                                            </div>
                                            <h4 className="font-bold text-gray-900 mb-1">Start a conversation</h4>
                                            <p className="text-sm text-gray-500 max-w-xs">
                                                Chat with {currentChatUser.name} about their order and shipping details
                                            </p>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Area */}
                                <div className="p-4 bg-white border-t border-gray-100 shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                        <div className="flex gap-1">
                                            <button type="button" className="p-2.5 text-gray-400 hover:text-clay-600 hover:bg-gray-100 rounded-xl transition">
                                                <Paperclip size={20} />
                                            </button>
                                            <button type="button" className="p-2.5 text-gray-400 hover:text-clay-600 hover:bg-gray-100 rounded-xl transition">
                                                <ImageIcon size={20} />
                                            </button>
                                        </div>
                                        <div className="flex-1 relative">
                                            <input 
                                                ref={inputRef}
                                                type="text" 
                                                placeholder="Type a message..."
                                                className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-clay-400 focus:ring-2 focus:ring-clay-100 rounded-xl py-3 pl-4 pr-12 text-sm transition-all"
                                                value={data.message}
                                                onChange={(e) => setData('message', e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage(e);
                                                    }
                                                }}
                                            />
                                            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-clay-600">
                                                <Smile size={18} />
                                            </button>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={!data.message.trim() || processing}
                                            className={`p-3 rounded-xl transition-all shadow-sm ${
                                                data.message.trim()
                                                ? 'bg-clay-600 text-white hover:bg-clay-700 shadow-clay-200 hover:-translate-y-0.5'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        >
                                            <Send size={18} />
                                        </button>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6 bg-gray-50/50">
                                <div className="w-24 h-24 bg-gradient-to-br from-clay-50 to-clay-100 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                                    <MessageCircle size={40} className="text-clay-400" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Messages</h3>
                                <p className="text-gray-500 text-sm max-w-xs mb-6">
                                    Select a conversation to chat with customers about their orders and shipping
                                </p>
                                <Link 
                                    href={route('orders.index')}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-clay-600 text-white rounded-xl font-bold text-sm hover:bg-clay-700 shadow-lg shadow-clay-200 transition-all hover:-translate-y-0.5"
                                >
                                    <ShoppingBag size={16} /> View Orders
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
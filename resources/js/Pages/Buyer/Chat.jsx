import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import BuyerNavbar from '@/Components/BuyerNavbar';
// Dropdown is internal to BuyerNavbar now
import { 
    Search, Send, Paperclip, Image as ImageIcon, 
    MessageCircle, Info, ChevronDown, ArrowLeft,
    ShoppingBag, User, LogOut, CheckCheck, Clock, Smile,
    FileIcon, X, MapPin, Phone, Check
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import OrderContextCard from '@/Components/Chat/OrderContextCard';
import UserAvatar from '@/Components/UserAvatar';
import MediaViewer from '@/Components/Chat/MediaViewer';
import { formatStructuredAddress } from '@/lib/addressFormatting';
import { formatChatClock, formatChatDateLabel, formatChatRelative } from '@/lib/chatTime';

export default function BuyerChat({ auth, conversations, activeMessages, currentChatUser, currentOrderContext = null }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showMobileList, setShowMobileList] = useState(!currentChatUser);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [activeMedia, setActiveMedia] = useState(null);
    const [attachment, setAttachment] = useState(null);
    const [attachmentPreview, setAttachmentPreview] = useState(null);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [timeNow, setTimeNow] = useState(Date.now());
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const lastTypingSignal = useRef(0);
    const currentChatUserShopHref = currentChatUser?.shop_slug
        ? route('shop.seller', currentChatUser.shop_slug)
        : null;
    const currentChatUserAddress = formatStructuredAddress({
        street_address: currentChatUser?.street_address,
        barangay: currentChatUser?.barangay,
        city: currentChatUser?.city,
        region: currentChatUser?.region,
        postal_code: currentChatUser?.zip_code,
    });

    const revokeAttachmentPreview = () => {
        if (attachmentPreview?.url?.startsWith('blob:')) {
            URL.revokeObjectURL(attachmentPreview.url);
        }
    };

    const { data, setData, post, reset, processing } = useForm({
        receiver_id: currentChatUser?.id || '',
        message: '',
        attachment: null
    });

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        return () => revokeAttachmentPreview();
    }, [attachmentPreview]);

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeNow(Date.now());
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    // --- POLLING & SCROLLING ---
    useEffect(() => {
        if (!currentChatUser) return;
        const interval = setInterval(() => {
            router.reload({ only: ['activeMessages', 'conversations', 'currentOrderContext'] });
        }, 3000);
        return () => clearInterval(interval);
    }, [currentChatUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [activeMessages]);

    // --- MARK AS SEEN FUNCTION ---
    const markAsRead = (senderId) => {
        if (!senderId) return;
        window.axios.post(route('chat.seen'), { sender_id: senderId });
    };

    useEffect(() => {
        setData('receiver_id', currentChatUser?.id || '');
        if (currentChatUser) {
            setShowMobileList(false);
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
            if (currentChatUser && document.hasFocus()) {
                markAsRead(currentChatUser.id);
            }
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentChatUser]);

    const signalTyping = () => {
        if (!currentChatUser) return;
        const now = Date.now();
        // Throttle typing signals to once every 2 seconds
        if (now - lastTypingSignal.current > 2000) {
            lastTypingSignal.current = now;
            window.axios.post(route('chat.typing'), { receiver_id: currentChatUser.id });
        }
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (!data.message.trim() && !data.attachment) return;
        post(route('chat.store'), {
            onSuccess: () => {
                reset('message', 'attachment');
                revokeAttachmentPreview();
                setAttachment(null);
                setAttachmentPreview(null);
                setShowEmojiPicker(false);
            },
            preserveScroll: true
        });
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            revokeAttachmentPreview();
            setData('attachment', file);
            setAttachment(file);
            const previewUrl = URL.createObjectURL(file);
            setAttachmentPreview({
                url: previewUrl,
                type: file.type.startsWith('image/') ? 'image' : 'document',
                name: file.name
            });
            setShowEmojiPicker(false);
            inputRef.current?.focus();
        }
    };

    const removeAttachment = () => {
        revokeAttachmentPreview();
        setData('attachment', null);
        setAttachment(null);
        setAttachmentPreview(null);
    };

    const onEmojiClick = (emojiObject) => {
        setData('message', data.message + emojiObject.emoji);
        inputRef.current?.focus();
    };

    const filteredContacts = conversations.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Extract all image attachments for the gallery
    const galleryImages = activeMessages
        .filter(msg => msg.attachment_path && msg.attachment_type === 'image')
        .map(msg => ({
            url: `/storage/${msg.attachment_path}`,
            type: 'image',
            id: msg.id
        }));

    const groupedMessages = useMemo(() => activeMessages.reduce((groups, msg) => {
        const date = formatChatDateLabel(msg.created_at, timeNow);
        if (!groups[date]) groups[date] = [];
        groups[date].push(msg);
        return groups;
    }, {}), [activeMessages, timeNow]);

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-gray-800 flex flex-col">
            <Head title="My Messages" />

            {/* --- NAVBAR --- */}
            <BuyerNavbar />

            {/* CHAT CONTAINER */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                <div className="bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden flex flex-col sm:flex-row h-[calc(100dvh-112px)] sm:h-[calc(100vh-140px)]">
                    
                    {/* LEFT: CONTACT LIST */}
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
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                        <MessageCircle size={24} className="text-gray-300" />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">No conversations yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Your chats with sellers will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: CONVERSATION */}
                    <div className={`flex-1 flex flex-col bg-white ${!showMobileList ? 'block' : 'hidden sm:flex'}`}>
                        {currentChatUser ? (
                            <>
                                {/* ACTIVE CHAT HEADER */}
                                <div className="bg-white border-b border-gray-100 flex items-center justify-between gap-3 px-3 py-3 sm:px-6 shrink-0 shadow-sm z-10">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <button 
                                            onClick={() => setShowMobileList(true)}
                                            className="sm:hidden p-2 -ml-2 text-gray-400 hover:text-gray-600"
                                        >
                                            <ArrowLeft size={20} />
                                        </button>
                                        <div className="relative">
                                            <UserAvatar user={currentChatUser} className="w-10 h-10 shadow-sm border border-stone-100" />
                                            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${currentChatUser.is_online ? 'bg-green-500' : 'bg-gray-300'}`}></div>
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
                                            className="p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-50 rounded-xl transition sm:p-2.5"
                                            title="View Orders"
                                        >
                                            <ShoppingBag size={18} />
                                        </Link>
                                        <button 
                                            onClick={() => setShowInfoPanel(!showInfoPanel)}
                                            className={`p-2 rounded-xl transition sm:p-2.5 ${showInfoPanel ? 'bg-clay-100 text-clay-700' : 'text-gray-400 hover:text-clay-600 hover:bg-clay-50'}`}
                                        >
                                            <Info size={18} />
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
                                        <div className="flex flex-col items-center justify-center h-full text-center">
                                            <div className="w-20 h-20 bg-clay-50 rounded-2xl flex items-center justify-center mb-4">
                                                <MessageCircle size={32} className="text-clay-300" />
                                            </div>
                                            <h4 className="font-bold text-gray-900 mb-1">Start the conversation</h4>
                                            <p className="text-sm text-gray-500 max-w-xs">
                                                Say hi to {currentChatUser.name} and discuss your order details!
                                            </p>
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

                                {/* MESSAGE INPUT */}
                                <div className="p-3 bg-white border-t border-gray-100 shrink-0 relative">
                                    <div className="max-w-3xl mx-auto">
                                    {/* Emoji Picker Popover */}
                                    {showEmojiPicker && (
                                        <div ref={emojiPickerRef} className="absolute bottom-full right-3 sm:right-4 mb-2 z-50 animate-in slide-in-from-bottom-2 duration-200 shadow-2xl rounded-2xl overflow-hidden border border-gray-100">
                                            <EmojiPicker 
                                                onEmojiClick={onEmojiClick}
                                                autoFocusSearch={false}
                                                theme="light"
                                                lazyLoadEmojis={true}
                                            />
                                        </div>
                                    )}

                                    {/* Attachment Preview */}
                                    {attachmentPreview && (
                                        <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-start justify-between group animate-in fade-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {attachmentPreview.type === 'image' ? (
                                                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200 shadow-sm bg-white">
                                                        <img src={attachmentPreview.url} alt="Preview" className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0 shadow-sm text-clay-500">
                                                        <FileIcon size={24} />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-800 truncate mb-0.5">{attachmentPreview.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {attachmentPreview.type === 'image' ? 'Image File' : 'Document File'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={removeAttachment}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}

                                    <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                        <div className="flex-1 relative bg-gray-50 border border-gray-200 focus-within:border-clay-400 focus-within:ring-2 focus-within:ring-clay-100 rounded-full flex items-center pr-1 transition-all overflow-hidden">
                                            <div className="flex items-center pl-1 group/attachments">
                                                <button 
                                                    type="button" 
                                                    onClick={() => imageInputRef.current?.click()}
                                                    className="p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-100 rounded-full transition-all duration-200"
                                                    title="Attach Image"
                                                >
                                                    <ImageIcon size={18} />
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="p-2 text-gray-400 hover:text-clay-600 hover:bg-clay-100 rounded-full transition-all duration-200"
                                                    title="Attach Document"
                                                >
                                                    <Paperclip size={18} />
                                                </button>
                                            </div>

                                            <input 
                                                ref={inputRef}
                                                type="text" 
                                                value={data.message}
                                                onChange={(e) => {
                                                    setData('message', e.target.value);
                                                    signalTyping();
                                                }}
                                                placeholder="Write a message..." 
                                                className="flex-1 w-full pl-4 pr-2 py-2 bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700 placeholder-gray-400"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage(e);
                                                    } else {
                                                        signalTyping();
                                                    }
                                                }}
                                            />
                                            
                                            <button 
                                                type="button" 
                                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                className={`p-1.5 mr-1 rounded-full transition-colors shrink-0 ${showEmojiPicker ? 'text-clay-600 bg-clay-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                                                title="Insert Emoji"
                                            >
                                                <Smile size={18} />
                                            </button>
                                        </div>
                                        <button 
                                            type="submit" 
                                            disabled={processing || (!data.message.trim() && !data.attachment)}
                                            className="w-10 h-10 bg-clay-600 text-white rounded-full flex items-center justify-center hover:bg-clay-700 hover:shadow-md transition-all disabled:opacity-50 disabled:hover:shadow-none shrink-0"
                                        >
                                            <Send size={18} className="ml-0.5" />
                                        </button>
                                    </form>

                                    {/* Hidden File Inputs */}
                                    <input 
                                        type="file" 
                                        ref={imageInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.zip" 
                                        className="hidden" 
                                    />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
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
                        )}
                    </div>
                    
                    {/* INFO PANEL (Slide Over on right) */}
                    {showInfoPanel && currentChatUser && (
                        <div className="w-full sm:w-80 border-l border-gray-100 bg-gray-50 flex flex-col absolute right-0 top-0 bottom-0 z-20 shadow-2xl sm:relative sm:shadow-none animate-in slide-in-from-right-10">
                            {/* --- HEADER --- */}
                            <header className="h-16 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-20 sticky top-0">
                                <h3 className="font-bold text-gray-900">Seller Info</h3>
                                <button 
                                    onClick={() => setShowInfoPanel(false)}
                                    className="p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
                                >
                                    <X size={20} />
                                </button>
                            </header>
                            
                            {/* Panel Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {/* User Profile Summary */}
                                <div className="flex flex-col items-center text-center mb-8">
                                    <div className="relative mb-4 flex justify-center">
                                        <UserAvatar user={currentChatUser} className="w-24 h-24 text-3xl shadow-md border-4 border-white" />
                                        {currentChatUser.is_online && (
                                            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-gray-50 z-20" />
                                        )}
                                    </div>
                                    <h4 className="font-bold text-gray-900 text-lg mb-4">{currentChatUser.shop_name || currentChatUser.name}</h4>
                                    <p className="text-sm text-gray-500 mb-4">{currentChatUser.email}</p>
                                    
                                    <div className="flex gap-2 w-full">
                                        {currentChatUserShopHref ? (
                                            <Link
                                                href={currentChatUserShopHref}
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition shadow-sm"
                                            >
                                                <ShoppingBag size={16} className="text-clay-500" />
                                                View Shop
                                            </Link>
                                        ) : (
                                            <span className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-sm font-semibold cursor-not-allowed shadow-sm">
                                                <ShoppingBag size={16} className="text-gray-300" />
                                                Shop Unavailable
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Info Cards */}
                                <div className="space-y-4">
                                    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                                        <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">About Seller</h5>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-3">
                                                <User size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{currentChatUser.name}</p>
                                                    <p className="text-xs text-gray-500">Contact Person</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 break-words">
                                                        {currentChatUserAddress || 'No address provided'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Address</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <Phone size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{currentChatUser.phone_number || 'No number provided'}</p>
                                                    <p className="text-xs text-gray-500">Number</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Media Viewer Lightbox */}
            <MediaViewer 
                show={!!activeMedia} 
                mediaList={galleryImages}
                initialIndex={activeMedia?.index || 0}
                onClose={() => setActiveMedia(null)} 
            />
        </div>
    );
}

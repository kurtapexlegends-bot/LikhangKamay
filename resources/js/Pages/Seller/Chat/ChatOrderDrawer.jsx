import React, { useState, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { 
    X, 
    ShoppingBag, 
    User, 
    MapPin, 
    Phone, 
    FileIcon, 
    ImageIcon, 
    Paperclip, 
    Truck, 
    Package, 
    Clock, 
    ArrowRight 
} from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';

export default function ChatOrderDrawer({
    show = false,
    onClose,
    currentChatUser,
    currentChatUserAddress = '',
    currentOrderContext = null,
    userOrders = [],
    activeMessages = [],
    onOrderDecision = null,
}) {
    const [activeTab, setActiveTab] = useState(currentOrderContext ? 'order' : 'profile');

    // Filter and collect all shared files from activeMessages
    const sharedFiles = useMemo(() => {
        return (activeMessages || [])
            .filter((msg) => msg.attachment_path)
            .map((msg) => ({
                id: msg.id,
                name: msg.attachment_path.split('/').pop() || 'Attachment',
                path: msg.attachment_url || (msg.attachment_path.startsWith('http') || msg.attachment_path.startsWith('/storage') ? msg.attachment_path : `/storage/${msg.attachment_path}`),
                type: msg.attachment_type || 'document',
                time: msg.time || (msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')
            }))
            .reverse();
    }, [activeMessages]);

    if (!show || !currentChatUser) return null;

    return (
        <>
            {/* Mobile Backdrop Overlay */}
            <div 
                className="fixed inset-0 bg-stone-900/35 backdrop-blur-[1px] z-50 xl:hidden animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Slide-over Drawer Panel */}
            <aside 
                aria-label="Order and customer context"
                className="fixed inset-y-0 right-0 z-50 xl:z-auto w-84 max-w-[85vw] xl:max-w-none xl:w-84 bg-white border-l border-stone-200 flex flex-col shrink-0 h-full shadow-2xl xl:shadow-none xl:relative animate-in slide-in-from-right duration-300"
            >
                {/* Header */}
                <header className="px-5 py-4 border-b border-stone-100 flex items-center justify-between shrink-0 bg-stone-50/50">
                    <div className="flex items-center gap-2">
                        <ShoppingBag size={16} className="text-clay-600" />
                        <h3 className="font-bold text-stone-900 text-xs tracking-wider uppercase">Order & Details</h3>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </header>

                {/* Tab Switcher */}
                <div className="flex border-b border-stone-100 shrink-0 text-xs font-bold uppercase tracking-wider">
                    {currentOrderContext && (
                        <button
                            type="button"
                            onClick={() => setActiveTab('order')}
                            className={`flex-1 py-3 text-center transition ${
                                activeTab === 'order'
                                    ? 'border-b-2 border-clay-600 text-clay-700 bg-clay-50/30'
                                    : 'text-stone-400 hover:text-stone-600'
                            }`}
                        >
                            Order
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-center transition ${
                            activeTab === 'profile'
                                ? 'border-b-2 border-clay-600 text-clay-700 bg-clay-50/30'
                                : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        Customer
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('files')}
                        className={`flex-1 py-3 text-center transition flex items-center justify-center gap-1 ${
                            activeTab === 'files'
                                ? 'border-b-2 border-clay-600 text-clay-700 bg-clay-50/30'
                                : 'text-stone-400 hover:text-stone-600'
                        }`}
                    >
                        Files
                        {sharedFiles.length > 0 && (
                            <span className="rounded-full bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold text-stone-600">
                                {sharedFiles.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* ORDER TAB */}
                    {activeTab === 'order' && currentOrderContext && (
                        <div className="space-y-4">
                            {/* Active Order Card */}
                            <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                        Active Order #{currentOrderContext.orderNumber || currentOrderContext.id}
                                    </span>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                        <Clock size={10} />
                                        {currentOrderContext.status || 'Pending'}
                                    </span>
                                </div>

                                <div className="text-lg font-black text-stone-900">
                                    ₱{Number(currentOrderContext.total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                </div>

                                {/* Items list if present */}
                                {Array.isArray(currentOrderContext.items) && currentOrderContext.items.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t border-stone-200/60">
                                        {currentOrderContext.items.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-xs">
                                                <span className="text-stone-700 truncate max-w-[170px]">
                                                    {item.quantity}x {item.name || item.product_name}
                                                </span>
                                                <span className="font-bold text-stone-900">₱{item.price}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Shipment Tracker Pill */}
                                <div className="pt-2 border-t border-stone-200/60 flex items-center gap-2 text-[11px] text-stone-600">
                                    <Truck size={14} className="text-clay-600 shrink-0" />
                                    <span className="font-medium">
                                        {currentOrderContext.shipment_status || 'Ready for Dispatch'}
                                    </span>
                                </div>

                                {/* Quick Dispatch Action */}
                                {onOrderDecision && currentOrderContext.canRespond && (
                                    <div className="pt-2">
                                        <button
                                            type="button"
                                            onClick={() => onOrderDecision('processing')}
                                            className="w-full py-2 px-3 rounded-xl bg-clay-600 hover:bg-clay-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                                        >
                                            <Package size={13} />
                                            <span>Quick Dispatch Order</span>
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Recent User Orders */}
                            {userOrders.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                        Order History ({userOrders.length})
                                    </h5>
                                    <div className="space-y-2">
                                        {userOrders.slice(0, 3).map((order) => (
                                            <div
                                                key={order.id}
                                                className="p-3 bg-white border border-stone-200 rounded-xl text-xs flex items-center justify-between"
                                            >
                                                <div>
                                                    <span className="font-bold text-stone-800">#{order.order_number || order.id}</span>
                                                    <p className="text-[10px] text-stone-400">{order.date || order.created_at?.slice(0, 10)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-bold text-stone-900">₱{order.total}</span>
                                                    <span className="block text-[9px] text-stone-500 capitalize">{order.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Link
                                href={route('orders.index')}
                                className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition"
                            >
                                <span>All Shop Orders</span>
                                <ArrowRight size={12} />
                            </Link>
                        </div>
                    )}

                    {/* CUSTOMER PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            <div className="flex flex-col items-center text-center p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
                                <div className="relative mb-3 w-20 h-20 mx-auto shrink-0">
                                    <UserAvatar user={currentChatUser} className="w-20 h-20 text-2xl shadow-sm border-2 border-white" />
                                    {currentChatUser.is_online && (
                                        <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" />
                                    )}
                                </div>
                                <h4 className="font-bold text-stone-900 text-sm mb-0.5 truncate max-w-full">
                                    {currentChatUser.name}
                                </h4>
                                <p className="text-xs text-stone-500 break-all max-w-full">{currentChatUser.email}</p>
                            </div>

                            <div className="bg-white rounded-2xl p-4 border border-stone-200/80 space-y-3">
                                <h5 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                    Contact & Shipping Details
                                </h5>
                                <div className="space-y-3 text-xs">
                                    <div className="flex items-start gap-2.5">
                                        <User size={14} className="text-stone-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-stone-900 truncate">{currentChatUser.name}</p>
                                            <p className="text-[10px] text-stone-400">Customer Name</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <MapPin size={14} className="text-stone-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-stone-900 break-words leading-relaxed">
                                                {currentChatUserAddress || 'No address provided'}
                                            </p>
                                            <p className="text-[10px] text-stone-400">Delivery Address</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2.5">
                                        <Phone size={14} className="text-stone-400 mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-stone-900 truncate">
                                                {currentChatUser.phone_number || 'No number provided'}
                                            </p>
                                            <p className="text-[10px] text-stone-400">Contact Number</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SHARED FILES TAB */}
                    {activeTab === 'files' && (
                        <div className="space-y-2">
                            {sharedFiles.length > 0 ? (
                                sharedFiles.map((file) => (
                                    <a
                                        key={file.id}
                                        href={file.path}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-3 p-3 bg-stone-50 hover:bg-stone-100 border border-stone-200/60 rounded-xl transition text-left group"
                                    >
                                        <div className="p-2 rounded-lg bg-white border border-stone-200 text-stone-500 shadow-xs shrink-0">
                                            {file.type === 'image' ? <ImageIcon size={14} /> : <FileIcon size={14} />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-stone-800 truncate group-hover:underline underline-offset-2">
                                                {file.name}
                                            </p>
                                            <span className="text-[10px] text-stone-400 block mt-0.5">{file.time}</span>
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <div className="text-center py-12 text-stone-400">
                                    <Paperclip className="mx-auto mb-2 opacity-40" size={20} />
                                    <p className="text-xs font-medium">No files shared in this thread yet.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}

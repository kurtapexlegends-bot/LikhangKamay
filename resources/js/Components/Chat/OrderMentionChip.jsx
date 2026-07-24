import React, { useState } from 'react';
import { Package, ExternalLink, X, CheckCircle2, Clock3, Truck, XCircle, ShoppingBag } from 'lucide-react';
import Modal from '@/Components/Modal';

const statusStyles = {
    Pending: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock3 },
    Accepted: { badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle2 },
    Shipped: { badge: 'bg-sky-100 text-sky-700 border-sky-200', icon: Truck },
    Delivered: { badge: 'bg-teal-100 text-teal-700 border-teal-200', icon: Truck },
    Completed: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'Refund/Return': { badge: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
};

export default function OrderMentionChip({ text, userOrders = [], isMe = false }) {
    const [selectedOrder, setSelectedOrder] = useState(null);

    if (!text || typeof text !== 'string') {
        return <span>{text}</span>;
    }

    // Regex to match @[ORD-XXXX-XXXX] or @[ORD-XXXX]
    const mentionRegex = /@\[(ORD-[A-Z0-9-]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
        // Text before the match
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }

        const orderNumber = match[1];
        const matchedOrder = (userOrders || []).find(
            ord => ord.order_number?.toUpperCase() === orderNumber.toUpperCase()
        );

        parts.push({
            type: 'mention',
            orderNumber,
            orderData: matchedOrder,
        });

        lastIndex = mentionRegex.lastIndex;
    }

    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }

    // If no mention found, return plain text
    if (parts.length === 0 || (parts.length === 1 && typeof parts[0] === 'string')) {
        return <span>{text}</span>;
    }

    return (
        <>
            <span>
                {parts.map((part, i) => {
                    if (typeof part === 'string') {
                        return <span key={i}>{part}</span>;
                    }

                    const ord = part.orderData;
                    const orderNum = part.orderNumber;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedOrder(ord || { order_number: orderNum, status: 'Active' })}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 mx-0.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                                isMe 
                                    ? 'bg-white/20 hover:bg-white/30 text-white border border-white/40' 
                                    : 'bg-clay-50 hover:bg-clay-100 text-clay-800 border border-clay-200/80'
                            }`}
                        >
                            <Package size={12} className="shrink-0" />
                            <span>Order #{orderNum}</span>
                            <ExternalLink size={10} className="opacity-70 shrink-0" />
                        </button>
                    );
                })}
            </span>

            {/* ORDER PREVIEW MODAL */}
            {selectedOrder && (
                <Modal show={!!selectedOrder} onClose={() => setSelectedOrder(null)} maxWidth="md">
                    <div className="p-5 font-sans">
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-clay-50 rounded-xl text-clay-700">
                                    <Package size={18} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-stone-900 text-sm">
                                        {selectedOrder.order_number}
                                    </h3>
                                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                                        Tagged Order Details
                                    </p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedOrder(null)}
                                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                <span className="text-xs text-stone-500 font-medium">Current Status</span>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusStyles[selectedOrder.status]?.badge || 'bg-stone-100 text-stone-700'}`}>
                                    {selectedOrder.status || 'Active'}
                                </span>
                            </div>

                            {/* Items List */}
                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Order Items</p>
                                    <div className="divide-y divide-stone-100 border border-stone-100 rounded-xl overflow-hidden bg-stone-50/40">
                                        {selectedOrder.items.map((item, idx) => (
                                            <div key={idx} className="p-2.5 flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 shrink-0 overflow-hidden">
                                                    {item.img ? (
                                                        <img src={item.img} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ShoppingBag size={16} className="text-stone-400 m-auto mt-2.5" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-bold text-stone-900 text-xs truncate">{item.name}</p>
                                                    <p className="text-[10px] text-stone-500">Qty: {item.qty} | {item.variant}</p>
                                                </div>
                                                <span className="font-bold text-xs text-stone-800">
                                                    PHP {Number(item.price * item.qty).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Items Summary fallback */}
                            {!selectedOrder.items && selectedOrder.items_summary && (
                                <div className="p-3 bg-stone-50 rounded-xl text-xs text-stone-700 border border-stone-100">
                                    <p className="font-semibold text-stone-900 mb-1">Items:</p>
                                    <p>{selectedOrder.items_summary}</p>
                                </div>
                            )}

                            {/* Total Amount */}
                            {selectedOrder.total_amount && (
                                <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                                    <span className="font-bold text-stone-600">Total Order Amount</span>
                                    <span className="font-black text-clay-700 text-sm">
                                        PHP {Number(selectedOrder.total_amount).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 pt-3 border-t border-stone-100 text-right">
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
}

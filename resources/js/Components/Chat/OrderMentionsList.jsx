import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { Package, ShoppingBag, Tag, Clock3, CheckCircle2, Truck, XCircle } from 'lucide-react';

const statusBadgeStyles = {
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Accepted: 'bg-blue-50 text-blue-700 border-blue-200',
    Shipped: 'bg-sky-50 text-sky-700 border-sky-200',
    Delivered: 'bg-teal-50 text-teal-700 border-teal-200',
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Refund/Return': 'bg-rose-50 text-rose-700 border-rose-200',
};

export const OrderMentionsList = forwardRef(({
    isVisible,
    orders = [],
    orderIndex = 0,
    onSelect,
    onClose,
}, ref) => {
    if (!isVisible || !orders || orders.length === 0) return null;

    return (
        <div 
            ref={ref} 
            className="absolute bottom-full left-3 sm:left-4 mb-2 z-50 bg-white border border-stone-200 shadow-2xl rounded-2xl w-80 max-w-[90vw] overflow-hidden font-sans text-xs animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
            <div className="px-3.5 py-2.5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between text-stone-500 font-bold uppercase tracking-wider text-[9px]">
                <div className="flex items-center gap-1.5 text-clay-700">
                    <Package size={13} />
                    <span>Tag Specific Order</span>
                </div>
                <span className="text-stone-400">{orders.length} order{orders.length > 1 ? 's' : ''}</span>
            </div>

            <div className="max-h-60 overflow-y-auto p-1.5 divide-y divide-stone-50 custom-scrollbar">
                {orders.map((ord, idx) => {
                    const badgeClass = statusBadgeStyles[ord.status] || 'bg-stone-100 text-stone-700 border-stone-200';
                    return (
                        <button
                            key={ord.id || ord.order_number}
                            type="button"
                            onClick={() => onSelect(ord)}
                            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                                idx === orderIndex 
                                    ? 'bg-clay-50/90 text-clay-800 font-bold border border-clay-200/60 shadow-xs' 
                                    : 'hover:bg-stone-50 text-stone-700 border border-transparent'
                            }`}
                        >
                            <div className="w-10 h-10 rounded-lg border border-stone-200 bg-stone-100 shrink-0 overflow-hidden flex items-center justify-center">
                                <img 
                                    src={ord.cover_img || '/images/placeholder.svg'} 
                                    alt={ord.order_number} 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                                />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <span className="font-extrabold text-stone-900 text-[11px] truncate">
                                        {ord.order_number}
                                    </span>
                                    <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${badgeClass}`}>
                                        {ord.status}
                                    </span>
                                </div>
                                <p className="text-[10px] text-stone-500 truncate leading-tight">
                                    {ord.items_summary || 'Order Items'}
                                </p>
                                <div className="mt-1 flex items-center justify-between text-[10px] text-stone-400">
                                    <span>PHP {Number(ord.total_amount || 0).toFixed(2)}</span>
                                    <span>{ord.created_at}</span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

OrderMentionsList.displayName = 'OrderMentionsList';

export function useOrderMentions({ message, setMessage, inputRef, userOrders = [] }) {
    const [mentionSearch, setMentionSearch] = useState('');
    const [orderIndex, setOrderIndex] = useState(0);
    const [showOrderMentions, setShowOrderMentions] = useState(false);
    const [mentionStart, setMentionStart] = useState(-1);
    const [manualPickerOpen, setManualPickerOpen] = useState(false);

    const checkOrderMentions = (text, cursorPosition) => {
        if (!userOrders || userOrders.length === 0) {
            setShowOrderMentions(false);
            return;
        }

        const textBeforeCursor = text.slice(0, cursorPosition);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1) {
            const charBeforeAt = textBeforeCursor[lastAtIndex - 1];
            const isValidTrigger = lastAtIndex === 0 || /\s/.test(charBeforeAt);

            if (isValidTrigger) {
                const query = textBeforeCursor.slice(lastAtIndex + 1);
                if (!query.includes('\n') && query.length < 25) {
                    setMentionStart(lastAtIndex);
                    setMentionSearch(query);
                    setShowOrderMentions(true);
                    setOrderIndex(0);
                    return;
                }
            }
        }
        setShowOrderMentions(false);
    };

    const filteredOrders = useMemo(() => {
        if (!userOrders) return [];
        if (manualPickerOpen) return userOrders;
        if (!showOrderMentions) return [];
        
        const search = mentionSearch.toLowerCase();
        return userOrders.filter(ord => 
            ord.order_number?.toLowerCase().includes(search) ||
            ord.items_summary?.toLowerCase().includes(search) ||
            ord.status?.toLowerCase().includes(search)
        );
    }, [userOrders, showOrderMentions, manualPickerOpen, mentionSearch]);

    const isDropdownVisible = (showOrderMentions || manualPickerOpen) && filteredOrders.length > 0;

    const selectOrder = (ord) => {
        const orderTag = `@[${ord.order_number}] `;
        
        if (mentionStart !== -1 && showOrderMentions) {
            const beforeAt = message.slice(0, mentionStart);
            const cursorPosition = inputRef.current ? inputRef.current.selectionStart : message.length;
            const afterMention = message.slice(cursorPosition);
            setMessage(beforeAt + orderTag + afterMention);
        } else {
            setMessage(message ? `${message} ${orderTag}` : orderTag);
        }

        setShowOrderMentions(false);
        setManualPickerOpen(false);

        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const toggleManualPicker = () => {
        setManualPickerOpen(prev => !prev);
        setShowOrderMentions(false);
    };

    return {
        isDropdownVisible,
        filteredOrders,
        orderIndex,
        setOrderIndex,
        checkOrderMentions,
        selectOrder,
        toggleManualPicker,
        manualPickerOpen,
        closeDropdown: () => {
            setShowOrderMentions(false);
            setManualPickerOpen(false);
        }
    };
}

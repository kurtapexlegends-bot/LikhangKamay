import React from "react";
import { MessageCircle } from "lucide-react";
import BuyerAvatar from "@/Components/Seller/Orders/BuyerAvatar";

export default function CustomerDetailCard({ order, canAccessMessages, openChat }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest shrink-0">
                Customer Info:
            </span>
            <BuyerAvatar customerName={order.customer} avatarUrl={order.customer_avatar} />
            <div className="min-w-0 flex items-center gap-1.5">
                <p className="text-xs font-bold text-stone-800 truncate">{order.customer}</p>
                {order.shipping_contact_phone && (
                    <span className="text-[10px] text-stone-400 font-medium hidden sm:inline">• {order.shipping_contact_phone}</span>
                )}
            </div>
            {canAccessMessages && (
                <button
                    onClick={() => openChat(order.user_id)}
                    className="p-1 text-clay-600 hover:text-clay-700 bg-clay-50 hover:bg-clay-100 rounded-lg transition-all flex items-center justify-center shrink-0"
                    title="Chat with customer"
                    type="button"
                >
                    <MessageCircle size={12} />
                </button>
            )}
        </div>
    );
}

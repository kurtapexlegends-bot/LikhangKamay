import React from "react";
import { MessageCircle } from "lucide-react";
import BuyerAvatar from "@/Components/Seller/Orders/BuyerAvatar";

export default function CustomerDetailCard({ order, canAccessMessages, openChat }) {
    return (
        <div className="space-y-2">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block">
                Customer Info
            </span>
            <div className="flex items-center gap-2.5">
                <BuyerAvatar customerName={order.customer} avatarUrl={order.customer_avatar} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-stone-800 truncate">{order.customer}</p>
                    {order.shipping_contact_phone && (
                        <p className="text-[10px] text-stone-400 font-bold mt-0.5">{order.shipping_contact_phone}</p>
                    )}
                </div>
                {canAccessMessages && (
                    <button
                        onClick={() => openChat(order.user_id)}
                        className="p-2 text-clay-600 hover:text-clay-700 bg-clay-50/50 hover:bg-clay-100/60 border border-transparent hover:border-clay-100/30 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
                        title="Chat with customer"
                        type="button"
                    >
                        <MessageCircle size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}

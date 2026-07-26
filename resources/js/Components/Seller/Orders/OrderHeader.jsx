import React from "react";
import { Clock } from "lucide-react";
import OrderStatusBadge from "@/Components/Orders/OrderStatusBadge";
import PaymentStatusBadge from "@/Components/Orders/PaymentStatusBadge";

export default function OrderHeader({ order }) {
    return (
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-stone-100/80 pb-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
                <div>
                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">
                        Order
                    </span>
                    <h3 className="font-bold text-stone-900 text-xs sm:text-sm leading-none mt-0.5">
                        {order.id}
                    </h3>
                </div>
                <div className="hidden sm:block h-4 w-px bg-stone-200" />
                <div className="flex items-center gap-1 text-stone-400">
                    <Clock size={11} />
                    <span className="text-[11px] font-medium text-stone-500">
                        {order.date}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <PaymentStatusBadge
                    status={order.payment_status}
                    method={order.payment_method}
                />
                <OrderStatusBadge
                    status={order.status}
                />
            </div>
        </div>
    );
}

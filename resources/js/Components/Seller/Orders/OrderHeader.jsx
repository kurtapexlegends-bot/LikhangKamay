import React from "react";
import { Clock } from "lucide-react";
import OrderStatusBadge from "@/Components/Orders/OrderStatusBadge";
import PaymentStatusBadge from "@/Components/Orders/PaymentStatusBadge";

export default function OrderHeader({ order }) {
    return (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
                <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                        Order
                    </span>
                    <h3 className="font-bold text-gray-900 text-sm">
                        {order.id}
                    </h3>
                </div>
                <div className="hidden sm:block h-6 w-px bg-stone-200" />
                <div className="flex items-center gap-1.5 text-gray-400">
                    <Clock size={12} />
                    <span className="text-xs font-medium">
                        {order.date}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2">
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

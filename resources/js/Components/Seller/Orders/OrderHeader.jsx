import React from "react";
import { Clock, Printer } from "lucide-react";
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
                <a
                    href={route("orders.receipt", order.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-stone-600 bg-white border border-stone-200/90 rounded-md hover:bg-stone-50 hover:text-stone-900 transition shadow-2xs"
                    title="Print Packing Slip & Customer Receipt"
                >
                    <Printer size={11} className="text-stone-400" />
                    <span>Slip</span>
                </a>
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

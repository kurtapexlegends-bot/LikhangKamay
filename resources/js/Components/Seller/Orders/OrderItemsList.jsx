import React from "react";

export default function OrderItemsList({ order }) {
    if (!order.items || order.items.length === 0) return null;

    return (
        <div className="flex-1">
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible flex-nowrap md:flex-wrap gap-3 pb-2 md:pb-0 scrollbar-none">
                {order.items.map((item, idx) => (
                    <div
                        key={`${order.id}-${item.name}-${idx}`}
                        className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-2.5 min-w-[280px] md:min-w-0 flex-shrink-0 md:flex-shrink"
                    >
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                            <img
                                src={
                                    item.img.startsWith("http") || item.img.startsWith("/storage") || item.img.startsWith("/images")
                                        ? item.img
                                        : `/storage/${item.img}`
                                }
                                alt={item.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.src = "/images/no-image.png";
                                }}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="truncate text-[13px] font-semibold text-gray-900">
                                {item.name}
                            </p>
                            <p className="text-[11px] text-gray-500">
                                Variant: {item.variant} / Qty {item.qty}
                            </p>
                        </div>
                        <div className="text-[13px] font-semibold text-gray-700 shrink-0">
                            PHP {Number(item.price).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

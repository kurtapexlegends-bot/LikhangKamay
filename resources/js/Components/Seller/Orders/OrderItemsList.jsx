import React from "react";

export default function OrderItemsList({ order }) {
    if (!order.items || order.items.length === 0) return null;

    return (
        <div className="flex-1">
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible flex-nowrap md:flex-wrap gap-3 pb-2 md:pb-0 scrollbar-none">
                {order.items.map((item, idx) => (
                    <div
                        key={`${order.id}-${item.name}-${idx}`}
                        className="flex items-center gap-2.5 rounded-xl border border-stone-200/60 bg-stone-50/50 p-2 min-w-[260px] md:min-w-0 flex-shrink-0 md:flex-shrink"
                    >
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white">
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
                            <p className="truncate text-xs font-bold text-stone-850">
                                {item.name}
                            </p>
                            <p className="text-[10px] font-medium text-stone-500">
                                Variant: {item.variant} / Qty {item.qty}
                            </p>
                        </div>
                        <div className="text-xs font-bold text-stone-800 shrink-0">
                            PHP {Number(item.price).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

import React, { useEffect } from "react";
import { Head } from "@inertiajs/react";
import { Printer, ArrowLeft } from "lucide-react";

export default function BulkLabels({ orders = [] }) {
    useEffect(() => {
        // Automatically open print dialog if there are orders
        if (orders.length > 0) {
            // setTimeout to ensure content is rendered
            setTimeout(() => {
                window.print();
            }, 1000);
        }
    }, [orders]);

    return (
        <div className="min-h-screen bg-stone-50 p-4 sm:p-8 print:bg-white print:p-0">
            <Head title="Print Shipping Labels" />

            {/* Print Controls (Hidden on Print) */}
            <div className="mx-auto mb-8 flex max-w-4xl items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => window.close()}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:bg-stone-50"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-gray-900">
                            Batch Label Printing
                        </h1>
                        <p className="text-sm text-gray-500">
                            {orders.length} orders ready to print
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 rounded-xl bg-clay-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700"
                >
                    <Printer size={18} />
                    Print All
                </button>
            </div>

            {/* Labels Grid */}
            <div className="mx-auto max-w-4xl space-y-8 print:max-w-none print:space-y-0">
                {orders.map((order, idx) => (
                    <div
                        key={order.id}
                        className={`relative overflow-hidden rounded-2xl border-2 border-stone-200 bg-white p-8 print:rounded-none print:border-b print:border-gray-300 print:shadow-none ${
                            idx % 2 === 0 ? "print:break-after-none" : "print:break-after-page"
                        }`}
                        style={{ minHeight: "14cm" }} // Standard half-A4 approximately
                    >
                        {/* Header */}
                        <div className="mb-6 flex items-start justify-between border-b border-dashed border-stone-200 pb-6">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                    LikhangKamay Dispatch
                                </p>
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                                    #{order.id}
                                </h2>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-400">Method</p>
                                <span className="inline-flex items-center rounded-full bg-clay-50 px-3 py-1 text-xs font-black text-clay-700 uppercase">
                                    {order.shipping_method}
                                </span>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                        Ship To
                                    </p>
                                    <p className="text-xl font-bold text-gray-900 mt-1">
                                        {order.customer}
                                    </p>
                                    <p className="text-sm font-medium text-stone-600 mt-2 leading-relaxed">
                                        {order.address}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 mt-2">
                                        {order.phone}
                                    </p>
                                </div>

                                {order.notes && (
                                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
                                            Delivery Notes
                                        </p>
                                        <p className="mt-1 text-xs font-medium text-amber-800">
                                            {order.notes}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                                    Package Contents
                                </p>
                                <div className="space-y-2">
                                    {order.items.map((item, i) => (
                                        <div key={i} className="flex justify-between text-sm">
                                            <span className="font-medium text-stone-700">
                                                {item.name}
                                            </span>
                                            <span className="font-bold text-gray-900">
                                                x{item.qty}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                
                                <div className="mt-8 pt-8 border-t border-stone-100">
                                    {/* Mock Barcode */}
                                    <div className="h-16 w-full bg-stone-900 flex items-end justify-center pb-2 gap-1 px-4">
                                        {[...Array(40)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="bg-white" 
                                                style={{ 
                                                    width: Math.random() > 0.5 ? '2px' : '4px',
                                                    height: `${Math.random() * 40 + 40}%` 
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-center font-mono mt-2 text-stone-400">
                                        ORDER-SECURE-LK-{order.id.replace('#', '')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer Decoration */}
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-clay-500 via-stone-200 to-clay-500 opacity-20 print:hidden" />
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        margin: 0;
                        size: A4;
                    }
                    body {
                        background: white;
                    }
                    .print\\:break-after-page {
                        break-after: page;
                    }
                }
            `}} />
        </div>
    );
}

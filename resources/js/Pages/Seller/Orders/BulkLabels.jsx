import React, { useEffect } from "react";
import { Head } from "@inertiajs/react";
import { Printer, ArrowLeft, Package, Truck, ShieldAlert } from "lucide-react";

/**
 * Deterministic SVG Barcode Generator (Code-128 Style)
 */
function SVGBarcode({ value }) {
    const str = String(value || "LK-ORD-1001").toUpperCase();
    const pattern = [];
    
    // Generate deterministic bar widths based on char codes
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        pattern.push((code % 3) + 1);
        pattern.push(((code * 7) % 3) + 1);
        pattern.push(((code * 13) % 2) + 1);
    }

    let xCursor = 10;
    const barElements = [];
    const barHeight = 44;

    // Start pattern
    [2, 1, 1, 2].forEach((w) => {
        barElements.push(<rect key={`s-${xCursor}`} x={xCursor} y={0} width={w} height={barHeight} fill="#1c1917" />);
        xCursor += w + 1;
    });

    pattern.forEach((w, idx) => {
        if (idx % 2 === 0) {
            barElements.push(<rect key={`b-${idx}`} x={xCursor} y={0} width={w} height={barHeight} fill="#1c1917" />);
        }
        xCursor += w + 1;
    });

    // Stop pattern
    [2, 3, 1, 2].forEach((w) => {
        barElements.push(<rect key={`e-${xCursor}`} x={xCursor} y={0} width={w} height={barHeight} fill="#1c1917" />);
        xCursor += w + 1;
    });

    const totalWidth = xCursor + 10;

    return (
        <div className="flex flex-col items-center">
            <svg viewBox={`0 0 ${totalWidth} ${barHeight}`} className="h-12 w-full max-w-[280px]" preserveAspectRatio="none">
                <rect width={totalWidth} height={barHeight} fill="#ffffff" />
                {barElements}
            </svg>
            <span className="mt-1 font-mono text-[10px] font-bold tracking-wider text-stone-700 uppercase">
                *{str}*
            </span>
        </div>
    );
}

export default function BulkLabels({ orders = [] }) {
    useEffect(() => {
        if (orders.length > 0) {
            const timer = setTimeout(() => {
                window.print();
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [orders]);

    return (
        <div className="min-h-screen bg-stone-100 p-4 sm:p-8 print:bg-white print:p-0">
            <Head title="Print Shipping Labels" />

            {/* Print Navigation Controls (Hidden on Print) */}
            <div className="mx-auto mb-6 flex max-w-3xl items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm print:hidden">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => window.close()}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 text-stone-500 transition hover:bg-stone-50"
                        title="Back to Orders"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-base font-bold text-stone-900">
                            Batch Label Printing
                        </h1>
                        <p className="text-xs text-stone-500 font-medium">
                            {orders.length} shipping label{orders.length === 1 ? '' : 's'} ready for courier pickup
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 rounded-xl bg-clay-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-clay-200 transition hover:bg-clay-800 active:scale-[0.98]"
                >
                    <Printer size={16} />
                    Print All Labels
                </button>
            </div>

            {/* Waybill Labels List */}
            <div className="mx-auto max-w-3xl space-y-6 print:max-w-none print:space-y-0">
                {orders.map((order, idx) => {
                    const orderRefNo = order.id ? String(order.id).replace('#', '') : 'ORD-1001';
                    const barcodeValue = `LK-${orderRefNo}`;

                    return (
                        <div
                            key={order.id}
                            className={`rounded-2xl border-2 border-stone-800 bg-white p-6 shadow-sm print:rounded-none print:border-2 print:border-stone-900 print:shadow-none ${
                                idx % 2 === 0 ? "print:break-after-none" : "print:break-after-page"
                            }`}
                            style={{ minHeight: "13.5cm" }}
                        >
                            {/* Waybill Header & Routing Badge */}
                            <div className="flex items-center justify-between border-b-2 border-stone-900 pb-4">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-900 text-white font-black text-sm">
                                        LK
                                    </div>
                                    <div>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-stone-500 block">
                                            LIKHANGKAMAY DISPATCH · WAYBILL
                                        </span>
                                        <h2 className="text-xl font-black text-stone-900 tracking-tight leading-none mt-0.5">
                                            #{orderRefNo}
                                        </h2>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block rounded-md bg-stone-900 text-white px-2.5 py-1 text-xs font-black uppercase tracking-wider">
                                        {order.shipping_method || 'STANDARD DELIVERY'}
                                    </span>
                                    <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mt-1">
                                        Zone: MNL-METRO
                                    </p>
                                </div>
                            </div>

                            {/* Sender & Receiver Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-b border-stone-200">
                                {/* From (Sender) */}
                                <div className="space-y-1 pr-2 border-b sm:border-b-0 sm:border-r border-stone-200 pb-3 sm:pb-0">
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400 block">
                                        FROM (SENDER)
                                    </span>
                                    <p className="text-xs font-bold text-stone-900">LikhangKamay Partner Merchant</p>
                                    <p className="text-[11px] text-stone-600 font-medium">Metro Manila Hub, Philippines</p>
                                </div>

                                {/* Ship To (Receiver) */}
                                <div className="space-y-1">
                                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-stone-400 block">
                                        SHIP TO (RECIPIENT)
                                    </span>
                                    <p className="text-sm font-extrabold text-stone-900">
                                        {order.customer || 'Kurt Stanley Talastas'}
                                    </p>
                                    <p className="text-xs text-stone-700 font-medium leading-relaxed">
                                        {order.address || '456 Maginhawa St, Quezon City, Metro Manila'}
                                    </p>
                                    {order.phone && (
                                        <p className="text-xs font-bold text-stone-900 pt-0.5">
                                            Contact: {order.phone}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Delivery Instructions */}
                            {order.notes && (
                                <div className="my-3 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-500 block">
                                        Delivery Instructions
                                    </span>
                                    <p className="text-xs font-semibold text-stone-800 mt-0.5">
                                        {order.notes}
                                    </p>
                                </div>
                            )}

                            {/* Package Contents & Barcode Footer */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 items-end">
                                {/* Contents Table */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-stone-400">
                                        <Package size={12} />
                                        Package Contents
                                    </div>
                                    <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 space-y-1 text-xs">
                                        {(order.items || []).map((item, i) => (
                                            <div key={i} className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-stone-800 truncate max-w-[180px]">
                                                    {item.name}
                                                </span>
                                                <span className="font-extrabold text-stone-900 bg-white px-1.5 py-0.5 rounded border border-stone-200 text-[10px]">
                                                    x{item.qty}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="inline-flex items-center gap-1 text-[9px] font-extrabold text-stone-500 uppercase tracking-wider">
                                        <ShieldAlert size={11} className="text-amber-600" />
                                        Handcrafted Artisan Goods · Handle with Care
                                    </div>
                                </div>

                                {/* Scannable Barcode */}
                                <div className="p-3 bg-white rounded-xl border border-stone-200 text-center">
                                    <SVGBarcode value={barcodeValue} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page {
                        margin: 10mm;
                        size: A4 portrait;
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

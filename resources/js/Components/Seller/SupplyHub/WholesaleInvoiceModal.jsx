/* global route */
import React from 'react';
import Modal from '@/Components/Modal';
import { X, Printer, FileText, Store, MapPin, Phone, CreditCard, ExternalLink, CheckCircle2 } from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function WholesaleInvoiceModal({
    isOpen,
    onClose,
    order,
    sellerShopName,
    sellerName,
}) {
    if (!isOpen || !order) return null;

    const items = order.items || [];
    const depositAmount = Number(order.deposit_amount || order.downpayment_amount || 0);
    const totalAmount = Number(order.total || order.total_amount || 0);
    const merchandiseSubtotal = Number(order.merchandise_subtotal || order.total || 0);
    const shippingFee = Number(order.shipping_fee_amount || 0);
    const remainingBalance = Math.max(0, totalAmount - depositAmount);
    const paymentTerms = order.payment_terms || (order.payment_status === 'paid' ? 'Paid in Full' : 'Settlement on Delivery');

    const handlePrint = () => {
        window.print();
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="3xl">
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-stone-200">
                {/* Modal Action Header (Non-printable toolbar) */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/70 print:hidden">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-clay-100 text-clay-700">
                            <FileText size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-stone-900">
                                B2B Wholesale Supply Invoice
                            </h3>
                            <p className="text-[11px] text-stone-500 font-medium">
                                Commercial materials settlement for Order #{order.order_number || order.id}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-clay-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-800 transition active:scale-95 cursor-pointer"
                        >
                            <Printer size={14} />
                            <span>Print Invoice</span>
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-200/60 transition cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Printable Invoice Document Body */}
                <div className="p-6 sm:p-8 space-y-6 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-0">
                    {/* Invoice Brand Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-stone-200 pb-5">
                        <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-clay-800 bg-clay-50 border border-clay-200 px-2.5 py-0.5 rounded-md">
                                LikhangKamay Studio Supply Hub
                            </span>
                            <h2 className="text-xl font-black text-stone-900 mt-2 tracking-tight">
                                COMMERCIAL INVOICE
                            </h2>
                            <p className="text-xs text-stone-500 font-mono mt-0.5">
                                Invoice Ref: INV-WS-{order.order_number || order.id}
                            </p>
                        </div>

                        <div className="text-left sm:text-right text-xs space-y-1">
                            <div>
                                <span className="text-stone-400 font-medium">Issue Date: </span>
                                <span className="font-bold text-stone-800">{order.date || 'Today'}</span>
                            </div>
                            <div>
                                <span className="text-stone-400 font-medium">Status: </span>
                                <span className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded-md text-[10px] uppercase ${
                                    order.payment_status === 'paid'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                    {order.payment_status === 'paid' ? 'Paid in Full' : 'Payment Pending'}
                                </span>
                            </div>
                            {order.tracking_number && (
                                <div>
                                    <span className="text-stone-400 font-medium">Waybill: </span>
                                    <span className="font-mono font-bold text-stone-700">{order.tracking_number}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Parties Section (Supplier & Buyer) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-stone-200 bg-stone-50/50 p-4">
                        {/* Supplier Info */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                                Fulfilling Supplier (Seller Studio)
                            </p>
                            <p className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                                <Store size={14} className="text-clay-600 shrink-0" />
                                {sellerShopName || 'Verified Artisan Workshop'}
                            </p>
                            {sellerName && (
                                <p className="text-xs text-stone-600 font-medium">
                                    Artisan Owner: {sellerName}
                                </p>
                            )}
                            <div className="pt-1">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                    <CheckCircle2 size={11} /> Verified Materials Artisan
                                </span>
                            </div>
                        </div>

                        {/* Buyer Info */}
                        <div className="space-y-1.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                                Billed & Shipped To (Buyer Studio)
                            </p>
                            <p className="text-sm font-bold text-stone-900">
                                {order.customer || 'Artisan Buyer'}
                            </p>
                            {order.buyer_shop_name && (
                                <p className="text-xs text-stone-600 font-semibold flex items-center gap-1">
                                    <Store size={12} className="text-stone-400 shrink-0" />
                                    {order.buyer_shop_name}
                                </p>
                            )}
                            {order.shipping_contact_phone && (
                                <p className="text-xs text-stone-500 font-medium flex items-center gap-1">
                                    <Phone size={12} className="text-stone-400 shrink-0" />
                                    {order.shipping_contact_phone}
                                </p>
                            )}
                            {order.shipping_address && (
                                <p className="text-xs text-stone-600 font-medium flex items-start gap-1">
                                    <MapPin size={12} className="text-stone-400 mt-0.5 shrink-0" />
                                    <span>{order.shipping_address}</span>
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Itemized Materials Table */}
                    <div className="rounded-xl border border-stone-200 overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-stone-100/80 text-[10px] font-bold uppercase text-stone-500 border-b border-stone-200">
                                <tr>
                                    <th className="py-2.5 px-3 sm:px-4">Material / Item</th>
                                    <th className="py-2.5 px-2 sm:px-3 text-center">Unit</th>
                                    <th className="py-2.5 px-2 sm:px-3 text-center">Qty</th>
                                    <th className="py-2.5 px-3 sm:px-4 text-right">Wholesale Rate</th>
                                    <th className="py-2.5 px-3 sm:px-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 bg-white">
                                {items.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-stone-50/50">
                                        <td className="py-3 px-3 sm:px-4 font-bold text-stone-900">
                                            <div className="flex items-center gap-2.5">
                                                {item.img && (
                                                    <img
                                                        src={item.img}
                                                        alt={item.name}
                                                        className="h-8 w-8 rounded-lg object-cover border border-stone-200 shrink-0 print:hidden"
                                                        onError={(e) => { e.target.src = '/images/placeholder.svg'; }}
                                                    />
                                                )}
                                                <span className="truncate max-w-[220px] sm:max-w-none">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 sm:px-3 text-center text-stone-600 font-medium font-mono">
                                            {item.supply_unit || 'unit'}
                                        </td>
                                        <td className="py-3 px-2 sm:px-3 text-center font-bold text-stone-900 font-mono">
                                            {item.qty}
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-right font-medium text-stone-700 font-mono">
                                            {formatCurrency(item.price)}
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-right font-black text-stone-900 font-mono">
                                            {formatCurrency(item.price * item.qty)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Terms & Deposit Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {/* Left: Terms & Shipping Notes */}
                        <div className="space-y-3">
                            <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-3.5 text-xs space-y-1.5">
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 flex items-center gap-1">
                                    <CreditCard size={12} className="text-clay-600" />
                                    <span>Settlement Terms & Mode</span>
                                </p>
                                <p className="text-xs font-bold text-stone-800">
                                    {paymentTerms}
                                </p>
                                <p className="text-[11px] text-stone-500 leading-relaxed">
                                    Delivery Mode: <strong className="text-stone-700">{order.shipping_method || 'Standard Delivery'}</strong>
                                </p>
                            </div>

                            {order.shipping_notes && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-0.5">
                                        Fulfillment Instructions
                                    </p>
                                    <p className="italic">{order.shipping_notes}</p>
                                </div>
                            )}
                        </div>

                        {/* Right: Calculations */}
                        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 text-xs space-y-2">
                            <div className="flex justify-between text-stone-600">
                                <span>Materials Subtotal:</span>
                                <span className="font-mono font-bold text-stone-800">{formatCurrency(merchandiseSubtotal)}</span>
                            </div>
                            {shippingFee > 0 && (
                                <div className="flex justify-between text-stone-600">
                                    <span>Shipping & Freight:</span>
                                    <span className="font-mono font-medium text-stone-700">{formatCurrency(shippingFee)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-stone-500">
                                <span>Platform Processing Fee:</span>
                                <span className="font-mono font-medium text-emerald-600">₱0.00 (Artisan Hub Rate)</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-stone-200 text-sm font-bold text-stone-900">
                                <span>Total Order Value:</span>
                                <span className="font-mono font-black text-stone-900">{formatCurrency(totalAmount)}</span>
                            </div>

                            {depositAmount > 0 && (
                                <div className="flex justify-between text-emerald-700 font-semibold pt-1 border-t border-stone-200/60">
                                    <span>Deposit Paid:</span>
                                    <span className="font-mono font-bold">-{formatCurrency(depositAmount)}</span>
                                </div>
                            )}

                            {remainingBalance > 0 && depositAmount > 0 && (
                                <div className="flex justify-between text-amber-800 font-bold">
                                    <span>Remaining Balance Due:</span>
                                    <span className="font-mono">{formatCurrency(remainingBalance)}</span>
                                </div>
                            )}

                            {order.seller_net_amount !== undefined && (
                                <div className="pt-2 border-t border-stone-200 text-stone-500 text-[11px] flex justify-between">
                                    <span>Artisan Payout Release:</span>
                                    <span className="font-mono font-bold text-emerald-700">{formatCurrency(order.seller_net_amount)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* B2B Supply Hub Disclaimer */}
                    <div className="border-t border-stone-200 pt-4 text-center text-[10px] text-stone-400">
                        This commercial supply invoice confirms verified raw workshop materials fulfillment under LikhangKamay Studio Supply Hub standards.
                    </div>
                </div>

                {/* Footer Modal Actions (Non-printable) */}
                <div className="flex items-center justify-between px-6 py-3.5 border-t border-stone-200 bg-stone-50/70 print:hidden">
                    <a
                        href={route('seller.supply-hub.sales.invoice', order.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 transition"
                    >
                        <ExternalLink size={13} />
                        <span>Open Printable View</span>
                    </a>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                        >
                            Close
                        </button>
                        <button
                            type="button"
                            onClick={handlePrint}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-clay-700 px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-800 transition active:scale-95 cursor-pointer"
                        >
                            <Printer size={13} />
                            <span>Print</span>
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

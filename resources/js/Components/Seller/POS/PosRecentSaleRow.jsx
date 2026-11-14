import React from 'react';
import {
    Eye,
    Printer,
    RotateCcw,
    MapPin,
    ShieldCheck,
    ShieldAlert,
} from 'lucide-react';
import PosVoidAuthorizationBox from '@/Components/Seller/POS/PosVoidAuthorizationBox';

const formatCurrency = (value) =>
    new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
    }).format(Number(value || 0));

const summarizeOrderItems = (items = []) => {
    if (!Array.isArray(items) || items.length === 0) return '';
    const first = items[0];
    const firstLabel = `${first.product_name} ×${Number(first.quantity || 0)}`;
    if (items.length === 1) return firstLabel;
    return `${firstLabel} +${items.length - 1} more`;
};

export default function PosRecentSaleRow({
    order,
    canEditPos = false,
    canVoidPos = false,
    isConfirmingVoid = false,
    onView,
    onToggleVoid,
    voidApprovers = [],
    activeSupervisorId = '',
    onSupervisorChange,
    selectedApprover = null,
    voidPin = '',
    onVoidPinChange,
    voidReason = '',
    onVoidReasonChange,
    voidError = '',
    isVoidProcessing = false,
    onConfirmVoid,
    onCancelVoid,
}) {
    const isVoided = order.status !== 'Completed' || order.payment_status === 'refunded';
    const totalUnits = Array.isArray(order.items)
        ? order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
        : 0;
    const itemsPreview = summarizeOrderItems(order.items);

    return (
        <div className="px-4 py-2.5 hover:bg-stone-50/70 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-xs font-extrabold text-stone-900">
                            {order.order_number}
                        </span>
                        <span className="text-[11px] text-stone-500">
                            {order.created_at}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-stone-700">
                            {order.payment_method}
                        </span>
                        {order.pos_payment_reference && (
                            <span className="font-mono text-[10px] text-stone-500">
                                Ref {order.pos_payment_reference}
                            </span>
                        )}
                        {order.location_name && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-stone-700">
                                <MapPin className="w-3 h-3 text-clay-600" />
                                {order.location_name}
                            </span>
                        )}
                        {order.within_geofence === true && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                                <ShieldCheck className="w-3 h-3" />
                                On-site
                            </span>
                        )}
                        {order.within_geofence === false && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                                <ShieldAlert className="w-3 h-3" />
                                Outside
                            </span>
                        )}
                        {isVoided && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-700">
                                Voided
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-stone-500">
                        <span className="font-medium text-stone-700">
                            {order.customer_name}
                        </span>
                        {itemsPreview && (
                            <span className="text-stone-600 truncate max-w-[260px]">
                                {itemsPreview}{totalUnits > 0 ? ` (${totalUnits})` : ''}
                            </span>
                        )}
                        <span>
                            · {order.processed_by}{order.actor_role ? ` (${order.actor_role})` : ''}
                        </span>
                        {order.ip_address && (
                            <span className="font-mono text-[10px] text-stone-400">
                                IP {order.ip_address}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <span className={`text-xs sm:text-sm font-black tabular-nums ${isVoided ? 'text-stone-400 line-through' : 'text-clay-700'}`}>
                        {formatCurrency(order.total_amount)}
                    </span>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onView}
                            className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-[11px] font-bold text-stone-700 inline-flex items-center gap-1"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                window.open(
                                    `${order.receipt_url}?auto_print=1`,
                                    '_blank',
                                    'noopener,noreferrer'
                                )
                            }
                            className="h-8 px-2.5 rounded-lg border border-stone-200 bg-stone-100 hover:bg-stone-200 text-[11px] font-bold text-stone-800 inline-flex items-center gap-1"
                        >
                            <Printer className="w-3.5 h-3.5 text-clay-600" />
                            <span>80mm</span>
                        </button>
                        {canEditPos && !isVoided && (
                            <button
                                type="button"
                                onClick={onToggleVoid}
                                className="h-8 px-2.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[11px] font-bold text-rose-700 inline-flex items-center gap-1"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Void</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isVoided && (order.voided_by || order.void_approved_by || order.cancellation_reason) && (
                <div className="mt-1.5 rounded-lg bg-rose-50/80 border border-rose-100 px-2.5 py-1 text-[11px] text-rose-800 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    {order.voided_by && (
                        <span className="font-bold">
                            Voided by {order.voided_by}
                            {order.void_approved_by && order.void_approved_by !== order.voided_by
                                ? ` · Approved by ${order.void_approved_by}${order.void_approved_by_role ? ` (${order.void_approved_by_role})` : ''}`
                                : ''}
                            {order.voided_at ? ` · ${order.voided_at}` : ''}
                        </span>
                    )}
                    {order.cancellation_reason && (
                        <span className="font-medium">Reason: {order.cancellation_reason}</span>
                    )}
                </div>
            )}

            {isConfirmingVoid && (
                <PosVoidAuthorizationBox
                    order={order}
                    voidApprovers={voidApprovers}
                    activeSupervisorId={activeSupervisorId}
                    onSupervisorChange={onSupervisorChange}
                    selectedApprover={selectedApprover}
                    canVoidPos={canVoidPos}
                    voidPin={voidPin}
                    onVoidPinChange={onVoidPinChange}
                    voidReason={voidReason}
                    onVoidReasonChange={onVoidReasonChange}
                    voidError={voidError}
                    isProcessing={isVoidProcessing}
                    onConfirm={onConfirmVoid}
                    onCancel={onCancelVoid}
                />
            )}
        </div>
    );
}

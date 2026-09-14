import React from 'react';
import { CheckCircle2, Clock, XCircle, ShieldAlert, AlertTriangle, Eye, Package } from 'lucide-react';

export function StatusPill({ status, rejectionReason, sellerNotes }) {
    return (
        <div className="flex flex-col items-center">
            {status === 'Active' ? (
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-100/40">
                    <CheckCircle2 size={12} /> Active
                </span>
            ) : status === 'pending_review' ? (
                <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-amber-100/40">
                    <Clock size={12} /> Pending Review
                </span>
            ) : status === 'rejected' ? (
                <span className="inline-flex items-center gap-1.5 bg-red-55/10 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-red-100/40">
                    <XCircle size={12} /> Rejected
                </span>
            ) : status === 'flagged' ? (
                <span className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-rose-200/40">
                    <ShieldAlert size={12} /> Flagged
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 bg-stone-50 text-stone-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-stone-200/40">
                    <AlertTriangle size={12} /> {status}
                </span>
            )}
            {rejectionReason && (
                <p className="text-[10px] text-red-550 mt-1.5 max-w-[180px] truncate font-bold mx-auto text-left w-fit" title={rejectionReason}>
                    Reason: {rejectionReason}
                </p>
            )}
            {status === 'pending_review' && sellerNotes && (
                <div className="mt-1.5 text-[10px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-200 max-w-[200px] break-words font-medium mx-auto text-left w-fit">
                    <span className="font-bold text-stone-700">Seller Notes:</span> "{sellerNotes}"
                </div>
            )}
        </div>
    );
}

export default function ModerationRowItem({ product, onInspect }) {
    const photoUrl = product.img || (product.cover_photo_path?.startsWith('http') ? product.cover_photo_path : product.cover_photo_path ? `/storage/${product.cover_photo_path}` : null);

    return (
        <tr className="hover:bg-stone-50/30 transition duration-150 group">
            <td className="py-4 pl-8 pr-4 align-middle">
                <div className="flex items-center justify-start gap-4 cursor-pointer" onClick={() => onInspect(product)}>
                    <div className="w-12 h-12 rounded-xl border border-stone-200 bg-stone-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {photoUrl ? (
                            <img
                                src={photoUrl}
                                alt={product.name || ''}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/images/placeholder.svg';
                                }}
                            />
                        ) : (
                            <Package size={16} className="text-stone-300" />
                        )}
                    </div>
                    <div className="max-w-[200px] text-left">
                        <p className="text-xs font-bold text-stone-900 truncate hover:text-clay-600 transition-colors">{product.name}</p>
                        <p className="text-[10px] text-stone-550 font-mono tracking-wider bg-stone-100/80 rounded px-1.5 py-0.5 w-fit mt-1">Code: {product.sku}</p>
                    </div>
                </div>
            </td>
            <td className="py-4 px-4 align-middle text-xs font-bold text-stone-850">
                <div className="text-left">
                    <p className="text-stone-900">{product.user?.shop_name || 'Individual Seller'}</p>
                    <p className="text-[10px] text-stone-500 font-medium mt-0.5">{product.user?.name}</p>
                </div>
            </td>
            <td className="py-4 px-4 text-center align-middle text-xs font-semibold text-stone-500">
                {product.created_at ? new Date(product.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
            </td>
            <td className="py-4 px-4 text-center align-middle whitespace-nowrap">
                <StatusPill
                    status={product.status}
                    rejectionReason={product.rejection_reason}
                    sellerNotes={product.latest_resubmission?.notes}
                />
            </td>
            <td className="py-4 pl-4 pr-8 align-middle">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onInspect(product)}
                        className="px-3.5 py-1.5 rounded-xl bg-clay-50 hover:bg-clay-600 text-clay-700 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-clay-200/60 hover:border-transparent active:scale-95 transition-all duration-200 shadow-sm"
                        title="Inspect Product Details"
                    >
                        <Eye size={14} />
                        <span>Inspect</span>
                    </button>
                </div>
            </td>
        </tr>
    );
}

export function ModerationCardItem({ product, onInspect }) {
    const photoUrl = product.img || (product.cover_photo_path?.startsWith('http') ? product.cover_photo_path : product.cover_photo_path ? `/storage/${product.cover_photo_path}` : null);

    return (
        <div className="bg-white border border-stone-200/80 hover:border-stone-300 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 hover:shadow-md">
            <div className="flex gap-4">
                <div className="w-16 h-16 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {photoUrl ? (
                        <img
                            src={photoUrl}
                            alt={product.name || ''}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/images/placeholder.svg';
                            }}
                        />
                    ) : (
                        <Package className="text-stone-300" size={24} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <h3 
                            onClick={() => onInspect(product)}
                            className="font-bold text-stone-900 text-sm hover:text-clay-600 transition-colors cursor-pointer truncate"
                            title={product.name}
                        >
                            {product.name}
                        </h3>
                        <span className="text-[10px] font-bold text-stone-400 whitespace-nowrap bg-stone-50 px-2 py-0.5 rounded-md border border-stone-150">
                            ₱{product.price}
                        </span>
                    </div>
                    
                    <p className="text-[10px] text-stone-500 mt-0.5 truncate">
                        SKU: {product.sku || 'N/A'}
                    </p>

                    <div className="mt-2 space-y-1">
                        <p className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                            <span className="text-stone-400 font-normal">Shop:</span> {product.user?.shop_name || product.user?.name}
                        </p>
                        <p className="text-[10px] text-stone-400">
                            Submitted: {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-100 mt-auto">
                <StatusPill
                    status={product.status}
                    rejectionReason={product.rejection_reason}
                    sellerNotes={product.latest_resubmission?.notes}
                />
                <button
                    onClick={() => onInspect(product)}
                    className="px-4 py-2 rounded-xl bg-clay-50 hover:bg-clay-600 text-clay-700 hover:text-white font-bold text-xs flex items-center gap-1.5 border border-clay-200/60 hover:border-transparent active:scale-95 transition-all duration-200 shadow-sm"
                >
                    <Eye size={13} />
                    <span>Inspect</span>
                </button>
            </div>
        </div>
    );
}

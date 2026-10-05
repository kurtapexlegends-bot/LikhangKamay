import React, { useState } from 'react';
import { 
    X, 
    Clock, 
    Calendar, 
    Copy, 
    Check, 
    FileCode, 
    ChevronDown, 
    ExternalLink, 
    Wallet, 
    Receipt,
    Globe
} from 'lucide-react';
import Modal from '@/Components/Modal';
import UserAvatar from '@/Components/UserAvatar';
import { 
    getActionIcon, 
    getActionColor, 
    formatActionLabel, 
    getHumanReadableMetadata, 
    formatCurrency 
} from '@/utils/platformOperationsHelpers';
import { copyToClipboard } from '@/utils/clipboard';

export default function DiagnosticsLogDetailsModal({ isOpen, onClose, log }) {
    const [copied, setCopied] = useState(false);

    if (!log) return null;

    const colorClasses = getActionColor(log.action);
    const metadata = log.metadata || {};
    const readableMeta = getHumanReadableMetadata(metadata);
    const hasMetadata = Object.keys(metadata).length > 0;
    const jsonString = hasMetadata ? JSON.stringify(metadata, null, 2) : '{}';

    const isPayout = (log.action || '').toLowerCase().includes('payout') || !!metadata.payout_id || !!metadata.net_amount;
    const payoutAmount = metadata.net_amount ?? metadata.amount;

    const logDate = log.created_at ? new Date(log.created_at) : new Date();
    const formattedTime = !isNaN(logDate.getTime()) 
        ? logDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
        : 'N/A';
    const formattedDate = !isNaN(logDate.getTime()) 
        ? logDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) 
        : 'N/A';

    const handleCopy = async () => {
        const ok = await copyToClipboard(jsonString);
        if (ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 shrink-0 bg-stone-50/50">
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${colorClasses}`}>
                        {React.createElement(getActionIcon(log.action), { size: 16 })}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${colorClasses}`}>
                                {formatActionLabel(log.action)}
                            </span>
                            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Record #{log.id}</span>
                        </div>
                        <h3 className="text-sm font-black text-stone-900 mt-0.5">
                            {isPayout ? 'Disbursement Activity Details' : 'Activity Record Details'}
                        </h3>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition active:scale-95"
                >
                    <X size={18} />
                </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[calc(85vh-130px)] overflow-y-auto">
                {/* Activity Summary / Description */}
                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Activity Summary</span>
                    <p className="text-xs sm:text-sm font-bold text-stone-800 leading-relaxed">{log.description}</p>
                </div>

                {/* Specialized Payout Disbursement Summary */}
                {isPayout && (
                    <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-4 space-y-3">
                        <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2.5">
                            <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                                <Wallet size={15} className="text-emerald-700" />
                                <span>Disbursement Summary</span>
                            </div>
                            {Boolean(metadata.payout_id && typeof route === 'function') && (
                                <a
                                    href={route('admin.payouts.voucher', metadata.payout_id) + '?download=1'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 hover:text-emerald-950 bg-white border border-emerald-300 hover:border-emerald-400 px-3 py-1 rounded-xl shadow-2xs transition active:scale-95"
                                >
                                    <Receipt size={13} />
                                    <span>View Disbursement Slip</span>
                                    <ExternalLink size={11} className="opacity-70" />
                                </a>
                            )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            <div>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Beneficiary Shop</span>
                                <p className="text-xs font-black text-stone-900 mt-0.5 truncate">{metadata.shop_name || 'Artisan Seller'}</p>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Net Released</span>
                                <p className="text-sm font-black text-emerald-700 mt-0.5">{formatCurrency(payoutAmount)}</p>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Payment Channel</span>
                                <p className="text-xs font-black text-stone-900 mt-0.5 uppercase">{metadata.channel || 'Direct Transfer'}</p>
                            </div>
                            <div>
                                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest block">Reference #</span>
                                <p className="text-xs font-mono font-bold text-stone-700 mt-0.5 truncate">{metadata.reference_number || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* General Formatted Metadata Tiles */}
                {!isPayout && readableMeta.length > 0 && (
                    <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Activity Context</span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {readableMeta.map((item) => (
                                <div key={item.key} className="p-3 bg-stone-50 rounded-xl border border-stone-200/70">
                                    <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">{item.label}</span>
                                    <p className="text-xs font-bold text-stone-800 mt-0.5 truncate">{item.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actor and Timestamp Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl border border-stone-200/80 bg-white space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Performed By</span>
                        <div className="flex items-center gap-3 pt-1">
                            <UserAvatar user={log.user} className="w-9 h-9 border border-stone-200" />
                            <div>
                                <p className="text-xs font-black text-stone-900 leading-tight">{log.user?.name || 'System Actor'}</p>
                                <p className="text-[9px] font-bold text-clay-700 uppercase tracking-widest mt-0.5">{(log.user?.role || 'admin').replace(/_/g, ' ')}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-stone-200/80 bg-white space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recorded Timestamp</span>
                        <div className="pt-1 space-y-1">
                            <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                                <Clock size={13} className="text-stone-400" />
                                <span>{formattedTime}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                <Calendar size={13} className="text-stone-400" />
                                <span>{formattedDate}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Origin Telemetry (if available) */}
                {metadata.ip_address && (
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-[11px] font-medium">
                        <Globe size={13} className="text-stone-400" />
                        <span>Origin IP: <strong className="text-stone-700 font-mono">{metadata.ip_address}</strong></span>
                    </div>
                )}

                {/* Technical Data (Developer Reference) - Collapsed by default */}
                {hasMetadata && (
                    <details className="group border border-stone-200/80 rounded-2xl bg-stone-50/60 overflow-hidden transition-all">
                        <summary className="px-4 py-3 flex items-center justify-between cursor-pointer font-bold text-xs text-stone-600 hover:text-stone-900 select-none">
                            <div className="flex items-center gap-2">
                                <FileCode size={14} className="text-clay-700" />
                                <span>Technical Data (Developer Reference)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-stone-400 font-normal group-open:hidden">Click to expand</span>
                                <ChevronDown size={14} className="text-stone-400 group-open:rotate-180 transition-transform" />
                            </div>
                        </summary>

                        <div className="p-4 pt-2 border-t border-stone-200/50 space-y-3 bg-white">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Raw Attribute Payload</span>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-clay-700 bg-stone-100 hover:bg-stone-200/70 px-2.5 py-1 rounded-lg transition"
                                >
                                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                                </button>
                            </div>

                            <div className="relative rounded-xl bg-stone-900 border border-stone-800 p-3.5 overflow-x-auto text-stone-100 font-mono text-xs max-h-48">
                                <pre className="leading-relaxed">{jsonString}</pre>
                            </div>
                        </div>
                    </details>
                )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-end shrink-0">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition active:scale-95 min-h-[38px]"
                >
                    Close
                </button>
            </div>
        </Modal>
    );
}

import React, { useState } from 'react';
import { X, Clock, Calendar, Shield, Copy, Check, Terminal, FileCode } from 'lucide-react';
import UserAvatar from '@/Components/UserAvatar';
import { getActionIcon, getActionColor, formatActionLabel } from '@/utils/platformOperationsHelpers';

export default function DiagnosticsLogDetailsModal({ isOpen, onClose, log }) {
    const [copied, setCopied] = useState(false);

    if (!isOpen || !log) return null;

    const colorClasses = getActionColor(log.action);

    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
    const jsonString = hasMetadata ? JSON.stringify(log.metadata, null, 2) : '{}';

    const handleCopy = () => {
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
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
                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Log #{log.id}</span>
                            </div>
                            <h3 className="text-sm font-black text-stone-900 mt-0.5">Diagnostic Log Details</h3>
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Event Description */}
                    <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Description</span>
                        <p className="text-xs sm:text-sm font-bold text-stone-800 leading-relaxed">{log.description}</p>
                    </div>

                    {/* Metadata Information Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl border border-stone-200/80 bg-white space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Administrator</span>
                            <div className="flex items-center gap-3 pt-1">
                                <UserAvatar user={log.user} className="w-9 h-9 border border-stone-200" />
                                <div>
                                    <p className="text-xs font-black text-stone-900 leading-tight">{log.user?.name || 'System Actor'}</p>
                                    <p className="text-[9px] font-bold text-clay-700 uppercase tracking-widest mt-0.5">{log.user?.role?.replace('_', ' ') || 'admin'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl border border-stone-200/80 bg-white space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">Recorded Timestamp</span>
                            <div className="pt-1 space-y-1">
                                <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
                                    <Clock size={13} className="text-stone-400" />
                                    <span>{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                                    <Calendar size={13} className="text-stone-400" />
                                    <span>{new Date(log.created_at).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formatted Context JSON / Metadata Formatter */}
                    {hasMetadata && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileCode size={14} className="text-clay-700" />
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-stone-700">Context JSON &amp; Attributes</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 hover:text-clay-700 bg-stone-100 hover:bg-stone-200/70 px-2.5 py-1 rounded-lg transition"
                                >
                                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                                    <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                                </button>
                            </div>

                            <div className="relative rounded-2xl bg-stone-900 border border-stone-800 p-4 overflow-x-auto text-stone-100 font-mono text-xs max-h-56">
                                <pre className="leading-relaxed">{jsonString}</pre>
                            </div>
                        </div>
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
            </div>
        </div>
    );
}

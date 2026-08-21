import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputError from '@/Components/InputError';
import { AlertTriangle, Clock, Ban, CheckCircle2, History, X, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react';

export default function DisciplinaryActionModal({ user, onClose, onSuccess }) {
    if (!user) return null;

    const isSuspended = Boolean(user.is_suspended);
    const isBanned = Boolean(user.is_banned);
    const isWarned = Boolean(user.is_warned);

    const defaultAction = isBanned 
        ? 'unban' 
        : isSuspended 
        ? 'lift_suspension' 
        : user.warning_count >= 2 
        ? 'ban' 
        : user.warning_count >= 1 
        ? 'suspension' 
        : 'warning';

    const [activeAction, setActiveAction] = useState(defaultAction);

    const { data, setData, post, processing, errors, reset } = useForm({
        action: defaultAction,
        reason: '',
        duration_days: 7,
    });

    const handleActionChange = (action) => {
        setActiveAction(action);
        setData('action', action);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('admin.users.discipline', user.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                if (onSuccess) onSuccess();
                onClose();
            },
        });
    };

    const nextWarningNumber = (user.warning_count || 0) + 1;

    return (
        <Modal show={true} onClose={onClose} maxWidth="lg">
            <div className="p-6 bg-[#FCFBF9]">
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-stone-200/80">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-stone-900">Disciplinary Enforcement</h3>
                            <p className="text-xs text-stone-500 font-medium mt-0.5">
                                {user.name} ({user.email}) &bull; <span className="capitalize font-semibold text-stone-700">{user.role || 'Buyer'}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Current Disciplinary State Badge */}
                <div className="my-4 p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        {isBanned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200/70">
                                <Ban size={13} /> Permanently Banned
                            </span>
                        ) : isSuspended ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200/70">
                                <Clock size={13} /> Suspended ({user.days_remaining_suspension || 1}d remaining)
                            </span>
                        ) : isWarned ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/70">
                                <AlertTriangle size={13} /> {user.warning_count} Previous Warning(s)
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                <CheckCircle2 size={13} /> Clean Standing (0 Strikes)
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 font-semibold">
                        User #{user.id}
                    </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Action Selector */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                            Select Action
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {!isBanned && !isSuspended && (
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('warning')}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                        activeAction === 'warning'
                                            ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                                            : 'border-stone-200 bg-white hover:bg-stone-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                                        <AlertTriangle size={14} /> Strike 1: Warning
                                    </div>
                                    <span className="text-[11px] text-stone-500 mt-1">
                                        Issue formal notice (#{nextWarningNumber})
                                    </span>
                                </button>
                            )}

                            {!isBanned && !isSuspended && (
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('suspension')}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                        activeAction === 'suspension'
                                            ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20'
                                            : 'border-stone-200 bg-white hover:bg-stone-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                                        <Clock size={14} /> Strike 2: Suspend
                                    </div>
                                    <span className="text-[11px] text-stone-500 mt-1">
                                        Temporary pause for X days
                                    </span>
                                </button>
                            )}

                            {!isBanned && (
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('ban')}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                        activeAction === 'ban'
                                            ? 'border-rose-700 bg-rose-100/50 ring-2 ring-rose-700/20'
                                            : 'border-stone-200 bg-white hover:bg-stone-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                                        <Ban size={14} /> Strike 3: Ban
                                    </div>
                                    <span className="text-[11px] text-stone-500 mt-1">
                                        Permanent deactivation
                                    </span>
                                </button>
                            )}

                            {isSuspended && (
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('lift_suspension')}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                        activeAction === 'lift_suspension'
                                            ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                                            : 'border-stone-200 bg-white hover:bg-stone-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                                        <ShieldCheck size={14} /> Lift Suspension
                                    </div>
                                    <span className="text-[11px] text-stone-500 mt-1">
                                        Restore regular access now
                                    </span>
                                </button>
                            )}

                            {isBanned && (
                                <button
                                    type="button"
                                    onClick={() => handleActionChange('unban')}
                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                                        activeAction === 'unban'
                                            ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                                            : 'border-stone-200 bg-white hover:bg-stone-50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                                        <CheckCircle2 size={14} /> Unban Account
                                    </div>
                                    <span className="text-[11px] text-stone-500 mt-1">
                                        Reinstate platform access
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Suspension Duration Options */}
                    {activeAction === 'suspension' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                                Suspension Duration
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {[3, 7, 14, 30].map((days) => (
                                    <button
                                        key={days}
                                        type="button"
                                        onClick={() => setData('duration_days', days)}
                                        className={`py-2 rounded-xl text-xs font-bold transition border ${
                                            data.duration_days === days
                                                ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                                                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                                        }`}
                                    >
                                        {days} Days
                                    </button>
                                ))}
                            </div>
                            <InputError message={errors.duration_days} className="mt-1" />
                        </div>
                    )}

                    {/* Reason input */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                            Reason / Context for User
                        </label>
                        <textarea
                            rows={3}
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            placeholder={
                                activeAction === 'warning'
                                    ? "Describe the guideline infraction clearly..."
                                    : activeAction === 'suspension'
                                    ? "State why the account is suspended and expectations upon return..."
                                    : activeAction === 'ban'
                                    ? "State the grounds for permanent account termination..."
                                    : "Optional note for reinstating the account..."
                            }
                            required
                            className="w-full rounded-xl border-stone-200 text-xs focus:border-clay-500 focus:ring-clay-500 leading-relaxed placeholder:text-stone-400"
                        />
                        <InputError message={errors.reason} className="mt-1" />
                    </div>

                    {/* Past Logs Accordion */}
                    {user.disciplinary_logs && user.disciplinary_logs.length > 0 && (
                        <div className="pt-2">
                            <details className="rounded-xl border border-stone-200 bg-white p-3 text-xs">
                                <summary className="cursor-pointer font-bold text-stone-700 flex items-center gap-1.5 select-none">
                                    <History size={13} className="text-stone-400" />
                                    <span>Past Disciplinary History ({user.disciplinary_logs.length})</span>
                                </summary>
                                <div className="mt-3 space-y-2 max-h-36 overflow-y-auto">
                                    {user.disciplinary_logs.map((log) => (
                                        <div key={log.id} className="p-2 rounded-lg bg-stone-50 border border-stone-100 text-[11px]">
                                            <div className="flex items-center justify-between font-semibold">
                                                <span className="uppercase text-[10px] text-stone-600 font-mono tracking-wider">
                                                    {log.action_type}
                                                </span>
                                                <span className="text-stone-400 font-normal">{log.created_at}</span>
                                            </div>
                                            <p className="text-stone-700 mt-1 leading-snug">{log.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}

                    {/* Modal Footer */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200/80">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.reason.trim()}
                            className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                activeAction === 'ban'
                                    ? 'bg-rose-700 hover:bg-rose-800'
                                    : activeAction === 'suspension'
                                    ? 'bg-amber-700 hover:bg-amber-800'
                                    : activeAction === 'lift_suspension' || activeAction === 'unban'
                                    ? 'bg-emerald-700 hover:bg-emerald-800'
                                    : 'bg-stone-900 hover:bg-black'
                            }`}
                        >
                            {processing ? 'Processing...' : 'Confirm Action'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

/* global route */
import React from 'react';
import { Link } from '@inertiajs/react';
import { KeyRound } from 'lucide-react';

const sanitizePinDigits = (value) => String(value || '').replace(/\D/g, '').slice(0, 6);

export default function PosVoidAuthorizationBox({
    order,
    voidApprovers = [],
    activeSupervisorId = '',
    onSupervisorChange,
    selectedApprover = null,
    canVoidPos = false,
    voidPin = '',
    onVoidPinChange,
    voidReason = '',
    onVoidReasonChange,
    voidError = '',
    isProcessing = false,
    onConfirm,
    onCancel,
}) {
    return (
        <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50/75 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-rose-900 inline-flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-rose-700" />
                    <span>Supervisor Void Authorization · {order.order_number}</span>
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-900/75 mb-1">
                        Authorizing Supervisor
                    </label>
                    <select
                        value={activeSupervisorId}
                        onChange={(e) => onSupervisorChange(e.target.value)}
                        className="w-full h-9 pl-3 pr-8 rounded-lg border border-rose-200 bg-white text-xs font-semibold text-stone-900 focus:border-rose-400 focus:ring-rose-400"
                    >
                        {voidApprovers.map((approver) => (
                            <option key={approver.id} value={approver.id}>
                                {approver.name} · {approver.role_label}
                                {approver.location_name ? ` (${approver.location_name})` : ''}
                                {approver.has_pin ? '' : ' — PIN not set'}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-900/75 mb-1">
                        6-Digit Void PIN
                    </label>
                    <input
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        autoComplete="one-time-code"
                        value={voidPin}
                        onChange={(e) => onVoidPinChange(sanitizePinDigits(e.target.value))}
                        placeholder="••••••"
                        className="w-full h-9 px-2.5 rounded-lg border border-rose-200 bg-white font-mono text-xs tracking-widest text-stone-900 focus:border-rose-400 focus:ring-rose-400"
                    />
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-900/75 mb-1">
                        Void Reason
                    </label>
                    <input
                        type="text"
                        value={voidReason}
                        onChange={(e) => onVoidReasonChange(e.target.value)}
                        minLength={5}
                        maxLength={255}
                        placeholder="Min 5 chars (e.g. Wrong item)"
                        className="w-full h-9 px-2.5 rounded-lg border border-rose-200 bg-white text-xs text-stone-900 focus:border-rose-400 focus:ring-rose-400"
                    />
                </div>
            </div>

            {selectedApprover && !selectedApprover.has_pin && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                        {selectedApprover.name} has not set up a 6-digit Void PIN yet.
                    </span>
                    {canVoidPos && (
                        <Link
                            href={route('profile.edit')}
                            className="font-bold text-clay-700 underline hover:text-clay-800"
                        >
                            Set up Void PIN in Profile Settings
                        </Link>
                    )}
                </div>
            )}

            {voidError && (
                <p className="text-[11px] font-semibold text-rose-700">{voidError}</p>
            )}

            <div className="flex items-center justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="min-h-[36px] px-3 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={
                        isProcessing ||
                        !activeSupervisorId ||
                        !/^\d{6}$/.test(voidPin) ||
                        voidReason.trim().length < 5
                    }
                    className="min-h-[36px] px-4 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-xs font-bold text-white"
                >
                    {isProcessing ? 'Authorizing...' : 'Authorize & Void'}
                </button>
            </div>
        </div>
    );
}

import React from 'react';
import {
    MapPin,
    AlertTriangle,
    Eye,
    Check,
    Ban,
    Sparkles,
} from 'lucide-react';

export default function TimeCardSessionsTable({
    sessions = [],
    canEdit = false,
    submittingActionId = null,
    onApproveSession,
    onOpenRejectModal,
    onViewPhoto,
    formatSessionDate,
    getCleanOperationalFlag,
}) {
    if (sessions.length === 0) {
        return (
            <div className="p-12 text-center text-stone-400 text-xs font-medium">
                No attendance shifts found.
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto min-w-0">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="border-b border-stone-200/80 bg-stone-50/60 text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                            <th className="py-3 px-4">Shift Date</th>
                            <th className="py-3 px-4">Clock In / Out</th>
                            <th className="py-3 px-4">Duration &amp; OT</th>
                            <th className="py-3 px-4">Store Distance</th>
                            <th className="py-3 px-4">Face Photo</th>
                            <th className="py-3 px-4">Audit Status</th>
                            {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {sessions.map((session) => {
                            const isOffSite = session.distance_meters !== null && !session.is_within_geofence;
                            const isRejected = session.approval_status === 'rejected';
                            const isApproved = session.approval_status === 'approved';
                            const isPending = session.approval_status === 'pending' || (!session.approval_status && session.is_flagged);
                            const operationalFlag = getCleanOperationalFlag(session.flag_reason);

                            return (
                                <tr
                                    key={session.id}
                                    className={`hover:bg-stone-50/50 transition-colors ${
                                        isRejected ? 'opacity-60 bg-stone-50/30' : ''
                                    }`}
                                >
                                    {/* Date */}
                                    <td className="py-3 px-4 font-bold text-stone-900 whitespace-nowrap">
                                        <div>{formatSessionDate(session.date)}</div>
                                        {operationalFlag && (
                                            <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5 max-w-[180px] truncate" title={operationalFlag}>
                                                <AlertTriangle size={11} className="text-amber-500 shrink-0" />
                                                <span className="truncate">{operationalFlag}</span>
                                            </div>
                                        )}
                                    </td>

                                    {/* Time */}
                                    <td className="py-3 px-4 font-mono text-stone-700 whitespace-nowrap">
                                        <div className="font-semibold text-xs">
                                            {session.clock_in_time || '—'}
                                            <span className="text-stone-400 mx-1">→</span>
                                            {session.clock_out_time || (
                                                <span className="text-emerald-700 font-bold">Active</span>
                                            )}
                                        </div>
                                    </td>

                                    {/* Duration */}
                                    <td className="py-3 px-4 font-mono whitespace-nowrap">
                                        <div className="font-bold text-stone-900">
                                            {session.worked_hours_label || '0.0 hrs'}
                                        </div>
                                        {session.overtime_hours > 0 && (
                                            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                                +{session.overtime_hours}h OT
                                            </div>
                                        )}
                                        {session.undertime_hours > 0 && (
                                            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                                -{session.undertime_hours}h Undertime
                                            </div>
                                        )}
                                    </td>

                                    {/* Store Distance / Geofence */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {session.distance_meters !== null ? (
                                            <div className="flex items-center gap-1.5">
                                                <MapPin
                                                    size={13}
                                                    className={isOffSite ? 'text-rose-500 shrink-0' : 'text-emerald-600 shrink-0'}
                                                />
                                                <span className={`font-semibold text-xs ${isOffSite ? 'text-rose-700' : 'text-stone-700'}`}>
                                                    {session.distance_meters}m
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                                    isOffSite
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                    {isOffSite ? 'Off-Site' : 'On-Site'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-stone-400 text-xs italic">Unverified</span>
                                        )}
                                    </td>

                                    {/* Photo Verification */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {session.photo_url ? (
                                            <button
                                                type="button"
                                                onClick={() => onViewPhoto({
                                                    url: session.photo_url,
                                                    date: formatSessionDate(session.date),
                                                    time: session.clock_in_time,
                                                    distance: session.distance_meters,
                                                    onSite: !isOffSite,
                                                })}
                                                className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 border border-clay-200/80 px-2 py-1 rounded-lg transition active:scale-95"
                                            >
                                                <Eye size={12} />
                                                <span>View Photo</span>
                                            </button>
                                        ) : (
                                            <span className="text-stone-400 text-xs italic">No photo</span>
                                        )}
                                    </td>

                                    {/* Audit Status */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {isRejected ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                                <Ban size={11} /> Declined
                                            </span>
                                        ) : isApproved ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <Check size={11} /> Approved
                                            </span>
                                        ) : isPending ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                                                <Sparkles size={11} /> Review Needed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600 border border-stone-200">
                                                Regular Shift
                                            </span>
                                        )}
                                    </td>

                                    {/* Actions */}
                                    {canEdit && (
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {!isApproved && (
                                                    <button
                                                        type="button"
                                                        disabled={submittingActionId === session.id}
                                                        onClick={() => onApproveSession(session.id)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Check size={12} /> Approve
                                                    </button>
                                                )}
                                                {!isRejected && (
                                                    <button
                                                        type="button"
                                                        disabled={submittingActionId === session.id}
                                                        onClick={() => onOpenRejectModal(session.id)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Ban size={12} /> Decline
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card List View (< md) */}
            <div className="md:hidden divide-y divide-stone-100">
                {sessions.map((session) => {
                    const isOffSite = session.distance_meters !== null && !session.is_within_geofence;
                    const isRejected = session.approval_status === 'rejected';
                    const isApproved = session.approval_status === 'approved';
                    const isPending = session.approval_status === 'pending' || (!session.approval_status && session.is_flagged);
                    const operationalFlag = getCleanOperationalFlag(session.flag_reason);

                    return (
                        <div
                            key={session.id}
                            className={`p-3.5 space-y-2.5 ${isRejected ? 'opacity-60 bg-stone-50/40' : ''}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-bold text-xs text-stone-900">
                                        {formatSessionDate(session.date)}
                                    </div>
                                    <div className="font-mono text-[11px] text-stone-600 font-semibold mt-0.5">
                                        {session.clock_in_time || '—'} → {session.clock_out_time || 'Active'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-mono font-bold text-xs text-stone-900">
                                        {session.worked_hours_label || '0.0 hrs'}
                                    </div>
                                    {session.overtime_hours > 0 && (
                                        <div className="text-[10px] font-bold text-emerald-700">
                                            +{session.overtime_hours}h OT
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Status and badges row */}
                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                {session.distance_meters !== null && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                                        isOffSite
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    }`}>
                                        <MapPin size={10} />
                                        <span>{session.distance_meters}m • {isOffSite ? 'Off-Site' : 'On-Site'}</span>
                                    </span>
                                )}

                                {session.photo_url && (
                                    <button
                                        type="button"
                                        onClick={() => onViewPhoto({
                                            url: session.photo_url,
                                            date: formatSessionDate(session.date),
                                            time: session.clock_in_time,
                                            distance: session.distance_meters,
                                            onSite: !isOffSite,
                                        })}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-clay-700 bg-clay-50 border border-clay-200/80 px-2 py-0.5 rounded-lg"
                                    >
                                        <Eye size={10} /> Photo
                                    </button>
                                )}

                                {isRejected ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                        <Ban size={10} /> Declined
                                    </span>
                                ) : isApproved ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                        <Check size={10} /> Approved
                                    </span>
                                ) : isPending ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        Review Needed
                                    </span>
                                ) : null}
                            </div>

                            {operationalFlag && (
                                <div className="text-[10px] text-amber-800 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/60 font-medium">
                                    {operationalFlag}
                                </div>
                            )}

                            {/* Mobile action buttons */}
                            {canEdit && (
                                <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                                    {!isApproved && (
                                        <button
                                            type="button"
                                            disabled={submittingActionId === session.id}
                                            onClick={() => onApproveSession(session.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-2 rounded-xl transition min-h-[38px] active:scale-[0.98]"
                                        >
                                            <Check size={13} /> Approve
                                        </button>
                                    )}
                                    {!isRejected && (
                                        <button
                                            type="button"
                                            disabled={submittingActionId === session.id}
                                            onClick={() => onOpenRejectModal(session.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 py-2 rounded-xl transition min-h-[38px] active:scale-[0.98]"
                                        >
                                            <Ban size={13} /> Decline
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}

import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Clock, Calendar, X, AlertCircle, CheckCircle2, PauseCircle, ShieldAlert, Check, Ban, MapPin, Eye, UserCheck } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function EmployeeAttendanceDrawer({ employee, isOpen, onClose, canEdit = true }) {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [rejectingSessionId, setRejectingSessionId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submittingActionId, setSubmittingActionId] = useState(null);
    const { addToast } = useToast();

    const fetchAttendanceLogs = () => {
        if (employee?.id) {
            setLoading(true);
            window.axios
                .get(route('hr.attendance-logs', { employee: employee.id }))
                .then((res) => {
                    setSummary(res.data.summary);
                })
                .catch((err) => console.error('Failed to load employee attendance logs:', err))
                .finally(() => setLoading(false));
        }
    };

    useEffect(() => {
        if (isOpen && employee?.id) {
            fetchAttendanceLogs();
        }
    }, [isOpen, employee?.id]);

    const handleApproveSession = (sessionId) => {
        setSubmittingActionId(sessionId);
        window.axios
            .post(route('hr.attendance-sessions.approve', { session: sessionId }))
            .then(() => {
                addToast('Attendance session approved.', 'success');
                fetchAttendanceLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to approve session.', 'error');
            })
            .finally(() => setSubmittingActionId(null));
    };

    const handleRejectSession = () => {
        if (!rejectingSessionId) return;
        setSubmittingActionId(rejectingSessionId);
        window.axios
            .post(route('hr.attendance-sessions.reject', { session: rejectingSessionId }), {
                reason: rejectionReason,
            })
            .then(() => {
                addToast('Attendance session rejected and excluded from payroll.', 'info');
                setRejectingSessionId(null);
                setRejectionReason('');
                fetchAttendanceLogs();
            })
            .catch((err) => {
                addToast(err.response?.data?.message || 'Failed to reject session.', 'error');
            })
            .finally(() => setSubmittingActionId(null));
    };

    if (!employee) return null;

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50 font-sans" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                            <Transition.Child
                                as={Fragment}
                                enter="transform transition ease-out duration-300"
                                enterFrom="translate-x-full"
                                enterTo="translate-x-0"
                                leave="transform transition ease-in duration-200"
                                leaveFrom="translate-x-0"
                                leaveTo="translate-x-full"
                            >
                                <Dialog.Panel className="pointer-events-auto w-screen max-w-md bg-white border-l border-stone-200 shadow-2xl flex flex-col">
                                    
                                    {/* ── DRAWER HEADER ── */}
                                    <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-clay-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                                {employee.name ? employee.name.charAt(0).toUpperCase() : 'S'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Dialog.Title className="text-base font-extrabold text-stone-900 tracking-tight">
                                                        {employee.name}
                                                    </Dialog.Title>
                                                </div>
                                                <p className="text-xs text-stone-500 font-medium">{employee.role || 'Staff Member'}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-full p-2 text-stone-400 hover:bg-stone-200/60 hover:text-stone-700 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* ── DRAWER BODY ── */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {loading ? (
                                            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-400 text-xs font-semibold">
                                                <div className="w-6 h-6 border-2 border-clay-600 border-t-transparent rounded-full animate-spin" />
                                                <span>Loading attendance logs...</span>
                                            </div>
                                        ) : summary ? (
                                            <>
                                                {/* ── METRIC SUMMARY CARDS ── */}
                                                <div>
                                                    <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 mb-2">
                                                        Monthly Attendance Summary
                                                    </h4>
                                                    <div className="grid grid-cols-2 gap-2.5">
                                                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Total Worked</p>
                                                            <p className="text-xl font-black text-stone-900 mt-0.5 tracking-tight">{summary.total_worked_hours} <span className="text-xs font-semibold text-stone-500">hrs</span></p>
                                                            <p className="text-[10px] text-stone-500 font-medium mt-0.5">{summary.total_sessions} shifts recorded</p>
                                                        </div>
                                                        <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Overtime</p>
                                                            <p className="text-xl font-black text-emerald-950 mt-0.5 tracking-tight">{summary.overtime_hours} <span className="text-xs font-semibold text-emerald-700">hrs</span></p>
                                                            <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Approved OT</p>
                                                        </div>
                                                        <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Undertime / Tardy</p>
                                                            <p className="text-xl font-black text-amber-950 mt-0.5 tracking-tight">{summary.undertime_hours} <span className="text-xs font-semibold text-amber-800">hrs</span></p>
                                                            <p className="text-[10px] text-amber-700 font-medium mt-0.5">Short of schedule</p>
                                                        </div>
                                                        <div className="p-3.5 bg-clay-50/50 rounded-2xl border border-clay-100">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-clay-800">Rest Day OT</p>
                                                            <p className="text-xl font-black text-clay-950 mt-0.5 tracking-tight">{summary.rest_day_ot_hours} <span className="text-xs font-semibold text-clay-800">hrs</span></p>
                                                            <p className="text-[10px] text-clay-700 font-medium mt-0.5">Special day shifts</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* ── TIME CARDS LOG TIMELINE ── */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
                                                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                                                            Shift Logs &amp; Audit Records
                                                        </h4>
                                                        <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                                                            {summary.sessions.length} Sessions
                                                        </span>
                                                    </div>

                                                    {summary.sessions.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {summary.sessions.map((session) => {
                                                                const isRejected = session.approval_status === 'rejected';
                                                                const isPending = session.approval_status === 'pending' || session.is_flagged;
                                                                const isApproved = session.approval_status === 'approved' && !session.is_flagged;

                                                                return (
                                                                    <div
                                                                        key={session.id}
                                                                        className={`p-4 rounded-2xl border transition-all duration-200 space-y-3 ${
                                                                            isRejected
                                                                                ? 'border-rose-200 bg-rose-50/40'
                                                                                : isPending
                                                                                ? 'border-amber-200 bg-amber-50/30 shadow-xs'
                                                                                : 'border-stone-200/80 bg-white hover:border-stone-300 shadow-xs'
                                                                        }`}
                                                                    >
                                                                        {/* Top Row: Date, Selfie Avatar, Worked Hours */}
                                                                        <div className="flex items-start justify-between gap-3">
                                                                            <div className="flex items-center gap-3">
                                                                                {session.photo_url ? (
                                                                                    <div className="relative group shrink-0" onClick={() => setSelectedPhoto(session.photo_url)}>
                                                                                        <img
                                                                                            src={session.photo_url}
                                                                                            alt="Selfie proof"
                                                                                            className="h-11 w-11 rounded-xl object-cover border border-stone-200 cursor-pointer shadow-xs group-hover:opacity-85 transition"
                                                                                        />
                                                                                        <div className="absolute inset-0 rounded-xl bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                                                                                            <Eye size={14} />
                                                                                        </div>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="h-11 w-11 rounded-xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-400 shrink-0">
                                                                                        <Clock size={18} />
                                                                                    </div>
                                                                                )}

                                                                                <div>
                                                                                    <p className="font-bold text-stone-900 text-xs tracking-tight">{session.date}</p>
                                                                                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                                                                                        {session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} - {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active Shift'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>

                                                                            <div className="text-right shrink-0">
                                                                                <span className="font-black text-stone-900 text-sm tracking-tight block">{session.worked_hours_label}</span>
                                                                                {session.close_mode === 'paused' && (
                                                                                    <span className="inline-block text-[9px] font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.5 rounded mt-0.5">Auto-Paused</span>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                            {/* Middle Row: Geofence, Shift Policy & Audit Badges */}
                                                                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-stone-200/50">
                                                                                {session.liveness_verified && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                                                                                        <CheckCircle2 size={10} /> 3D Liveness Verified
                                                                                    </span>
                                                                                )}

                                                                                {session.is_late && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full">
                                                                                        <Clock size={10} /> Late (+{session.late_minutes}m)
                                                                                    </span>
                                                                                )}

                                                                                {session.is_early_departure && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-800 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-full" title={session.early_departure_reason}>
                                                                                        <Clock size={10} /> Early Exit: {session.early_departure_reason || 'Undertime'}
                                                                                    </span>
                                                                                )}

                                                                                {session.is_extended_break && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full">
                                                                                        <PauseCircle size={10} /> Extended Break ({session.total_break_minutes}m)
                                                                                    </span>
                                                                                )}

                                                                                {session.distance_meters !== null && (
                                                                                    session.is_within_geofence ? (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200/70 px-2 py-0.5 rounded-full">
                                                                                            <MapPin size={10} /> Verified On-Site ({session.distance_meters}m)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-800 bg-rose-100/80 border border-rose-200 px-2 py-0.5 rounded-full">
                                                                                            <ShieldAlert size={10} /> Off-Site Clock-In ({session.distance_meters}m)
                                                                                        </span>
                                                                                    )
                                                                                )}

                                                                                {/* Approval Badges */}
                                                                                {isApproved && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                                                        <CheckCircle2 size={10} /> Approved
                                                                                    </span>
                                                                                )}
                                                                                {isPending && !isRejected && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-800 bg-amber-100/90 border border-amber-200 px-2 py-0.5 rounded-full">
                                                                                        <AlertCircle size={10} /> Pending Review
                                                                                    </span>
                                                                                )}
                                                                                {isRejected && (
                                                                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-800 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
                                                                                        <Ban size={10} /> Rejected
                                                                                    </span>
                                                                                )}
                                                                            </div>

                                                                        {/* Bottom Row: Manager Audit Control Actions */}
                                                                        {canEdit && (session.is_flagged || session.approval_status === 'pending') && !isRejected && (
                                                                            <div className="flex items-center justify-between pt-2 border-t border-stone-200/50">
                                                                                <p className="text-[10px] text-amber-800 font-semibold">Requires Manager Action</p>
                                                                                <div className="flex items-center gap-2">
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={submittingActionId === session.id}
                                                                                        onClick={() => handleApproveSession(session.id)}
                                                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-1 rounded-xl shadow-xs transition disabled:opacity-50 min-h-[30px]"
                                                                                    >
                                                                                        {submittingActionId === session.id ? (
                                                                                            <span className="animate-spin text-white">...</span>
                                                                                        ) : (
                                                                                            <>
                                                                                                <Check size={12} /> Approve
                                                                                            </>
                                                                                        )}
                                                                                    </button>
                                                                                    <button
                                                                                        type="button"
                                                                                        disabled={submittingActionId === session.id}
                                                                                        onClick={() => {
                                                                                            setRejectingSessionId(session.id);
                                                                                            setRejectionReason('');
                                                                                        }}
                                                                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-100/80 hover:bg-rose-200/80 border border-rose-200 px-3 py-1 rounded-xl transition disabled:opacity-50 min-h-[30px]"
                                                                                    >
                                                                                        <Ban size={12} /> Reject
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <div className="p-8 bg-stone-50 rounded-2xl border border-stone-200/70 text-center text-stone-400 text-xs font-medium">
                                                            No attendance sessions recorded for this employee.
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : null}
                                    </div>

                                    {/* ── HIGH-RES PHOTO PROOF PREVIEW MODAL ── */}
                                    {selectedPhoto && (
                                        <div
                                            className="fixed inset-0 z-60 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                                            onClick={() => setSelectedPhoto(null)}
                                        >
                                            <div className="bg-white rounded-3xl p-4 max-w-sm w-full space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                                                    <span className="text-xs font-bold text-stone-900">Attendance Selfie Verification Proof</span>
                                                    <button type="button" onClick={() => setSelectedPhoto(null)} className="text-stone-400 hover:text-stone-700 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <img src={selectedPhoto} alt="Clock-in selfie proof" className="w-full rounded-2xl object-cover border border-stone-200 max-h-[380px] shadow-xs" />
                                            </div>
                                        </div>
                                    )}

                                    {/* ── MANAGER REJECTION MODAL ── */}
                                    {rejectingSessionId && (
                                        <div
                                            className="fixed inset-0 z-60 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-4"
                                            onClick={() => setRejectingSessionId(null)}
                                        >
                                            <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                                                    <h3 className="text-sm font-bold text-stone-900">Reject Attendance Session</h3>
                                                    <button type="button" onClick={() => setRejectingSessionId(null)} className="text-stone-400 hover:text-stone-700 p-1">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                                                    Rejecting this session will exclude its logged worked hours from payroll calculations.
                                                </p>
                                                <div>
                                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                                                        Rejection Reason (Optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={rejectionReason}
                                                        onChange={(e) => setRejectionReason(e.target.value)}
                                                        placeholder="e.g. Unverified off-site clock-in"
                                                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2.5 text-xs text-stone-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-xs"
                                                    />
                                                </div>
                                                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRejectingSessionId(null)}
                                                        className="px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={submittingActionId === rejectingSessionId}
                                                        onClick={handleRejectSession}
                                                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition shadow-xs disabled:opacity-50"
                                                    >
                                                        Confirm Rejection
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}


import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Clock, Calendar, X, AlertCircle, CheckCircle2, PauseCircle } from 'lucide-react';

export default function EmployeeAttendanceDrawer({ employee, isOpen, onClose }) {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        if (isOpen && employee?.id) {
            setLoading(true);
            window.axios
                .get(route('hr.attendance-logs', { employee: employee.id }))
                .then((res) => {
                    setSummary(res.data.summary);
                })
                .catch((err) => console.error('Failed to load employee attendance logs:', err))
                .finally(() => setLoading(false));
        }
    }, [isOpen, employee?.id]);

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
                    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs transition-opacity" />
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
                                    {/* Header */}
                                    <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/40">
                                        <div>
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-stone-400">
                                                Time-Card Audit Drawer
                                            </span>
                                            <Dialog.Title className="text-lg font-black text-stone-900 tracking-tight">
                                                {employee.name}
                                            </Dialog.Title>
                                            <p className="text-xs text-stone-500 font-medium">{employee.role || 'Staff Member'}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                        {loading ? (
                                            <div className="py-16 text-center text-stone-400 text-xs font-semibold animate-pulse">
                                                Loading attendance sessions...
                                            </div>
                                        ) : summary ? (
                                            <>
                                                {/* Metric Summary Grid */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/60">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400">Worked Hours</p>
                                                        <p className="text-lg font-black text-stone-900 mt-1">{summary.total_worked_hours} hrs</p>
                                                        <p className="text-[10px] text-stone-500 font-medium mt-0.5">{summary.total_sessions} shifts logged</p>
                                                    </div>
                                                    <div className="p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Overtime Logged</p>
                                                        <p className="text-lg font-black text-emerald-900 mt-1">{summary.overtime_hours} hrs</p>
                                                        <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Calculated over 8h</p>
                                                    </div>
                                                    <div className="p-3.5 bg-amber-50/40 rounded-2xl border border-amber-100">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-amber-700">Undertime / Tardy</p>
                                                        <p className="text-lg font-black text-amber-900 mt-1">{summary.undertime_hours} hrs</p>
                                                        <p className="text-[10px] text-amber-700 font-medium mt-0.5">Short of 8h standard</p>
                                                    </div>
                                                    <div className="p-3.5 bg-clay-50/40 rounded-2xl border border-clay-100">
                                                        <p className="text-[9px] font-bold uppercase tracking-wider text-clay-700">Rest Day OT</p>
                                                        <p className="text-lg font-black text-clay-900 mt-1">{summary.rest_day_ot_hours} hrs</p>
                                                        <p className="text-[10px] text-clay-700 font-medium mt-0.5">Sunday shifts</p>
                                                    </div>
                                                </div>

                                                {/* Time Cards Log Table */}
                                                <div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-stone-500 mb-3 border-b border-stone-100 pb-2">
                                                        Logged Attendance Sessions
                                                    </h4>

                                                    {summary.sessions.length > 0 ? (
                                                        <div className="space-y-2.5">
                                                            {summary.sessions.map((session) => (
                                                                <div
                                                                    key={session.id}
                                                                    className="p-3 bg-white rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between gap-3 text-xs"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {session.photo_url ? (
                                                                            <img
                                                                                src={session.photo_url}
                                                                                alt="Selfie proof"
                                                                                className="h-10 w-10 rounded-lg object-cover border border-stone-200 shrink-0 cursor-pointer hover:opacity-90 transition"
                                                                                onClick={() => setSelectedPhoto(session.photo_url)}
                                                                            />
                                                                        ) : (
                                                                            <div className="h-10 w-10 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                                                                                <Clock size={16} />
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <p className="font-bold text-stone-900">{session.date}</p>
                                                                            <p className="text-[10px] text-stone-500 font-medium">
                                                                                {session.clock_in_at ? new Date(session.clock_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'} - {session.clock_out_at ? new Date(session.clock_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                                                                            </p>
                                                                            {session.distance_meters !== null && (
                                                                                <div className="mt-1">
                                                                                    {session.is_within_geofence ? (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                                                            Within Geofence ({session.distance_meters}m)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                                                                            Off-Site Warning ({session.distance_meters}m)
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>

                                                                    <div className="text-right">
                                                                        <span className="font-black text-stone-900 block">{session.worked_hours_label}</span>
                                                                        {session.close_mode === 'paused' && (
                                                                            <span className="block text-[9px] font-bold text-amber-600">Auto-Paused</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/60 text-center text-stone-400 text-xs">
                                                            No attendance sessions recorded for this date range.
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : null}
                                    </div>

                                    {/* High-Res Photo Proof Preview Modal */}
                                    {selectedPhoto && (
                                        <div
                                            className="fixed inset-0 z-60 bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4"
                                            onClick={() => setSelectedPhoto(null)}
                                        >
                                            <div className="bg-white rounded-2xl p-3 max-w-sm w-full space-y-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                                                    <span className="text-xs font-bold text-stone-900">Attendance Selfie Proof</span>
                                                    <button type="button" onClick={() => setSelectedPhoto(null)} className="text-stone-400 hover:text-stone-700">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                                <img src={selectedPhoto} alt="Clock-in selfie proof" className="w-full rounded-xl object-cover border border-stone-200 max-h-[360px]" />
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

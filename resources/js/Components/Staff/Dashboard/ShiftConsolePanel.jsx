import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Calendar, ArrowRight, ShieldCheck, MessageSquare, Check } from 'lucide-react';
import StaffClockInModal from '@/Components/Staff/Dashboard/StaffClockInModal';

export default function ShiftConsolePanel({
    hasActiveSession,
    attendance,
    sellerSidebar,
    hub
}) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const visibleModules = sellerSidebar?.visibleModules || hub?.visibleModules || [];
    const highlights = hub?.highlights || [];
    const teamMessagesRoute = hub?.teamMessagesRoute || 'team.messages';

    return (
        <div className="hidden xl:grid gap-6 xl:grid-cols-1">
            {/* Shift Console & Attendance */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-clay-600" />
                        <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">Shift Console</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            {hasActiveSession && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${hasActiveSession ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider ${hasActiveSession ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {hasActiveSession ? 'Clocked In' : 'Clocked Out'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {hasActiveSession ? (
                        <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                            <div>
                                <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800">Shift in Progress</p>
                                <p className="text-xs font-bold text-emerald-950 mt-0.5">
                                    {attendance?.worked_hours_label ? `${attendance.worked_hours_label} Logged Today` : 'Clocked In & Active'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-full bg-emerald-100/80 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                <span className="text-[9px] font-black uppercase text-emerald-800">Active</span>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-stone-50/80 border border-stone-200/80 rounded-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Shift Status</p>
                            <p className="text-xs font-extrabold text-stone-800 mt-0.5">Clocked Out (Off Duty)</p>
                        </div>
                    )}

                    {/* Workshop Schedule & Lunch Break Policy */}
                    {attendance?.shift_policy && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/70 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                                    Workshop Schedule
                                </span>
                                <span className="text-[10px] font-bold text-amber-800 font-mono">
                                    {attendance.shift_policy.shift_start_time || '08:00'} - {attendance.shift_policy.shift_end_time || '17:00'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium pt-1 border-t border-amber-200/60">
                                <span>Earliest Entry</span>
                                <span className="font-bold text-stone-800 font-mono">
                                    {attendance.shift_policy.earliest_clock_in_minutes ?? 30}m before shift
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium pt-1 border-t border-amber-200/60">
                                <span>Lunch Break</span>
                                <span className="font-bold text-stone-800 font-mono">
                                    {attendance.shift_policy.break_window_start || '11:30'} - {attendance.shift_policy.break_window_end || '13:30'} ({attendance.shift_policy.break_allowance_minutes || 60}m)
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Module Privileges Cloud */}
                    <div className="pt-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 mb-2.5">Assigned Modules</p>
                        {hasActiveSession && visibleModules.length > 0 ? (
                            <div className="flex overflow-x-auto xl:flex-wrap xl:overflow-x-visible gap-1.5 pb-1 scrollbar-none snap-x">
                                {visibleModules.map((module) => (
                                    <span
                                        key={module}
                                        className="rounded-xl border border-stone-200 bg-stone-50/80 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-stone-700 shrink-0 snap-start shadow-2xs"
                                    >
                                        {module.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[11px] text-stone-400 font-medium">Your assigned workspace tools will appear here when you clock in.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Operational Guidelines Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs space-y-4">
                <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clay-600">
                        Operational Focus
                    </p>
                    <h4 className="mt-1 text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-3">
                        Daily Operational Guidelines
                    </h4>
                </div>

                <div className="space-y-3">
                    {highlights.map((item) => (
                        <div key={item} className="flex gap-3 items-start group">
                            <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-lg bg-clay-50 text-clay-700 border border-clay-200/60 transition-colors duration-200 group-hover:bg-clay-600 group-hover:text-white">
                                <Check size={11} strokeWidth={3} />
                            </span>
                            <p className="text-xs font-medium leading-relaxed text-stone-600 group-hover:text-stone-900 transition-colors duration-200">{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Direct Messaging Card */}
            {hasActiveSession && (
                <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs flex flex-col justify-between space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <MessageSquare size={15} className="text-clay-600" />
                            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-stone-400">
                                Staff Network
                            </p>
                        </div>
                        <h3 className="text-sm font-extrabold text-stone-900">
                            Team Direct Messaging
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-stone-500 font-medium">
                            Communicate instantly with shop owners and team members.
                        </p>
                    </div>
                    <Link
                        href={route(teamMessagesRoute)}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-stone-200 bg-stone-50/90 hover:bg-stone-100 px-4 py-3 text-xs font-extrabold text-stone-900 transition active:scale-[0.98] shadow-2xs"
                    >
                        <span>Access Team Inbox</span>
                        <ArrowRight size={14} className="text-stone-500" />
                    </Link>
                </div>
            )}

            <StaffClockInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}

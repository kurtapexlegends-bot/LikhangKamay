import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Calendar, ArrowRight } from 'lucide-react';
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

    // If clocked out, return null so the hero gateway card takes full clean focus
    if (!hasActiveSession) {
        return null;
    }

    return (
        <div className="hidden xl:grid gap-6 xl:grid-cols-1">
            {/* Shift Console & Attendance */}
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-stone-400" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-stone-500">Shift Desk</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                            Clocked In
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="p-3.5 bg-emerald-50/30 border border-emerald-100/80 rounded-2xl flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Active Shift Session</p>
                            <p className="text-xs font-bold text-[#1e3d2f] mt-0.5">
                                {attendance?.worked_hours_label ? `${attendance.worked_hours_label} Logged Today` : 'Shift Active & Tracked'}
                            </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-700">Live</span>
                        </div>
                    </div>

                    {/* Module Privileges Cloud */}
                    <div className="pt-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-2">Workspace Privileges</p>
                        {visibleModules.length > 0 ? (
                            <div className="flex overflow-x-auto xl:flex-wrap xl:overflow-x-visible gap-1.5 pb-1.5 scrollbar-none snap-x">
                                {visibleModules.map((module) => (
                                    <span
                                        key={module}
                                        className="rounded-lg border border-stone-200 bg-stone-50/60 px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-stone-600 shrink-0 snap-start"
                                    >
                                        {module.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[11px] text-stone-400 font-medium">Privileges active for your assigned modules.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Reminders & Highlights */}
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                    Operational Reminders
                </p>
                <h4 className="mt-1.5 text-sm font-bold text-stone-900 border-b border-stone-100 pb-2.5">
                    Daily Focus Guidelines
                </h4>

                <div className="mt-4 space-y-3.5">
                    {highlights.map((item) => (
                        <div key={item} className="flex gap-3 items-start group">
                            <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md bg-clay-50 text-clay-600 border border-clay-100/50 transition-colors duration-300 group-hover:bg-clay-100 group-hover:text-clay-700">
                                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </span>
                            <p className="text-xs font-medium leading-relaxed text-stone-600 group-hover:text-stone-850 transition-colors duration-300">{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Team Messaging Card - ONLY rendered when active shift is live */}
            <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                        Staff Network
                    </p>
                    <h3 className="mt-1 text-sm font-bold tracking-tight text-stone-900">
                        Direct Messaging
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                        Communicate securely with the shop owner and team.
                    </p>
                </div>
                <Link
                    href={route(teamMessagesRoute)}
                    className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/80 hover:bg-stone-100 px-3.5 py-2.5 text-xs font-bold text-stone-800 transition active:scale-[0.98]"
                >
                    Access Team Inbox
                    <ArrowRight size={14} className="text-stone-500" />
                </Link>
            </div>

            <StaffClockInModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
    );
}

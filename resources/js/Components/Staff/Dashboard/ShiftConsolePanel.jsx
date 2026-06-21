import React from 'react';
import { Link } from '@inertiajs/react';
import { Calendar, ArrowRight } from 'lucide-react';

export default function ShiftConsolePanel({
    hasActiveSession,
    attendance,
    sellerSidebar,
    hub
}) {
    const visibleModules = sellerSidebar?.visibleModules || hub?.visibleModules || [];
    const highlights = hub?.highlights || [];
    const teamMessagesRoute = hub?.teamMessagesRoute || 'team.messages';

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
                            {hasActiveSession && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${hasActiveSession ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                            {hasActiveSession ? 'Clocked In' : 'Clocked Out'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {hasActiveSession ? (
                        <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3">
                            <div>
                                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600">Session Status</p>
                                <p className="text-xs font-bold text-[#1e3d2f] mt-0.5">Shift Active & Tracked</p>
                            </div>
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                    ) : (
                        <div className="p-3 bg-amber-50/30 border border-amber-100 rounded-2xl">
                            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-600">Action Required</p>
                            <p className="text-xs font-bold text-[#4c311c] mt-0.5">Please clock in to start your shift.</p>
                        </div>
                    )}

                    {/* Module Privileges Cloud */}
                    <div className="pt-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-stone-400 mb-2">Workspace Privileges</p>
                        {hasActiveSession && visibleModules.length > 0 ? (
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
                            <p className="text-[11px] text-stone-400 font-medium">Privileges will list here after clocking in.</p>
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

            {/* Refined Team Messaging card */}
            <div className="group/msg flex flex-col justify-between rounded-[2rem] border border-[#23352b] bg-gradient-to-br from-stone-900 via-stone-950 to-[#0e1a14] p-6 shadow-sm md:col-span-2 xl:col-span-1 overflow-hidden relative">
                <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-emerald-500/10 opacity-30 blur-2xl pointer-events-none" />
                <div className="relative z-10">
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                        Staff Network
                    </p>
                    <h3 className="mt-1.5 text-base font-bold tracking-tight text-white">
                        Direct Messaging
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-emerald-100/60">
                        Communicate securely with the shop owner and other active staff members.
                    </p>
                </div>
                <Link
                    href={route(teamMessagesRoute)}
                    className="relative z-10 mt-6 flex items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-bold text-white transition hover:border-emerald-500/50 hover:bg-emerald-500/20 active:scale-95 duration-300"
                >
                    Access Team Inbox
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 transition-transform duration-300 group-hover/msg:translate-x-1">
                        <ArrowRight size={10} className="text-emerald-800" />
                    </div>
                </Link>
            </div>
        </div>
    );
}

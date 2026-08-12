import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    Calendar,
    ArrowRight,
    ShieldCheck,
    MessageSquare,
    Check,
    Clock,
    PauseCircle,
    PlayCircle,
    LogOut,
    ExternalLink,
    Package,
    ShoppingCart,
    Users,
    BarChart3,
    Box,
    Settings,
    Layers,
    Boxes,
    FileText,
    Sparkles
} from 'lucide-react';
import StaffLogoutModal from '@/Components/StaffLogoutModal';

const MODULE_META = {
    overview: { label: 'Overview', icon: Layers, route: 'staff.dashboard', color: 'text-stone-700 bg-stone-100' },
    products: { label: 'Products', icon: Package, route: 'products.index', color: 'text-amber-700 bg-amber-50 border-amber-200' },
    analytics: { label: 'Analytics', icon: BarChart3, route: 'analytics.index', color: 'text-sky-700 bg-sky-50 border-sky-200' },
    '3d': { label: '3D Studio', icon: Sparkles, route: '3d.index', color: 'text-purple-700 bg-purple-50 border-purple-200' },
    orders: { label: 'Orders', icon: ShoppingCart, route: 'orders.index', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    messages: { label: 'Buyer Inbox', icon: MessageSquare, route: 'messages.index', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    team_messages: { label: 'Team Inbox', icon: Users, route: 'team.messages', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
    reviews: { label: 'Reviews', icon: FileText, route: 'reviews.index', color: 'text-rose-700 bg-rose-50 border-rose-200' },
    shop_settings: { label: 'Shop Settings', icon: Settings, route: 'shop.settings', color: 'text-stone-700 bg-stone-100 border-stone-200' },
    hr: { label: 'People & Payroll', icon: Users, route: 'hr.index', color: 'text-amber-800 bg-amber-100/60 border-amber-300' },
    accounting: { label: 'Finance Review', icon: FileText, route: 'accounting.index', color: 'text-emerald-800 bg-emerald-100/60 border-emerald-300' },
    procurement: { label: 'Inventory & Supplies', icon: Box, route: 'procurement.index', color: 'text-teal-700 bg-teal-50 border-teal-200' },
    stock_requests: { label: 'Restock Requests', icon: Boxes, route: 'stock_requests.index', color: 'text-orange-700 bg-orange-50 border-orange-200' },
};

const formatDuration = (startedAt, currentTimestamp) => {
    if (!startedAt) return null;
    const startedAtMs = new Date(startedAt).getTime();
    if (Number.isNaN(startedAtMs)) return null;

    const totalSeconds = Math.max(0, Math.floor((currentTimestamp - startedAtMs) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num) => String(num).padStart(2, '0');
    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    return `${minutes}m ${pad(seconds)}s`;
};

export default function ShiftConsolePanel({
    hasActiveSession,
    attendance,
    sellerSidebar,
    hub
}) {
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [timerNow, setTimerNow] = useState(() => Date.now());
    const [processingAction, setProcessingAction] = useState(null);

    const visibleModules = sellerSidebar?.visibleModules || hub?.visibleModules || [];
    const highlights = hub?.highlights || [];
    const teamMessagesRoute = hub?.teamMessagesRoute || 'team.messages';
    const isPaused = attendance?.current_state === 'paused';

    useEffect(() => {
        const interval = window.setInterval(() => setTimerNow(Date.now()), 1000);
        return () => window.clearInterval(interval);
    }, []);

    const activeDuration = formatDuration(
        attendance?.active_session_started_at || attendance?.clock_in_at,
        timerNow
    );

    const breakDuration = isPaused && attendance?.break_started_at
        ? formatDuration(attendance.break_started_at, timerNow)
        : null;

    const handleBreakToggle = () => {
        if (processingAction) return;
        setProcessingAction('break');

        if (isPaused) {
            router.post(route('staff.attendance.resume'), {}, {
                preserveScroll: true,
                onFinish: () => setProcessingAction(null),
            });
        } else {
            router.post(route('staff.attendance.break'), {}, {
                preserveScroll: true,
                onFinish: () => setProcessingAction(null),
            });
        }
    };

    return (
        <div className="hidden xl:flex flex-col gap-5">
            {/* Shift Console & Live Controls Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-clay-100/80 text-clay-800 border border-clay-200/60 shadow-2xs">
                            <ShieldCheck size={14} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 leading-none">Shift Console</h3>
                            <p className="text-[10px] text-stone-400 font-medium mt-0.5">Live Attendance & Privileges</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-stone-50 border border-stone-200/70">
                        <span className="relative flex h-2 w-2">
                            {hasActiveSession && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${isPaused ? 'bg-amber-500' : hasActiveSession ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isPaused ? 'text-amber-800' : hasActiveSession ? 'text-emerald-800' : 'text-stone-600'}`}>
                            {isPaused ? 'On Break' : hasActiveSession ? 'Clocked In' : 'Off Duty'}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {hasActiveSession ? (
                        <div className={`p-4 rounded-2xl border transition-all ${
                            isPaused 
                                ? 'bg-amber-50/60 border-amber-200/80' 
                                : 'bg-emerald-50/50 border-emerald-200/80'
                        }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl border bg-white shadow-2xs ${
                                        isPaused ? 'text-amber-700 border-amber-200' : 'text-emerald-700 border-emerald-200'
                                    }`}>
                                        <Clock size={15} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500">
                                            {isPaused ? 'Break Duration' : 'Shift Duration'}
                                        </p>
                                        <p className="text-sm font-black text-stone-900 font-mono tracking-tight">
                                            {isPaused ? (breakDuration || '0m 00s') : (activeDuration || '0m 00s')}
                                        </p>
                                    </div>
                                </div>

                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    isPaused 
                                        ? 'bg-amber-100 text-amber-900 border-amber-200' 
                                        : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                                }`}>
                                    {isPaused ? 'Paused' : 'Verified'}
                                </span>
                            </div>

                            {/* Embedded Quick Shift Action Buttons */}
                            <div className="mt-3.5 pt-3 border-t border-stone-200/40 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={handleBreakToggle}
                                    disabled={!!processingAction}
                                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition active:scale-95 border ${
                                        isPaused
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-2xs'
                                            : 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200 shadow-2xs'
                                    }`}
                                >
                                    {isPaused ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
                                    <span>{isPaused ? 'Resume Work' : 'Take Break'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsLogoutModalOpen(true)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-950 text-xs font-extrabold border border-rose-200/80 transition active:scale-95 shadow-2xs"
                                >
                                    <LogOut size={13} className="text-rose-600" />
                                    <span>Clock Out</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-stone-50/80 border border-stone-200/80 rounded-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Shift Status</p>
                            <p className="text-xs font-extrabold text-stone-800 mt-0.5">Workspace Offline • Verification Required</p>
                        </div>
                    )}

                    {/* Granted Module Launch Shortcuts */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                                Permitted Launch Shortcuts
                            </p>
                            <span className="text-[10px] font-bold text-stone-500">
                                {visibleModules.length} Modules
                            </span>
                        </div>

                        {hasActiveSession && visibleModules.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2">
                                {visibleModules.map((moduleKey) => {
                                    const meta = MODULE_META[moduleKey] || {
                                        label: moduleKey.replace(/_/g, ' '),
                                        icon: ExternalLink,
                                        route: 'staff.dashboard',
                                        color: 'text-stone-700 bg-stone-50 border-stone-200',
                                    };
                                    const Icon = meta.icon;
                                    const canNavigate = meta.route && route().has(meta.route);

                                    return (
                                        <Link
                                            key={moduleKey}
                                            href={canNavigate ? route(meta.route) : route('staff.dashboard')}
                                            className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all duration-200 hover:shadow-2xs hover:-translate-y-0.5 ${meta.color}`}
                                        >
                                            <Icon size={14} className="shrink-0 transition-transform group-hover:scale-110" />
                                            <span className="text-[11px] font-bold truncate leading-tight">
                                                {meta.label}
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[11px] text-stone-400 font-medium leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                Permitted shortcuts will unlock automatically upon completing shift clock-in verification.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Operational Focus & Guidelines Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs space-y-4">
                <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-clay-600">
                        Operational Focus
                    </p>
                    <h4 className="mt-1 text-sm font-extrabold text-stone-900 border-b border-stone-100 pb-3">
                        Daily Focus Guidelines
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

            {/* Direct Messaging Staff Network Card */}
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

            <StaffLogoutModal open={isLogoutModalOpen} attendance={attendance} onClose={() => setIsLogoutModalOpen(false)} />
        </div>
    );
}

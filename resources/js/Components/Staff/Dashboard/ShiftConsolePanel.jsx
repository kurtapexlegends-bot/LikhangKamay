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
    Package,
    ShoppingCart,
    Users,
    BarChart3,
    Box,
    Settings,
    Layers,
    Boxes,
    FileText,
    Sparkles,
    ChevronRight
} from 'lucide-react';
import StaffLogoutModal from '@/Components/StaffLogoutModal';

const MODULE_META = {
    overview: { label: 'Overview', icon: Layers, route: 'staff.dashboard' },
    products: { label: 'Products', icon: Package, route: 'products.index' },
    analytics: { label: 'Analytics', icon: BarChart3, route: 'analytics.index' },
    '3d': { label: '3D Studio', icon: Sparkles, route: '3d.index' },
    orders: { label: 'Orders', icon: ShoppingCart, route: 'orders.index' },
    messages: { label: 'Buyer Inbox', icon: MessageSquare, route: 'messages.index' },
    team_messages: { label: 'Team Inbox', icon: Users, route: 'team.messages' },
    reviews: { label: 'Reviews', icon: FileText, route: 'reviews.index' },
    shop_settings: { label: 'Shop Settings', icon: Settings, route: 'shop.settings' },
    hr: { label: 'People & Payroll', icon: Users, route: 'hr.index' },
    accounting: { label: 'Finance Review', icon: FileText, route: 'accounting.index' },
    procurement: { label: 'Inventory & Supplies', icon: Box, route: 'procurement.index' },
    stock_requests: { label: 'Restock Requests', icon: Boxes, route: 'stock_requests.index' },
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
            {/* Shift Console Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-stone-100 text-stone-700 border border-stone-200/80">
                            <ShieldCheck size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-stone-900 tracking-tight">Shift Console</h3>
                            <p className="text-[10px] text-stone-500 font-medium">Session & Privileges</p>
                        </div>
                    </div>
                    
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isPaused 
                            ? 'bg-amber-50 text-amber-800 border-amber-200' 
                            : hasActiveSession 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-stone-50 text-stone-600 border border-stone-200'
                    }`}>
                        <span className="relative flex h-1.5 w-1.5">
                            {hasActiveSession && (
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                            )}
                            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isPaused ? 'bg-amber-500' : hasActiveSession ? 'bg-emerald-500' : 'bg-stone-400'}`}></span>
                        </span>
                        {isPaused ? 'On Break' : hasActiveSession ? 'Clocked In' : 'Off Duty'}
                    </span>
                </div>

                <div className="space-y-4">
                    {hasActiveSession ? (
                        <div className="p-4 rounded-2xl border border-stone-200/80 bg-stone-50/60">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 shadow-2xs">
                                        <Clock size={15} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                            {isPaused ? 'Break Duration' : 'Shift Duration'}
                                        </p>
                                        <p className="text-sm font-mono font-bold text-stone-900 tracking-tight">
                                            {isPaused ? (breakDuration || '0m 00s') : (activeDuration || '0m 00s')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Inline Shift Controls */}
                            <div className="mt-3.5 pt-3 border-t border-stone-200/60 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={handleBreakToggle}
                                    disabled={!!processingAction}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200 transition active:scale-95 shadow-2xs"
                                >
                                    {isPaused ? <PlayCircle size={13} className="text-emerald-600" /> : <PauseCircle size={13} className="text-amber-600" />}
                                    <span>{isPaused ? 'Resume' : 'Take Break'}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsLogoutModalOpen(true)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-stone-200 hover:border-rose-200 transition active:scale-95 shadow-2xs"
                                >
                                    <LogOut size={13} className="text-rose-600" />
                                    <span>Clock Out</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-stone-50/80 border border-stone-200/80 rounded-2xl">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">Shift Status</p>
                            <p className="text-xs font-bold text-stone-800 mt-0.5">Workspace Offline</p>
                        </div>
                    )}

                    {/* Granted Modules Shortcuts List */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                Active Module Access
                            </p>
                            <span className="text-[10px] font-semibold text-stone-400">
                                {visibleModules.length} Enabled
                            </span>
                        </div>

                        {hasActiveSession && visibleModules.length > 0 ? (
                            <div className="space-y-1">
                                {visibleModules.map((moduleKey) => {
                                    const meta = MODULE_META[moduleKey] || {
                                        label: moduleKey.replace(/_/g, ' '),
                                        icon: Layers,
                                        route: 'staff.dashboard',
                                    };
                                    const Icon = meta.icon;
                                    const canNavigate = meta.route && route().has(meta.route);

                                    return (
                                        <Link
                                            key={moduleKey}
                                            href={canNavigate ? route(meta.route) : route('staff.dashboard')}
                                            className="group flex items-center justify-between p-2.5 rounded-xl border border-stone-100 hover:border-stone-200 bg-stone-50/50 hover:bg-white text-stone-700 hover:text-stone-900 transition-all duration-150"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <Icon size={15} className="text-stone-500 group-hover:text-stone-800 transition-colors" />
                                                <span className="text-xs font-bold truncate">
                                                    {meta.label}
                                                </span>
                                            </div>
                                            <ChevronRight size={13} className="text-stone-400 group-hover:text-stone-700 transition-transform group-hover:translate-x-0.5" />
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-[11px] text-stone-500 font-medium leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200/60">
                                Module shortcuts list here once verified and clocked in.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Operational Guidelines Card */}
            <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-2xs space-y-3.5">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-clay-700">
                        Operational Focus
                    </p>
                    <h4 className="mt-0.5 text-xs font-bold text-stone-900 border-b border-stone-100 pb-2.5">
                        Daily Operational Guidelines
                    </h4>
                </div>

                <div className="space-y-2.5">
                    {highlights.map((item) => (
                        <div key={item} className="flex gap-2.5 items-start">
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md bg-clay-50 text-clay-700 border border-clay-200/60">
                                <Check size={10} strokeWidth={3} />
                            </span>
                            <p className="text-xs font-medium leading-relaxed text-stone-600">{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Direct Messaging Card */}
            {hasActiveSession && (
                <div className="rounded-3xl border border-stone-200/80 bg-white p-5 shadow-2xs flex flex-col justify-between space-y-3">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <MessageSquare size={14} className="text-clay-600" />
                            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                                Staff Network
                            </p>
                        </div>
                        <h3 className="text-xs font-bold text-stone-900">
                            Team Direct Messaging
                        </h3>
                    </div>
                    <Link
                        href={route(teamMessagesRoute)}
                        className="flex items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 px-3.5 py-2.5 text-xs font-bold text-stone-800 transition active:scale-[0.98]"
                    >
                        <span>Access Team Inbox</span>
                        <ArrowRight size={13} className="text-stone-500" />
                    </Link>
                </div>
            )}

            <StaffLogoutModal open={isLogoutModalOpen} attendance={attendance} onClose={() => setIsLogoutModalOpen(false)} />
        </div>
    );
}

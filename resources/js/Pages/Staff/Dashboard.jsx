import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import {
    ArrowRight,
    Briefcase,
    Calculator,
    ClipboardList,
    MessageSquareText,
    PackageSearch,
    PlayCircle,
    ShieldCheck,
    Users,
} from 'lucide-react';

const themeConfig = {
    clay: {
        banner: 'bg-stone-900 border border-stone-800',
        bannerIconRing: 'bg-clay-500/20 text-clay-400 ring-1 ring-clay-500/30',
        bannerEyebrow: 'text-clay-400',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-stone-400',
        cardGlow: 'group-hover:border-clay-200',
        statBorder: 'border-clay-100',
        statValue: 'text-clay-700',
        statBar: 'bg-clay-500',
        icon: Users,
    },
    emerald: {
        banner: 'bg-[#15231c] border border-[#1e3328]',
        bannerIconRing: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
        bannerEyebrow: 'text-emerald-400',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-emerald-100/50',
        cardGlow: 'group-hover:border-emerald-200',
        statBorder: 'border-emerald-100',
        statValue: 'text-emerald-700',
        statBar: 'bg-emerald-500',
        icon: Calculator,
    },
    amber: {
        banner: 'bg-[#2a1c12] border border-[#3f2716]',
        bannerIconRing: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
        bannerEyebrow: 'text-amber-500',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-amber-100/50',
        cardGlow: 'group-hover:border-amber-200',
        statBorder: 'border-amber-100',
        statValue: 'text-amber-700',
        statBar: 'bg-amber-500',
        icon: PackageSearch,
    },
    sky: {
        banner: 'bg-[#111e29] border border-[#1a2d3d]',
        bannerIconRing: 'bg-sky-500/20 text-sky-400 ring-1 ring-sky-500/30',
        bannerEyebrow: 'text-sky-400',
        bannerTitle: 'text-white',
        bannerSubtitle: 'text-sky-100/50',
        cardGlow: 'group-hover:border-sky-200',
        statBorder: 'border-sky-100',
        statValue: 'text-sky-700',
        statBar: 'bg-sky-500',
        icon: MessageSquareText,
    },
};

const toneChipMap = {
    clay: 'bg-[#FCF7F2] text-clay-700 border-[#E7D8C9]',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    sky: 'bg-sky-50 text-sky-700 border-sky-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    slate: 'bg-stone-50 text-stone-700 border-stone-200',
    red: 'bg-red-50 text-red-700 border-red-200',
};

const cardIconMap = {
    hr: Users,
    accounting: Calculator,
    procurement: PackageSearch,
    stock_requests: ClipboardList,
    orders: Briefcase,
    reviews: ShieldCheck,
    products: PackageSearch,
    analytics: Briefcase,
    team_messages: MessageSquareText,
};

function StatCard({ stat, theme }) {
    return (
        <div className={`rounded-[1.25rem] border bg-white px-5 py-4 transition hover:border-stone-300 ${theme.statBorder}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                {stat.label}
            </p>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${theme.statValue}`}>
                {stat.value}
            </p>
        </div>
    );
}

function ActionCard({ card, theme }) {
    const Icon = cardIconMap[card.module] || Briefcase;
    const tone = toneChipMap[card.tone] || toneChipMap.slate;

    return (
        <Link
            href={route(card.routeName)}
            className={`group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-5 transition duration-300 ${theme.cardGlow}`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-stone-100 bg-stone-50 text-stone-600 transition duration-300`}>
                    <Icon size={18} strokeWidth={2.5} />
                </div>
                <div className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${tone}`}>
                    {card.metricLabel}
                </div>
            </div>

            <div className="mt-5">
                <h3 className="text-[17px] font-bold text-gray-900">{card.title}</h3>
                <p className="mt-1.5 text-xs font-medium leading-5 text-stone-500">{card.description}</p>
            </div>

            <div className="mt-5 flex items-end justify-between gap-3 pt-4 border-t border-stone-50">
                <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">
                        {card.metricLabel}
                    </p>
                    <p className="mt-1 text-lg font-bold text-gray-900">{card.metricValue}</p>
                </div>
                
                {/* Minimal pill action reveal */}
                <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-50 border border-stone-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-500 opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:bg-gray-900 group-hover:text-white group-hover:border-gray-900">
                    Open <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
                </div>
            </div>
        </Link>
    );
}

export default function StaffDashboard({ auth, hub }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { sellerSidebar, attendance } = usePage().props;

    const theme = themeConfig[hub.theme] || themeConfig.sky;
    const BannerIcon = theme.icon;
    const hasActiveSession = !!attendance?.has_open_session;
    const isPaused = attendance?.current_state === 'paused';

    const emphasis = useMemo(() => {
        if (hub.variant === 'hr') return 'HR and payroll operations';
        if (hub.variant === 'accounting') return 'finance approvals and release checkpoints';
        if (hub.variant === 'procurement') return 'inventory coordination and stock flow';

        return 'orders, reviews, and internal team coordination';
    }, [hub.variant]);

    const resumeWork = () => {
        router.post(route('staff.attendance.resume'));
    };

    return (
        <div className="min-h-screen bg-[#FDFBF9] font-sans text-stone-800">
            <Head title={hub.title} />

            <SellerSidebar
                active="staff-dashboard"
                user={auth.user}
                mobileOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex min-h-screen flex-col lg:ml-56">
                <SellerHeader
                    title={hub.title}
                    subtitle={`Focused workspace for ${emphasis}.`}
                    auth={auth}
                    onMenuClick={() => setSidebarOpen(true)}
                    badge={{ label: hub.focus, iconColor: 'text-white' }}
                />

                <main className="flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
                    {/* Bespoke Dark Theme Banner */}
                    <section className={`relative overflow-hidden rounded-[2rem] ${theme.banner} p-6 sm:p-8`}>
                        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl">
                                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-[1rem] ${theme.bannerIconRing}`}>
                                    <BannerIcon size={22} strokeWidth={2.5} />
                                </div>
                                <p className={`mt-4 text-[10px] font-bold uppercase tracking-[0.24em] ${theme.bannerEyebrow}`}>
                                    {hub.eyebrow}
                                </p>
                                <h1 className={`mt-2 text-3xl font-bold tracking-tight sm:text-4xl ${theme.bannerTitle}`}>
                                    {hub.title}
                                </h1>
                                <p className={`mt-3 max-w-xl text-sm leading-6 ${theme.bannerSubtitle}`}>
                                    {hub.subtitle} Only your allowed tools are shown for {hub.sellerName}.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-md lg:min-w-[260px]">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                      {hasActiveSession && (
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      )}
                                      <span className={`relative inline-flex rounded-full h-2 w-2 ${hasActiveSession ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                                    </span>
                                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/60">
                                        {hasActiveSession ? 'Active Privileges' : 'Workspace Status'}
                                    </p>
                                </div>
                                {hasActiveSession ? (
                                    <div className="mt-1 flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        {(sellerSidebar?.visibleModules || hub.visibleModules || []).map((module) => (
                                            <span
                                                key={module}
                                                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white"
                                            >
                                                {module.replace(/_/g, ' ')}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm leading-6 text-white/75">
                                        {isPaused
                                            ? 'You are currently on break. Resume work to reopen your assigned modules.'
                                            : 'Clock in to open your assigned modules and start your workspace session.'}
                                    </p>
                                )}
                            </div>
                        </div>
                    </section>

                    {hasActiveSession ? (
                        <>
                            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {hub.stats.map((stat) => (
                                    <StatCard key={stat.label} stat={stat} theme={theme} />
                                ))}
                            </section>

                            <section className="grid gap-5 xl:grid-cols-[1.8fr,0.85fr] animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
                                    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between border-b border-stone-100 pb-4 mb-5">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                                                Directory
                                            </p>
                                            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">
                                                Open your modules
                                            </h2>
                                        </div>
                                        <p className="max-w-md text-sm font-medium leading-5 text-stone-500 sm:text-right">
                                            Only spaces explicitly assigned to your role are available.
                                        </p>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-2">
                                        {hub.cards.map((card) => (
                                            <ActionCard key={`${card.module}-${card.routeName}`} card={card} theme={theme} />
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
                                        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                                            Quick Notes
                                        </p>
                                        <h2 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900 border-b border-stone-100 pb-3">
                                            Keep workflows tight
                                        </h2>

                                        <div className="mt-4 space-y-3">
                                            {hub.highlights.map((item) => (
                                                <div key={item} className="flex gap-3 items-start group">
                                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay-400 transition group-hover:bg-clay-600"></span>
                                                    <p className="text-sm font-medium leading-relaxed text-stone-600">{item}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-between rounded-[2rem] border border-[#26332d] bg-[#1a231f] p-6">
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
                                                Team Messaging
                                            </p>
                                            <h3 className="mt-2 text-xl font-bold tracking-tight text-white">
                                                Coordinate directly
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">
                                                Use internal chats for staff synergy. Buyer order messages remain separated in the Inbox.
                                            </p>
                                        </div>
                                        <Link
                                            href={route(hub.teamMessagesRoute)}
                                            className="relative z-10 mt-6 flex items-center justify-between gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-bold text-white transition hover:border-emerald-500/50 hover:bg-emerald-500/20"
                                        >
                                            Access Team Inbox
                                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                                                <ArrowRight size={12} className="text-emerald-800" />
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </section>
                        </>
                    ) : (
                        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="rounded-[2rem] border border-stone-200 bg-white p-6">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                                    Workspace Access
                                </p>
                                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-gray-900">
                                    {isPaused ? 'You are currently on break.' : 'Clock in to start working.'}
                                </h2>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
                                    {isPaused
                                        ? 'Your assigned modules stay hidden while you are on break. Resume work when you are ready to continue.'
                                        : 'Only Workspace is available before attendance starts. Clock in to reveal your assigned modules and continue with your normal workflow.'}
                                </p>

                                <button
                                    type="button"
                                    onClick={resumeWork}
                                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-clay-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-clay-700"
                                >
                                    <PlayCircle size={16} />
                                    {isPaused ? 'Resume Work' : 'Clock In'}
                                </button>
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}

import React, { useMemo, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import SellerSidebar from '@/Components/SellerSidebar';
import SellerHeader from '@/Components/SellerHeader';
import {
    ArrowRight,
    Briefcase,
    Calculator,
    ClipboardList,
    MessageSquareText,
    PackageSearch,
    ShieldCheck,
    Users,
} from 'lucide-react';

const themeConfig = {
    clay: {
        banner: 'from-clay-600 via-clay-500 to-amber-500',
        statBorder: 'border-clay-100',
        statValue: 'text-clay-700',
        cardTone: 'bg-clay-50 text-clay-700',
        icon: Users,
    },
    emerald: {
        banner: 'from-emerald-700 via-emerald-600 to-teal-500',
        statBorder: 'border-emerald-100',
        statValue: 'text-emerald-700',
        cardTone: 'bg-emerald-50 text-emerald-700',
        icon: Calculator,
    },
    amber: {
        banner: 'from-amber-700 via-amber-600 to-orange-500',
        statBorder: 'border-amber-100',
        statValue: 'text-amber-700',
        cardTone: 'bg-amber-50 text-amber-700',
        icon: PackageSearch,
    },
    sky: {
        banner: 'from-sky-700 via-cyan-600 to-teal-500',
        statBorder: 'border-sky-100',
        statValue: 'text-sky-700',
        cardTone: 'bg-sky-50 text-sky-700',
        icon: MessageSquareText,
    },
};

const toneChipMap = {
    clay: 'bg-clay-50 text-clay-700 border-clay-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    sky: 'bg-sky-50 text-sky-700 border-sky-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    red: 'bg-red-50 text-red-700 border-red-100',
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
        <div className={`rounded-[1.35rem] border bg-white px-4 py-3.5 shadow-sm ${theme.statBorder}`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                {stat.label}
            </p>
            <p className={`mt-2 text-2xl font-bold tracking-tight ${theme.statValue}`}>
                {stat.value}
            </p>
        </div>
    );
}

function ActionCard({ card }) {
    const Icon = cardIconMap[card.module] || Briefcase;
    const tone = toneChipMap[card.tone] || toneChipMap.slate;

    return (
        <Link
            href={route(card.routeName)}
            className="group flex h-full flex-col rounded-[1.35rem] border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-3">
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                    <Icon size={18} />
                </div>
                <div className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone}`}>
                    {card.metricLabel}
                </div>
            </div>

            <div className="mt-4">
                <h3 className="text-base font-bold text-stone-900">{card.title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-stone-500">{card.description}</p>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                        {card.metricLabel}
                    </p>
                    <p className="mt-1.5 text-xl font-bold text-stone-900">{card.metricValue}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-clay-600">
                    Open <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                </span>
            </div>
        </Link>
    );
}

export default function StaffDashboard({ auth, hub }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { sellerSidebar } = usePage().props;

    const theme = themeConfig[hub.theme] || themeConfig.sky;
    const BannerIcon = theme.icon;

    const emphasis = useMemo(() => {
        if (hub.variant === 'hr') return 'HR and payroll operations';
        if (hub.variant === 'accounting') return 'finance approvals and release checkpoints';
        if (hub.variant === 'procurement') return 'inventory coordination and stock flow';

        return 'orders, reviews, and internal team coordination';
    }, [hub.variant]);

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

                <main className="flex-1 space-y-4 px-4 py-4 sm:px-6 lg:px-8">
                    <section className={`overflow-hidden rounded-[1.75rem] bg-gradient-to-br ${theme.banner} p-5 text-white shadow-[0_22px_55px_-38px_rgba(15,23,42,0.4)] sm:p-6`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white/15 ring-1 ring-white/25">
                                    <BannerIcon size={20} />
                                </div>
                                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70">
                                    {hub.eyebrow}
                                </p>
                                <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-[2rem]">
                                    {hub.title}
                                </h1>
                                <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">
                                    {hub.subtitle} Only your allowed tools are shown for {hub.sellerName}.
                                </p>
                            </div>

                            <div className="rounded-[1.35rem] border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm lg:max-w-sm">
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
                                    Enabled
                                </p>
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {(sellerSidebar?.visibleModules || hub.visibleModules || []).map((module) => (
                                        <span
                                            key={module}
                                            className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-bold capitalize text-white"
                                        >
                                            {module.replace(/_/g, ' ')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {hub.stats.map((stat) => (
                            <StatCard key={stat.label} stat={stat} theme={theme} />
                        ))}
                    </section>

                    <section className="grid gap-4 xl:grid-cols-[1.8fr,0.82fr]">
                        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                                        Priority Tools
                                    </p>
                                    <h2 className="mt-1.5 text-xl font-bold text-stone-900">
                                        Open the work queue
                                    </h2>
                                </div>
                                <p className="max-w-md text-sm leading-5 text-stone-500">
                                    Only assigned modules and the team inbox appear here.
                                </p>
                            </div>

                            <div className="mt-4 grid gap-3 lg:grid-cols-2">
                                {hub.cards.map((card) => (
                                    <ActionCard key={`${card.module}-${card.routeName}`} card={card} />
                                ))}
                            </div>
                        </div>

                        <div className="rounded-[1.75rem] border border-stone-200 bg-white p-5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                                Quick Notes
                            </p>
                            <h2 className="mt-1.5 text-xl font-bold text-stone-900">
                                Keep the workflow tight
                            </h2>

                            <div className="mt-4 space-y-3">
                                {hub.highlights.map((item) => (
                                    <div key={item} className="rounded-2xl border border-stone-200 bg-stone-50/80 p-3.5">
                                        <p className="text-sm leading-5 text-stone-600">{item}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3.5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">
                                    Team Messaging
                                </p>
                                <p className="mt-1.5 text-sm leading-5 text-emerald-800">
                                    Coordinate here. Buyer chat stays separate.
                                </p>
                                <Link
                                    href={route(hub.teamMessagesRoute)}
                                    className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-emerald-700"
                                >
                                    Open Team Inbox <ArrowRight size={16} />
                                </Link>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

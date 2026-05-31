import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { 
    Server, 
    Database, 
    Activity, 
    Mail, 
    Truck, 
    RefreshCw, 
    HardDrive, 
    ShieldAlert, 
    Cpu, 
    Trash2,
    Clock3, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight, 
    History,
    TrendingUp,
    Store,
    Award,
    Clock, 
    User as UserIcon, 
    Shield, 
    Calendar,
    Search,
    Filter,
    X,
    ChevronLeft,
    Palette,
    Globe,
    CreditCard
} from 'lucide-react';

export default function PlatformOperations({ 
    auth, 
    systemHealth, 
    queueStatus = {}, 
    memoryUsage, 
    peakMemoryUsage, 
    slaMetrics, 
    staleQueue = [], 
    activities, 
    filters = {}, 
    availableActions = [],
    defaultTab = 'health'
}) {
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState(defaultTab || 'health');

    // Sync tab with props
    useEffect(() => {
        if (defaultTab) {
            setActiveTab(defaultTab);
        }
    }, [defaultTab]);

    // Handle tab change and update URL parameter
    const handleTabChange = (tabName) => {
        setActiveTab(tabName);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabName);
        // Clean filters if switching away from logs
        if (tabName !== 'logs') {
            url.searchParams.delete('search');
            url.searchParams.delete('action_type');
            url.searchParams.delete('page');
        }
        window.history.replaceState(null, '', url.toString());
    };

    // ==========================================
    // TAB 1: SYSTEM HEALTH (DIAGNOSTICS) HANDLERS
    // ==========================================
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

    const handlePurgeCache = () => {
        setIsPurgeModalOpen(true);
    };

    const confirmPurge = () => {
        setIsPurgeModalOpen(false);
        router.post(route('admin.diagnostics.cache.purge'), {}, {
            preserveScroll: true,
            onSuccess: () => addToast('System cache purged successfully.', 'success'),
        });
    };

    const StatusLight = ({ status }) => {
        let colorClass = 'bg-stone-300';
        let glowClass = 'bg-stone-200';
        let pulseClass = '';
        
        if (status === 'Online' || status === 'Configured' || status === 'Secure') {
            colorClass = 'bg-emerald-500';
            glowClass = 'bg-emerald-500';
            pulseClass = 'animate-ping opacity-20';
        } else if (status === 'Offline' || status === 'Error' || status === 'Warning') {
            colorClass = 'bg-rose-500';
            glowClass = 'bg-rose-500';
            pulseClass = 'animate-pulse opacity-40';
        } else if (status === 'Unknown' || status === 'Unconfigured') {
            colorClass = 'bg-amber-400';
            glowClass = 'bg-amber-400';
        }

        return (
            <div className="relative flex items-center justify-center w-4 h-4">
                {pulseClass && (
                    <div className={`absolute w-full h-full rounded-full ${pulseClass} ${glowClass}`}></div>
                )}
                <div className={`absolute w-3 h-3 rounded-full opacity-20 blur-[2px] ${glowClass}`}></div>
                <div className={`relative w-2 h-2 rounded-full border border-white/20 shadow-sm ${colorClass}`}></div>
            </div>
        );
    };

    const DiagnosticCard = ({ title, icon: Icon, status, detail }) => (
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-start gap-4 transition-all hover:shadow-md hover:border-stone-300">
            <div className={`p-3 rounded-xl flex items-center justify-center shrink-0 ${status === 'Offline' || status === 'Warning' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-stone-50 text-stone-600 border border-stone-100'}`}>
                <Icon size={24} strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-stone-900 text-sm tracking-tight">{title}</h3>
                    <StatusLight status={status} />
                </div>
                <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{status}</p>
                    <p className="text-[10px] text-stone-500 font-medium truncate">{detail}</p>
                </div>
            </div>
        </div>
    );

    // ==========================================
    // TAB 2: SLA MONITORING CARDS
    // ==========================================
    const SLACard = ({ title, value, unit, subtitle, icon: Icon, compliance, color }) => (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 flex flex-col justify-between h-full group hover:shadow-xl hover:shadow-clay-500/5 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
                    <Icon className={color} size={24} />
                </div>
                {compliance !== undefined && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        compliance >= 95 ? 'bg-emerald-50 text-emerald-600' : 
                        compliance >= 80 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                    }`}>
                        {compliance}% Compliance
                    </div>
                )}
            </div>
            
            <div>
                <div className="flex items-baseline gap-1">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h2>
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{unit}</span>
                </div>
                <p className="text-xs font-bold text-gray-900 mt-1">{title}</p>
                <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-widest">{subtitle}</p>
            </div>
        </div>
    );

    // ==========================================
    // TAB 3: AUDIT LOGS STATE & HANDLERS
    // ==========================================
    const [search, setSearch] = useState(filters.search || '');
    const [actionType, setActionType] = useState(filters.action_type || '');
    const isInitialMount = useRef(true);

    const debounceRequest = useCallback((query, type) => {
        const timeoutId = setTimeout(() => {
            router.get(
                route('admin.operations'),
                { tab: 'logs', search: query, action_type: type },
                { preserveState: true, preserveScroll: true, replace: true }
            );
        }, 300);
        return () => clearTimeout(timeoutId);
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const cleanup = debounceRequest(search, actionType);
        return cleanup;
    }, [search, actionType, debounceRequest]);

    const clearFilters = () => {
        setSearch('');
        setActionType('');
        router.get(route('admin.operations'), { tab: 'logs' }, { preserveState: true, preserveScroll: true });
    };

    const getActionIcon = (action) => {
        if (action.includes('branding') || action.includes('color')) return Palette;
        if (action.includes('setting') || action.includes('config')) return Settings;
        if (action.includes('maintenance')) return ShieldAlert;
        if (action.includes('cache')) return Activity;
        if (action.includes('seo')) return Globe;
        if (action.includes('payment') || action.includes('gateway')) return CreditCard;
        return Shield;
    };

    const getActionColor = (action) => {
        if (action.includes('purged') || action.includes('deleted')) return 'text-amber-600 bg-amber-50 border-amber-100';
        if (action.includes('updated') || action.includes('changed')) return 'text-clay-600 bg-clay-50 border-clay-100';
        if (action.includes('enabled')) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (action.includes('disabled')) return 'text-rose-600 bg-rose-50 border-rose-100';
        return 'text-stone-600 bg-stone-50 border-stone-100';
    };

    return (
        <>
            <Head title="Platform Operations Control Center" />

            <div className="space-y-6">
                {/* --- TABS NAVIGATION --- */}
                <div className="border-b border-stone-200 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'health', label: 'System Health', icon: Activity },
                            { id: 'sla', label: 'SLA Exceptions', icon: Clock3, badge: staleQueue.length || null },
                            { id: 'logs', label: 'Audit Logs', icon: Shield, badge: (activities && activities.total) || null },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex items-center gap-2 border-b-2 pb-4 px-1 text-xs sm:text-sm font-bold transition-all whitespace-nowrap outline-none ${
                                        activeTab === tab.id
                                            ? 'border-clay-600 text-clay-700'
                                            : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-200'
                                    }`}
                                >
                                    <Icon size={16} />
                                    <span>{tab.label}</span>
                                    {tab.badge !== null && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                            activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-600'
                                        }`}>
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* --- TAB PANEL CONTENTS --- */}
                <div className="min-h-[50vh]">
                    <AnimatePresence mode="wait">
                        {activeTab === 'health' && (
                            <motion.div
                                key="health"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* Memory & Cache commands */}
                                <section>
                                    <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">System Memory</h2>
                                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-3xl"></div>
                                        
                                        <div className="relative z-10 flex items-start gap-4">
                                            <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl text-stone-600 shadow-sm hidden sm:flex">
                                                <Cpu size={24} strokeWidth={1.5} />
                                            </div>
                                            <div>
                                                <h3 className="text-base font-bold text-stone-900 tracking-tight leading-none mb-1.5">Application Cache</h3>
                                                <p className="text-xs font-medium text-stone-500 max-w-sm">
                                                    Monitor your application's RAM usage. If the system is unresponsive or caching old data, forcefully purge the cache below.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 flex flex-col sm:items-end w-full sm:w-auto gap-4 shrink-0">
                                            <div className="flex items-center gap-6 bg-stone-50 border border-stone-100 px-5 py-3 rounded-xl w-full sm:w-auto shadow-inner">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Current Usage</p>
                                                    <p className="text-base font-black text-stone-900 leading-none">{memoryUsage} <span className="text-[10px] font-bold text-stone-400">MB</span></p>
                                                </div>
                                                <div className="w-px h-6 bg-stone-200"></div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-0.5">Peak Usage</p>
                                                    <p className="text-base font-black text-stone-900 leading-none">{peakMemoryUsage} <span className="text-[10px] font-bold text-stone-400">MB</span></p>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={handlePurgeCache}
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:bg-stone-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-stone-900/20"
                                            >
                                                <RefreshCw size={12} /> Purge Application Cache
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* Queue status dashboard */}
                                <section>
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest">Background Job Intelligence</h2>
                                        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                                            <Activity size={12} className="text-stone-500" />
                                            <span className="text-[9px] font-black text-stone-600 uppercase tracking-wider">Real-time Monitor</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                                    <Mail size={18} />
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${queueStatus.emails > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {queueStatus.emails > 0 ? 'Processing' : 'Idle'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Queued Emails</p>
                                                <p className="text-xl font-black text-stone-900 leading-none">{queueStatus.emails}</p>
                                            </div>
                                            <div className="pt-3 border-t border-stone-50">
                                                <p className="text-[10px] text-stone-500 font-medium">Transactional Alerts</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                                    <RefreshCw size={18} />
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${queueStatus.reports > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {queueStatus.reports > 0 ? 'Generating' : 'Idle'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Report Generation</p>
                                                <p className="text-xl font-black text-stone-900 leading-none">{queueStatus.reports}</p>
                                            </div>
                                            <div className="pt-3 border-t border-stone-50">
                                                <p className="text-[10px] text-stone-500 font-medium">BI & Exports</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                                    <HardDrive size={18} />
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${queueStatus.images > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                    {queueStatus.images > 0 ? 'Optimizing' : 'Idle'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Image Processing</p>
                                                <p className="text-xl font-black text-stone-900 leading-none">{queueStatus.images}</p>
                                            </div>
                                            <div className="pt-3 border-t border-stone-50">
                                                <p className="text-[10px] text-stone-500 font-medium">Media Compression</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                                    <ShieldAlert size={18} />
                                                </div>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${queueStatus.failed_jobs > 0 ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>
                                                    {queueStatus.failed_jobs > 0 ? 'Attention' : 'Healthy'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Failed Jobs</p>
                                                <p className="text-xl font-black text-stone-900 leading-none">{queueStatus.failed_jobs}</p>
                                            </div>
                                            <div className="pt-3 border-t border-stone-50">
                                                <p className="text-[10px] text-stone-500 font-medium">Requires Retry</p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                                            <div className="flex items-center justify-between">
                                                <div className="p-2 bg-stone-50 text-stone-600 rounded-lg">
                                                    <Activity size={18} />
                                                </div>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                                                    Total
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest mb-1">Total Jobs</p>
                                                <p className="text-xl font-black text-stone-900 leading-none">{queueStatus.total_jobs}</p>
                                            </div>
                                            <div className="pt-3 border-t border-stone-50">
                                                <p className="text-[10px] text-stone-500 font-medium">Overall Queue Load</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Heartbeat API Checks */}
                                <section>
                                    <h2 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">External API Heartbeat</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                                        <DiagnosticCard 
                                            title="Database Connection" 
                                            icon={Database} 
                                            status={systemHealth.database} 
                                            detail="MySQL PDO socket" 
                                        />
                                        <DiagnosticCard 
                                            title="Redis Cache" 
                                            icon={HardDrive} 
                                            status={systemHealth.cache} 
                                            detail="In-memory store" 
                                        />
                                        <DiagnosticCard 
                                            title="PayMongo Gateway" 
                                            icon={Server} 
                                            status={systemHealth.paymongo} 
                                            detail="Payments API (v1)" 
                                        />
                                        <DiagnosticCard 
                                            title="Lalamove Logistics" 
                                            icon={Truck} 
                                            status={systemHealth.lalamove} 
                                            detail="Delivery API (Sandbox)" 
                                        />
                                        <DiagnosticCard 
                                            title="Mailtrap / SMTP" 
                                            icon={Mail} 
                                            status={systemHealth.smtp} 
                                            detail="Transactional Email" 
                                        />
                                        <DiagnosticCard 
                                            title="Environment Mode" 
                                            icon={ShieldAlert} 
                                            status={systemHealth.debug_mode ? 'Warning' : 'Secure'} 
                                            detail={systemHealth.debug_mode ? 'APP_DEBUG is TRUE' : 'Production Mode'} 
                                        />
                                    </div>
                                </section>

                                <ConfirmationModal
                                    isOpen={isPurgeModalOpen}
                                    onClose={() => setIsPurgeModalOpen(false)}
                                    onConfirm={confirmPurge}
                                    title="Purge Application Cache"
                                    message="Are you sure you want to purge the entire system cache? This may cause a temporary spike in database load until the cache is repopulated."
                                    icon={Trash2}
                                    iconBg="bg-rose-50 text-rose-600"
                                    confirmText="Purge Cache"
                                    confirmColor="bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-600/30"
                                />
                            </motion.div>
                        )}

                        {activeTab === 'sla' && (
                            <motion.div
                                key="sla"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {/* SLA Metric cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <SLACard 
                                        title="Artisan Approval" 
                                        value={slaMetrics.avgArtisanApprovalHours} 
                                        unit="Hrs"
                                        subtitle="Avg. Time to Approved"
                                        icon={Store}
                                        compliance={slaMetrics.artisanSLACompliance}
                                        color="text-clay-600"
                                    />
                                    <SLACard 
                                        title="Dispute Resolution" 
                                        value={slaMetrics.avgDisputeResolutionHours} 
                                        unit="Hrs"
                                        subtitle="Avg. Time to Resolved"
                                        icon={ShieldAlert}
                                        compliance={slaMetrics.disputeSLACompliance}
                                        color="text-indigo-600"
                                    />
                                    <SLACard 
                                        title="Sponsorship Approval" 
                                        value={slaMetrics.avgSponsorshipApprovalHours} 
                                        unit="Hrs"
                                        subtitle="Avg. Time to Approved"
                                        icon={Award}
                                        compliance={slaMetrics.sponsorshipSLACompliance}
                                        color="text-amber-600"
                                    />
                                    <SLACard 
                                        title="Total Stale Items" 
                                        value={slaMetrics.totalStaleItems} 
                                        unit="Items"
                                        subtitle="Pending > 48 Hours"
                                        icon={Clock3}
                                        color="text-red-600"
                                    />
                                </div>

                                {/* Table of Stale Items */}
                                <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                                    <div className="px-8 py-6 border-b border-gray-50 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900">Stale Action Queue</h3>
                                            <p className="text-xs text-gray-500 font-medium">Platform governance exceptions requiring immediate attention</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Updates</span>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#FAF9F5]">
                                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">SLA Status</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Item / Subject</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Shop Context</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Time Overdue</th>
                                                    <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {staleQueue.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="5" className="px-8 py-12 text-center">
                                                            <div className="flex flex-col items-center gap-3">
                                                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                                                                    <CheckCircle2 className="text-emerald-500" size={24} />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900">SLA Fully Compliant</p>
                                                                    <p className="text-xs text-gray-400">All pending applications and disputes are within safe limits.</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    staleQueue.map((item) => (
                                                        <tr key={`${item.type}-${item.id}`} className="group hover:bg-stone-50/50 transition-colors">
                                                            <td className="px-8 py-5">
                                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                                                    item.priority === 'Critical' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'
                                                                }`}>
                                                                    {item.priority}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs font-bold text-gray-900">{item.name}</span>
                                                                    <span className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{item.type}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <span className="text-xs font-medium text-gray-600 italic">
                                                                    {item.shop_name !== 'N/A' ? item.shop_name : '—'}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-5">
                                                                <div className="flex items-center gap-2">
                                                                    <Clock3 className="text-red-400" size={14} />
                                                                    <span className="text-xs font-mono font-bold text-red-600">
                                                                        +{item.hours_pending}h Overdue
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-5 text-right">
                                                                <Link 
                                                                    href={item.route}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-clay-600 hover:text-clay-700 transition-colors"
                                                                >
                                                                    Resolve Now <ChevronRight size={14} />
                                                                </Link>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Custom Charts & History */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-3xl border border-clay-100 p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h4 className="text-sm font-bold text-gray-900">SLA Trend Analysis</h4>
                                                <p className="text-[10px] text-gray-400 font-medium">Last 7 days performance volatility</p>
                                            </div>
                                            <TrendingUp className="text-emerald-500" size={18} />
                                        </div>
                                        <div className="h-32 flex items-end gap-2 pb-2">
                                            {[40, 65, 45, 90, 85, 30, 45].map((height, i) => (
                                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                                    <div 
                                                        className={`w-full rounded-t-lg ${i === 6 ? 'bg-clay-500' : 'bg-clay-100'}`} 
                                                        style={{ height: `${height}%` }} 
                                                    />
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-3xl border border-clay-100 p-8 flex flex-col justify-center text-center">
                                        <div className="mx-auto w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4 border border-stone-100">
                                            <History className="text-stone-400" size={24} />
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-900">Historical Benchmarking</h4>
                                        <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                                            The platform is currently operating at <strong className="text-gray-900">88%</strong> of its peak efficiency recorded in Q1 2026.
                                        </p>
                                        <button className="mt-6 text-[11px] font-bold text-clay-600 hover:underline">
                                            Export Compliance Audit Log
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'logs' && (
                            <motion.div
                                key="logs"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-6"
                            >
                                {/* Filter bar */}
                                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl border border-clay-100 shadow-sm">
                                    <div className="relative flex-1 w-full">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" size={16} />
                                        <input 
                                            type="text" 
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                            placeholder="Search by action, description or admin..."
                                            className="w-full pl-10 pr-4 py-2 bg-[#FAF9F5] border-none rounded-xl text-xs font-medium focus:ring-0 placeholder:text-stone-300"
                                        />
                                    </div>
                                    
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <select 
                                            value={actionType}
                                            onChange={(e) => setActionType(e.target.value)}
                                            className="bg-white border border-stone-100 rounded-xl text-[10px] font-black text-gray-600 hover:bg-[#FAF9F5] transition-all uppercase tracking-widest py-2 px-4 focus:ring-clay-500/20 focus:border-clay-500 outline-none"
                                        >
                                            <option value="">All Action Types</option>
                                            {availableActions.map(action => (
                                                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
                                            ))}
                                        </select>

                                        {(search || actionType) && (
                                            <button 
                                                onClick={clearFilters}
                                                className="p-2 bg-rose-50 text-rose-500 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all shrink-0"
                                                title="Clear Filters"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Activities Table */}
                                <div className="bg-white rounded-3xl border border-clay-100 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-[#FAF9F5] border-b border-stone-100">
                                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Event & Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Description</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest">Administrator</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-stone-400 uppercase tracking-widest text-right">Timestamp</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-stone-50">
                                                {activities && activities.data && activities.data.length > 0 ? (
                                                    activities.data.map((log) => {
                                                        const ActionIcon = getActionIcon(log.action);
                                                        const colorClasses = getActionColor(log.action);

                                                        return (
                                                            <tr key={log.id} className="hover:bg-stone-50/50 transition-all group">
                                                                <td className="px-6 py-5 align-top">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${colorClasses}`}>
                                                                            <ActionIcon size={14} />
                                                                        </div>
                                                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${colorClasses}`}>
                                                                            {log.action.split('_')[0]}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 align-top max-w-md">
                                                                    <p className="text-xs sm:text-sm font-bold text-gray-800 leading-snug mb-2">{log.description}</p>
                                                                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            {Object.entries(log.metadata).map(([key, value]) => (
                                                                                <div key={key} className="flex items-center gap-1.5 px-2 py-0.5 bg-stone-100 rounded-md border border-stone-200">
                                                                                    <span className="text-[8px] font-black text-stone-400 uppercase tracking-tighter">{key.replace(/_/g, ' ')}:</span>
                                                                                    <span className="text-[9px] font-bold text-stone-600">
                                                                                        {typeof value === 'boolean' ? (value ? 'YES' : 'NO') : String(value)}
                                                                                    </span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-5 align-top">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-8 h-8 rounded-lg bg-clay-50 border border-clay-100 overflow-hidden flex-shrink-0">
                                                                            {log.user.avatar ? (
                                                                                <img src={log.user.avatar} alt="" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center text-clay-300">
                                                                                    <UserIcon size={14} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-xs font-black text-gray-900 leading-none">{log.user.name}</p>
                                                                            <p className="text-[9px] font-bold text-clay-600 uppercase tracking-widest mt-1">{log.user.role.replace('_', ' ')}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-5 align-top text-right">
                                                                    <div className="inline-flex flex-col items-end gap-1">
                                                                        <div className="flex items-center gap-1.5 text-gray-900 font-bold text-xs leading-none">
                                                                            <Clock size={10} className="text-stone-400" />
                                                                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-stone-400 font-bold text-[9px] uppercase tracking-wider">
                                                                            <Calendar size={10} />
                                                                            {new Date(log.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    <tr>
                                                        <td colSpan="4" className="px-6 py-20 text-center">
                                                            <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-4 text-stone-200">
                                                                <Shield size={32} />
                                                            </div>
                                                            <h3 className="text-base font-bold text-gray-900">No activity logs found</h3>
                                                            <p className="text-xs text-gray-500 italic mt-1 text-stone-400">Governance events will appear here once recorded.</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {activities && activities.last_page > 1 && (
                                        <div className="bg-stone-50 px-6 py-4 border-t border-stone-100 flex items-center justify-between">
                                            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">
                                                Showing {activities.from} to {activities.to} of {activities.total}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                {activities.links.map((link, i) => (
                                                    <Link
                                                        key={i}
                                                        href={link.url || '#'}
                                                        preserveScroll
                                                        preserveState
                                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                                        className={`
                                                            px-3 py-1.5 rounded-lg text-[10px] font-black transition-all border uppercase tracking-widest
                                                            ${link.active 
                                                                ? 'bg-clay-600 text-white border-clay-600 shadow-md shadow-clay-600/20' 
                                                                : 'bg-white border-stone-100 text-gray-500 hover:text-clay-600'}
                                                            ${!link.url ? 'opacity-50 cursor-not-allowed' : ''}
                                                        `}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

PlatformOperations.layout = page => <AdminLayout title="Platform Operations">{page}</AdminLayout>;

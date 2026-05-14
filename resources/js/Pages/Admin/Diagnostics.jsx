import React from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Server, Database, Activity, Mail, Truck, RefreshCw, HardDrive, ShieldAlert, Cpu, Trash2 } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { useState } from 'react';

export default function Diagnostics({ systemHealth, queueStatus = {}, memoryUsage, peakMemoryUsage }) {
    const { addToast } = useToast();

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

    return (
        <>
            <Head title="System Diagnostics" />

            <div className="space-y-8">
                {/* --- MEMORY & CACHE COMMAND --- */}
                <section>
                    <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">System Memory</h2>
                    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-3xl"></div>
                        
                        <div className="relative z-10 flex items-start gap-4">
                            <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl text-stone-600 shadow-sm hidden sm:flex">
                                <Cpu size={24} strokeWidth={1.5} />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-stone-900 tracking-tight leading-none mb-1.5">Application Cache</h3>
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
                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all hover:bg-stone-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-stone-900/20"
                            >
                                <RefreshCw size={14} /> Purge Application Cache
                            </button>
                        </div>
                    </div>
                </section>

                {/* --- BACKGROUND JOB INTELLIGENCE --- */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider">Background Job Intelligence</h2>
                        <div className="flex items-center gap-2 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                            <Activity size={12} className="text-stone-500" />
                            <span className="text-[10px] font-bold text-stone-600 uppercase tracking-tight">Real-time Monitor</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Mail size={18} />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${queueStatus.emails > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {queueStatus.emails > 0 ? 'Processing' : 'Idle'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Queued Emails</p>
                                <p className="text-2xl font-black text-stone-900 leading-none">{queueStatus.emails}</p>
                            </div>
                            <div className="pt-3 border-t border-stone-50">
                                <p className="text-[10px] text-stone-500 font-medium">Transactional & Notifications</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                    <RefreshCw size={18} />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${queueStatus.reports > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {queueStatus.reports > 0 ? 'Generating' : 'Idle'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Report Generation</p>
                                <p className="text-2xl font-black text-stone-900 leading-none">{queueStatus.reports}</p>
                            </div>
                            <div className="pt-3 border-t border-stone-50">
                                <p className="text-[10px] text-stone-500 font-medium">BI & Analytics Exports</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                    <HardDrive size={18} />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${queueStatus.images > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {queueStatus.images > 0 ? 'Optimizing' : 'Idle'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Image Processing</p>
                                <p className="text-2xl font-black text-stone-900 leading-none">{queueStatus.images}</p>
                            </div>
                            <div className="pt-3 border-t border-stone-50">
                                <p className="text-[10px] text-stone-500 font-medium">CDN & Media Optimization</p>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                                    <ShieldAlert size={18} />
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${queueStatus.failed_jobs > 0 ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-500'}`}>
                                    {queueStatus.failed_jobs > 0 ? 'Attention' : 'Healthy'}
                                </span>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Failed Jobs</p>
                                <p className="text-2xl font-black text-stone-900 leading-none">{queueStatus.failed_jobs}</p>
                            </div>
                            <div className="pt-3 border-t border-stone-50">
                                <p className="text-[10px] text-stone-500 font-medium">Requires Admin Manual Retry</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* --- API HEARTBEAT --- */}
                <section>
                    <h2 className="text-sm font-bold text-stone-900 uppercase tracking-wider mb-4">External API Heartbeat</h2>

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
            </div>

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
        </>
    );
}

Diagnostics.layout = page => <AdminLayout title="Diagnostics Command Center">{page}</AdminLayout>;
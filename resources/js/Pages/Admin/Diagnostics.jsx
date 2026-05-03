import React from 'react';
import { Head, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Server, Database, Activity, Mail, Truck, RefreshCw, HardDrive, ShieldAlert, Cpu } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';

export default function Diagnostics({ systemHealth, memoryUsage, peakMemoryUsage }) {
    const { addToast } = useToast();

    const handlePurgeCache = () => {
        if (confirm('Are you sure you want to purge the entire system cache? This may cause a temporary spike in database load.')) {
            router.post(route('admin.diagnostics.cache.purge'), {}, {
                preserveScroll: true,
                onSuccess: () => addToast('System cache purged successfully.', 'success'),
            });
        }
    };

    const StatusLight = ({ status }) => {
        let colorClass = 'bg-stone-300 shadow-stone-200';
        let pulseClass = '';
        if (status === 'Online' || status === 'Configured' || status === 'Secure') {
            colorClass = 'bg-emerald-500 shadow-emerald-200';
            pulseClass = 'animate-pulse';
        } else if (status === 'Offline' || status === 'Error' || status === 'Warning') {
            colorClass = 'bg-red-500 shadow-red-200';
        } else if (status === 'Unknown' || status === 'Unconfigured') {
            colorClass = 'bg-amber-400 shadow-amber-200';
        }

        return (
            <div className="relative flex items-center justify-center w-3 h-3">
                <div className={`absolute w-full h-full rounded-full opacity-50 ${pulseClass} ${colorClass}`}></div>
                <div className={`relative w-2 h-2 rounded-full shadow-sm ${colorClass}`}></div>
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
        <AdminLayout title="Diagnostics Command Center">
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
        </AdminLayout>
    );
}
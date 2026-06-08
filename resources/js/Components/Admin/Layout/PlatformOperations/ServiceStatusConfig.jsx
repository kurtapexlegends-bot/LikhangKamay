import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { useToast } from '@/Components/ToastContext';
import ConfirmationModal from '@/Components/ConfirmationModal';
import { 
    Cpu, 
    RefreshCw, 
    Database, 
    HardDrive, 
    Server, 
    Truck, 
    Mail, 
    ShieldAlert,
    Trash2
} from 'lucide-react';

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

export default function ServiceStatusConfig({ systemHealth = {}, memoryUsage, peakMemoryUsage }) {
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

    return (
        <div className="space-y-8">
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
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-stone-900 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all hover:bg-stone-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-stone-900/20 min-h-[44px]"
                        >
                            <RefreshCw size={12} /> Purge Application Cache
                        </button>
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
        </div>
    );
}

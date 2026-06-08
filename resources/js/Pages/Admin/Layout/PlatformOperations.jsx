import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import AdminLayout from '@/Layouts/AdminLayout';
import { Activity, Clock3, Shield } from 'lucide-react';

import SystemHealthKPIs from '@/Components/Admin/Layout/PlatformOperations/SystemHealthKPIs';
import DiagnosticsLogsTable from '@/Components/Admin/Layout/PlatformOperations/DiagnosticsLogsTable';
import PlatformPerformanceCharts from '@/Components/Admin/Layout/PlatformOperations/PlatformPerformanceCharts';
import ServiceStatusConfig from '@/Components/Admin/Layout/PlatformOperations/ServiceStatusConfig';

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

    return (
        <>
            <Head title="Platform Operations Control Center" />

            <div className="space-y-6">
                {/* --- TABS NAVIGATION --- */}
                <div className="border-b border-stone-200 bg-white rounded-t-2xl shadow-sm px-4 pt-4 sm:px-6">
                    <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
                        {[
                            { id: 'health', label: 'System Health', mobileLabel: 'Health', icon: Activity },
                            { id: 'sla', label: 'SLA Exceptions', mobileLabel: 'SLA', icon: Clock3, badge: staleQueue.length || null },
                            { id: 'logs', label: 'Audit Logs', mobileLabel: 'Logs', icon: Shield, badge: (activities && activities.total) || null },
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
                                    <span>
                                        <span className="hidden sm:inline">{tab.label}</span>
                                        <span className="sm:hidden">{tab.mobileLabel}</span>
                                    </span>
                                    {tab.badge !== null && (
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                            activeTab === tab.id ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-600'
                                        }`}>
                                            {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
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
                                <ServiceStatusConfig 
                                    systemHealth={systemHealth} 
                                    memoryUsage={memoryUsage} 
                                    peakMemoryUsage={peakMemoryUsage} 
                                />

                                <SystemHealthKPIs 
                                    queueStatus={queueStatus} 
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
                            >
                                <PlatformPerformanceCharts 
                                    slaMetrics={slaMetrics} 
                                    staleQueue={staleQueue} 
                                />
                            </motion.div>
                        )}

                        {activeTab === 'logs' && (
                            <motion.div
                                key="logs"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <DiagnosticsLogsTable 
                                    activities={activities} 
                                    filters={filters} 
                                    availableActions={availableActions} 
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </>
    );
}

PlatformOperations.layout = page => <AdminLayout title="Platform Operations">{page}</AdminLayout>;

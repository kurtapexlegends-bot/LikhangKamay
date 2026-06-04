import React from 'react';
import { Users, Briefcase, Banknote, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { formatPeso } from '@/utils/hrHelpers';
import KPICard from '@/Components/KPICard';

export default function HRMetrics({
    staff = [],
    pendingPayrollCount = 0,
    hrAccessSummary,
    requiresStaffSchemaUpdate,
    canDeleteStaffAccounts,
    canEditHrRecords,
    animate = true
}) {
    const totalPayroll = staff.reduce((acc, curr) => acc + Number(curr.salary), 0);

    return (
        <div className="space-y-6">
            {/* KPI Cards (Scrollable Carousel on Mobile, Grid on Desktop) */}
            <div className="flex overflow-x-auto pb-2.5 gap-3 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                
                {/* Active Staff */}
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Active Staff"
                        value={staff.length}
                        icon={Users}
                        color="text-clay-600"
                        bg="bg-[#FCF7F2]"
                        animate={animate}
                    />
                </div>

                {/* Est. Monthly Payroll */}
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Est. Monthly Payroll"
                        value={animate ? totalPayroll : formatPeso(totalPayroll)}
                        icon={Briefcase}
                        color="text-stone-700"
                        bg="bg-stone-50"
                        animate={animate}
                        formatter={formatPeso}
                    />
                </div>

                {/* Pending Payrolls */}
                <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                    <KPICard
                        title="Pending Payrolls"
                        value={pendingPayrollCount}
                        icon={Banknote}
                        color={pendingPayrollCount > 0 ? 'text-amber-600' : 'text-emerald-600'}
                        bg={pendingPayrollCount > 0 ? 'bg-amber-50' : 'bg-emerald-50'}
                        animate={animate}
                    />
                </div>
            </div>

            {/* Alert / Summary Banner bar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3">
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${hrAccessSummary.tone}`}>
                    <Eye size={13} />
                    {hrAccessSummary.label}
                </span>
                {requiresStaffSchemaUpdate && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-1 text-[11px] font-bold text-red-700">
                        <AlertTriangle size={13} />
                        Staff login schema update needed
                    </span>
                )}
                {pendingPayrollCount > 0 && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-bold text-amber-700">
                        <Banknote size={13} />
                        {pendingPayrollCount} awaiting Accounting
                    </span>
                )}
                {!canDeleteStaffAccounts && canEditHrRecords && (
                    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-[11px] font-bold text-stone-600">
                        <Trash2 size={13} />
                        Login-linked records cannot be removed here
                    </span>
                )}
            </div>
        </div>
    );
}

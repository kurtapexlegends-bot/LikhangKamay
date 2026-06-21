import React from 'react';
import { FileCheck2 } from 'lucide-react';
import { formatPeso, formatPrecisePeso } from '@/utils/hrHelpers';

export default function DryRunPreviewPanel({ dryRunResults, activeStep }) {
    if (!dryRunResults || !dryRunResults.items || activeStep !== 2) return null;

    return (
        <div className="shrink-0 border-t border-stone-150 bg-white p-5 animate-fade-in max-h-[220px] overflow-y-auto">
            <div className="flex items-center justify-between mb-3 border-b border-stone-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                    <FileCheck2 size={15} className="text-emerald-600" />
                    <h4 className="text-xs font-bold text-stone-900">Server-Verified Estimates</h4>
                </div>
                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-wider">
                    Calculations Success
                </span>
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {dryRunResults.items.map(res => {
                    const totalOt = Number(res.overtime_pay || 0) + Number(res.rest_day_ot_pay || 0) + Number(res.holiday_ot_pay || 0);
                    return (
                        <div key={`dry-run-${res.employee_name}`} className="rounded-xl border border-stone-200 bg-stone-50/50 p-3 flex justify-between items-center text-xs">
                            <div className="min-w-0">
                                <span className="font-bold text-stone-850 truncate block">{res.employee_name}</span>
                                <span className="text-[9px] text-stone-500 mt-0.5 block">
                                    OT: +{formatPeso(totalOt)} | Ded: -{formatPeso(res.deductions)}
                                </span>
                            </div>
                            <span className="font-bold text-clay-700 shrink-0 text-right">{formatPrecisePeso(res.net_pay)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

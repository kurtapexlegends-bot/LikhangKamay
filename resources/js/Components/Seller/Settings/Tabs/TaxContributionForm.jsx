import React from 'react';
import { Landmark, ShieldCheck, HeartPulse, Home, FileText, Receipt, Power } from 'lucide-react';

export default function TaxContributionForm({ data = {}, setData, canEdit = true }) {
    const isEnabled = Boolean(data?.enable_statutory_deductions);

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            {/* Header with Integrated ERP Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                        <Landmark size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900 tracking-tight">
                            Statutory Contributions &amp; Withholding Tax
                        </h3>
                        <p className="text-xs text-stone-500 font-medium">
                            Philippine DOLE &amp; BIR statutory deductions for staff payroll
                        </p>
                    </div>
                </div>

                {/* Single Master Toggle */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="text-xs font-semibold text-stone-600">
                        {isEnabled ? 'Automated Deductions' : 'Deductions Paused'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) => {
                                if (canEdit && setData) {
                                    setData('enable_statutory_deductions', e.target.checked);
                                }
                            }}
                            disabled={!canEdit}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-clay-700 peer-disabled:opacity-50"></div>
                    </label>
                </div>
            </div>

            {/* Operational Mode Notice */}
            <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed transition-colors ${
                isEnabled
                    ? 'border-emerald-200/80 bg-emerald-50/50 text-emerald-900'
                    : 'border-stone-200 bg-stone-50/70 text-stone-600'
            }`}>
                {isEnabled ? (
                    <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">
                            <strong className="font-bold text-emerald-950">Automated Compliance Active:</strong> SSS, PhilHealth, Pag-IBIG employee withholdings, employer contributions, and BIR TRAIN Law taxes are automatically calculated on payroll runs.
                        </p>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shrink-0">
                            DOLE / BIR Compliant
                        </span>
                    </div>
                ) : (
                    <p className="font-medium">
                        <strong className="font-bold text-stone-800">Attendance-Only Mode:</strong> Statutory deductions are currently disabled. Payroll runs will compute staff pay based purely on gross attendance, overtime, and unpaid absences.
                    </p>
                )}
            </div>

            {/* 3-Column Structured Rate Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. SSS (RA 11199) */}
                <div className={`rounded-2xl border p-4 space-y-3 transition-opacity ${
                    isEnabled ? 'border-stone-200/90 bg-white shadow-2xs' : 'border-stone-200 bg-stone-50/40 opacity-70'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-clay-600 shrink-0" />
                            <h4 className="text-xs font-bold text-stone-900">SSS Contribution</h4>
                        </div>
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            14.0% Total
                        </span>
                    </div>

                    <div className="space-y-2 text-xs pt-1 border-t border-stone-100">
                        <div className="flex items-center justify-between text-stone-600">
                            <span>Employee Share:</span>
                            <strong className="text-stone-900 font-bold">4.5%</strong>
                        </div>
                        <div className="flex items-center justify-between text-stone-600">
                            <span>Employer Share:</span>
                            <strong className="text-stone-900 font-bold">9.5%</strong>
                        </div>
                        <div className="flex items-center justify-between text-stone-500 text-[11px] pt-1 border-t border-stone-100/80">
                            <span>Monthly Salary Credit:</span>
                            <span className="font-semibold text-stone-700">₱4k – ₱30k cap</span>
                        </div>
                    </div>
                </div>

                {/* 2. PhilHealth (RA 11223) */}
                <div className={`rounded-2xl border p-4 space-y-3 transition-opacity ${
                    isEnabled ? 'border-stone-200/90 bg-white shadow-2xs' : 'border-stone-200 bg-stone-50/40 opacity-70'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HeartPulse size={16} className="text-emerald-600 shrink-0" />
                            <h4 className="text-xs font-bold text-stone-900">PhilHealth</h4>
                        </div>
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            5.0% Total
                        </span>
                    </div>

                    <div className="space-y-2 text-xs pt-1 border-t border-stone-100">
                        <div className="flex items-center justify-between text-stone-600">
                            <span>Employee Share:</span>
                            <strong className="text-stone-900 font-bold">2.5%</strong>
                        </div>
                        <div className="flex items-center justify-between text-stone-600">
                            <span>Employer Share:</span>
                            <strong className="text-stone-900 font-bold">2.5%</strong>
                        </div>
                        <div className="flex items-center justify-between text-stone-500 text-[11px] pt-1 border-t border-stone-100/80">
                            <span>Salary Floor / Ceiling:</span>
                            <span className="font-semibold text-stone-700">₱10k – ₱100k</span>
                        </div>
                    </div>
                </div>

                {/* 3. Pag-IBIG (HDMF Circular 460) */}
                <div className={`rounded-2xl border p-4 space-y-3 transition-opacity ${
                    isEnabled ? 'border-stone-200/90 bg-white shadow-2xs' : 'border-stone-200 bg-stone-50/40 opacity-70'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Home size={16} className="text-amber-600 shrink-0" />
                            <h4 className="text-xs font-bold text-stone-900">Pag-IBIG (HDMF)</h4>
                        </div>
                        <span className="text-[10px] font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                            ₱200 Standard
                        </span>
                    </div>

                    <div className="space-y-2 text-xs pt-1 border-t border-stone-100">
                        <div className="flex items-center justify-between text-stone-600">
                            <span>Employee Share:</span>
                            <strong className="text-stone-900 font-bold">2.0% (max ₱200)</strong>
                        </div>
                        <div className="flex items-center justify-between text-stone-600">
                            <span>Employer Share:</span>
                            <strong className="text-stone-900 font-bold">2.0% (max ₱200)</strong>
                        </div>
                        <div className="flex items-center justify-between text-stone-500 text-[11px] pt-1 border-t border-stone-100/80">
                            <span>Mandatory Cap:</span>
                            <span className="font-semibold text-stone-700">₱200 / month</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* High-Signal Compliance Footnotes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-100 text-xs text-stone-600">
                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50/60 border border-stone-200/70">
                    <FileText size={15} className="text-stone-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-stone-900">TRAIN Law Withholding Exemption</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            Taxable compensation &le; ₱20,833.33/mo (₱250k/year) is 100% personal income tax exempt. Graduated withholding tax applies automatically to earnings above this threshold.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50/60 border border-stone-200/70">
                    <Receipt size={15} className="text-stone-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-stone-900">Workshop Output VAT Status</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            To update your studio BIR TIN or toggle between VAT-Registered (12% Output VAT) and Non-VAT sales invoices, configure the <strong>General Tab</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

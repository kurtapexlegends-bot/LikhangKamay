import React from 'react';
import { Landmark, ShieldCheck, HeartPulse, Home, FileText, CheckCircle2, Receipt, Power } from 'lucide-react';

export default function TaxContributionForm({ data = {}, setData, canEdit = true }) {
    const isEnabled = Boolean(data?.enable_statutory_deductions);

    return (
        <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-clay-50 text-clay-700 border border-clay-200/60 flex items-center justify-center shrink-0">
                        <Landmark size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-stone-900 tracking-tight">
                            Statutory Deductions &amp; Tax Contributions
                        </h3>
                        <p className="text-xs text-stone-500 font-medium mt-0.5">
                            Philippine Social Legislation &amp; TRAIN Law (RA 10963) Compliance
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                        isEnabled
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                            : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}>
                        <CheckCircle2 size={13} /> {isEnabled ? 'Automated Deductions Active' : 'Attendance Only Mode'}
                    </span>
                </div>
            </div>

            {/* Interactive Enable/Disable Toggle Card */}
            <div className={`p-4 rounded-2xl border transition-all ${
                isEnabled
                    ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200/60'
                    : 'border-stone-200 bg-stone-50/60'
            }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                            isEnabled
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-stone-200/60 text-stone-500 border-stone-200'
                        }`}>
                            <Power size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-stone-900">
                                    Automate Statutory Deductions on Payroll
                                </h4>
                                <span className={`inline-flex items-center text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                    isEnabled
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-stone-200/70 text-stone-600 border-stone-300'
                                }`}>
                                    {isEnabled ? 'Active' : 'Disabled'}
                                </span>
                            </div>
                            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                                {isEnabled
                                    ? 'Automatically compute SSS, PhilHealth, Pag-IBIG employee deductions, employer contributions, and BIR TRAIN Law withholding tax on all payroll runs.'
                                    : 'Statutory deductions are currently disabled. Payroll will compute take-home pay based purely on base salary, overtime, and attendance adjustments.'}
                            </p>
                        </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-center">
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
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-disabled:opacity-50"></div>
                    </label>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. SSS Contribution Card */}
                <div className={`rounded-2xl border p-4 space-y-2.5 shadow-2xs transition-colors ${
                    isEnabled ? 'border-stone-200/90 bg-white' : 'border-stone-200 bg-stone-50/40 opacity-80'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-clay-600" />
                            <h4 className="text-xs font-bold text-stone-900">SSS Contribution</h4>
                        </div>
                        <span className="text-[9px] font-extrabold text-clay-800 bg-clay-50 px-1.5 py-0.5 rounded border border-clay-200/60">
                            14.0% Total
                        </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                        Social Security System mandatory contribution bracket based on monthly salary credit.
                    </p>
                    <div className="pt-2 border-t border-stone-200/60 space-y-1.5 text-xs">
                        <div className="flex justify-between text-stone-600 text-[11px]">
                            <span>Employee Share:</span>
                            <strong className="text-stone-900">4.5%</strong>
                        </div>
                        <div className="flex justify-between text-stone-600 text-[11px]">
                            <span>Employer Share:</span>
                            <strong className="text-stone-900">9.5%</strong>
                        </div>
                        <div className="flex justify-between text-stone-500 text-[10px] pt-1">
                            <span>Salary Credit Cap:</span>
                            <span>₱30,000 / mo</span>
                        </div>
                    </div>
                </div>

                {/* 2. PhilHealth Card */}
                <div className={`rounded-2xl border p-4 space-y-2.5 shadow-2xs transition-colors ${
                    isEnabled ? 'border-stone-200/90 bg-white' : 'border-stone-200 bg-stone-50/40 opacity-80'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <HeartPulse size={16} className="text-emerald-600" />
                            <h4 className="text-xs font-bold text-stone-900">PhilHealth</h4>
                        </div>
                        <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            5.0% Total
                        </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                        National Health Insurance Program premium split equally between workshop and artisan staff.
                    </p>
                    <div className="pt-2 border-t border-stone-200/60 space-y-1.5 text-xs">
                        <div className="flex justify-between text-stone-600 text-[11px]">
                            <span>Employee Share:</span>
                            <strong className="text-stone-900">2.5%</strong>
                        </div>
                        <div className="flex justify-between text-stone-600 text-[11px]">
                            <span>Employer Share:</span>
                            <strong className="text-stone-900">2.5%</strong>
                        </div>
                        <div className="flex justify-between text-stone-500 text-[10px] pt-1">
                            <span>Floor / Ceiling:</span>
                            <span>₱10k – ₱100k</span>
                        </div>
                    </div>
                </div>

                {/* 3. Pag-IBIG (HDMF) Card */}
                <div className={`rounded-2xl border p-4 space-y-2.5 shadow-2xs transition-colors ${
                    isEnabled ? 'border-stone-200/90 bg-white' : 'border-stone-200 bg-stone-50/40 opacity-80'
                }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Home size={16} className="text-amber-600" />
                            <h4 className="text-xs font-bold text-stone-900">Pag-IBIG (HDMF)</h4>
                        </div>
                        <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                            ₱200 Standard
                        </span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed">
                        Home Development Mutual Fund savings and housing contribution for Philippine workers.
                    </p>
                    <div className="pt-2 border-t border-stone-200/60 space-y-1.5 text-xs">
                        <div className="flex justify-between text-stone-600 text-[11px]">
                            <span>Employee Share:</span>
                            <strong className="text-stone-900">2.0% (max ₱200)</strong>
                        </div>
                        <div className="flex justify-between text-stone-600 text-[11px]">
                            <span>Employer Share:</span>
                            <strong className="text-stone-900">2.0% (max ₱200)</strong>
                        </div>
                        <div className="flex justify-between text-stone-500 text-[10px] pt-1">
                            <span>Mandatory Cap:</span>
                            <span>₱200 / month</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. BIR Withholding Tax Note */}
            <div className="rounded-2xl border border-clay-200/80 bg-[#FCF7F2]/50 p-4 flex items-start gap-3 text-xs text-stone-700">
                <div className="w-8 h-8 rounded-xl bg-clay-100 text-clay-700 flex items-center justify-center shrink-0 border border-clay-200">
                    <FileText size={15} />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-stone-900">BIR TRAIN Law Withholding Tax Exemption</p>
                    <p className="text-[11px] text-stone-600 leading-relaxed mt-0.5 font-medium">
                        Employees earning a taxable compensation of <strong>₱250,000 or below</strong> annually (₱20,833.33/month) are 100% exempt from personal income tax withholding. Above this threshold, graduated withholding tax tables apply automatically.
                    </p>
                </div>
            </div>

            {/* 5. Workshop BIR VAT Invoicing Note */}
            <div className="rounded-2xl border border-stone-200 bg-stone-50/60 p-4 flex items-start gap-3 text-xs text-stone-700">
                <div className="w-8 h-8 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 border border-stone-200">
                    <Receipt size={15} />
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-stone-900">Workshop Output VAT &amp; Sales Invoicing</p>
                    <p className="text-[11px] text-stone-600 leading-relaxed mt-0.5 font-medium">
                        To update your studio TIN or toggle between VAT-Registered (12% Output VAT) and Non-VAT (VAT-Exempt) sales invoicing, configure your settings in the <strong>Finance &amp; Payouts</strong> or <strong>Shop Settings</strong> panel.
                    </p>
                </div>
            </div>
        </div>
    );
}

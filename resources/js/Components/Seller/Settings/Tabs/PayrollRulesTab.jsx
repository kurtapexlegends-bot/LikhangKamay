import React from 'react';
import { useForm } from '@inertiajs/react';
import { Clock, Calculator, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function PayrollRulesTab({ sellerOwner, permissions }) {
    const canEdit = permissions?.can_edit_hr_settings;

    const form = useForm({
        standard_workday_hours: sellerOwner.standard_workday_hours || 8.0,
        payroll_working_days: sellerOwner.payroll_working_days || 26,
        overtime_multiplier: sellerOwner.overtime_multiplier || 1.25,
        rest_day_ot_multiplier: sellerOwner.rest_day_ot_multiplier || 1.69,
        holiday_ot_multiplier: sellerOwner.holiday_ot_multiplier || 2.60,
        payroll_factor_method: sellerOwner.payroll_factor_method || 'custom',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        form.post(route('hr.settings'), {
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
                    <Clock size={20} />
                </div>
                <div>
                    <h3 className="text-base font-bold text-stone-900">People & Payroll Configuration</h3>
                    <p className="text-xs text-stone-500">Configure standard shift hours, overtime multipliers, and monthly payroll calculation factors.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Standard Workday Hours
                    </label>
                    <input
                        type="number"
                        step="0.5"
                        min="4"
                        max="12"
                        value={form.data.standard_workday_hours}
                        onChange={(e) => form.setData('standard_workday_hours', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50"
                        required
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Standard shift length (e.g. 8.0 hours per day).</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                        Working Days Per Month Factor
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="31"
                        value={form.data.payroll_working_days}
                        onChange={(e) => form.setData('payroll_working_days', e.target.value)}
                        disabled={!canEdit}
                        className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50"
                        required
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Monthly factor used to compute daily salary (e.g. 26 days).</p>
                </div>
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-2">
                    <Calculator size={14} className="text-clay-600" /> Overtime & Rate Multipliers
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">
                            Standard OT Multiplier
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="1.0"
                            max="5.0"
                            value={form.data.overtime_multiplier}
                            onChange={(e) => form.setData('overtime_multiplier', e.target.value)}
                            disabled={!canEdit}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">Default 1.25x (Regular Overtime)</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">
                            Rest Day OT Multiplier
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="1.0"
                            max="5.0"
                            value={form.data.rest_day_ot_multiplier}
                            onChange={(e) => form.setData('rest_day_ot_multiplier', e.target.value)}
                            disabled={!canEdit}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">Default 1.69x (Rest Day Shift)</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-600 mb-1">
                            Holiday OT Multiplier
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            min="1.0"
                            max="5.0"
                            value={form.data.holiday_ot_multiplier}
                            onChange={(e) => form.setData('holiday_ot_multiplier', e.target.value)}
                            disabled={!canEdit}
                            className="w-full rounded-xl border-stone-200 text-sm focus:border-clay-500 focus:ring-clay-500 disabled:bg-stone-50"
                        />
                        <p className="text-[10px] text-stone-400 mt-1">Default 2.60x (Legal Special Holiday)</p>
                    </div>
                </div>
            </div>

            {canEdit && (
                <div className="flex justify-end pt-2">
                    <button
                        type="submit"
                        disabled={form.processing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clay-600 text-white text-xs font-bold hover:bg-clay-700 transition disabled:opacity-50 min-h-[40px]"
                    >
                        <CheckCircle2 size={15} />
                        Save Payroll Rules
                    </button>
                </div>
            )}
        </form>
    );
}

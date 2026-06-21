import React from 'react';
import { X } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import InputLabel from '@/Components/InputLabel';
import { useToast } from '@/Components/ToastContext';
import { modalCloseButtonClass } from '@/utils/hrHelpers';

export default function HRSettingsModal({
    isOpen,
    onClose,
    sellerSettings = {},
    canEditHrRecords
}) {
    const { addToast } = useToast();

    const { data, setData, post, processing } = useForm({
        overtime_rate: sellerSettings.overtime_rate || 50.00,
        overtime_multiplier: sellerSettings.overtime_multiplier || 1.25,
        payroll_factor_method: sellerSettings.payroll_factor_method || 'custom',
        rest_day_ot_multiplier: sellerSettings.rest_day_ot_multiplier || 1.69,
        holiday_ot_multiplier: sellerSettings.holiday_ot_multiplier || 2.60,
        payroll_working_days: sellerSettings.payroll_working_days || 22,
    });

    React.useEffect(() => {
        if (isOpen) {
            setData({
                overtime_rate: sellerSettings.overtime_rate || 50.00,
                overtime_multiplier: sellerSettings.overtime_multiplier || 1.25,
                payroll_factor_method: sellerSettings.payroll_factor_method || 'custom',
                rest_day_ot_multiplier: sellerSettings.rest_day_ot_multiplier || 1.69,
                holiday_ot_multiplier: sellerSettings.holiday_ot_multiplier || 2.60,
                payroll_working_days: sellerSettings.payroll_working_days || 22,
            });
        }
    }, [isOpen, sellerSettings]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) return;
        post(route('hr.settings'), {
            onSuccess: () => {
                onClose();
                addToast('Payroll settings updated.', 'success');
            }
        });
    };

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="sm">
            <form onSubmit={handleSubmit} className="flex max-h-[85vh] flex-col">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Payroll Settings</h2>
                        <p className="mt-1 text-[13px] text-gray-500">Adjust the factor methods and overtime multipliers used in payroll calculations.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`${modalCloseButtonClass} min-h-[44px] min-w-[44px]`}
                        aria-label="Close settings"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Body */}
                <div className="space-y-4 overflow-y-auto px-6 py-6">
                    <div>
                        <InputLabel value="Salary Daily Rate Method (DOLE Factor)" />
                        <select
                            className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] text-sm mt-1"
                            value={data.payroll_factor_method}
                            onChange={e => setData('payroll_factor_method', e.target.value)}
                            required
                        >
                            <option value="custom">Custom Monthly Days (e.g. Fixed 22 Days)</option>
                            <option value="261">5-Day Work Week (261 Days Factor)</option>
                            <option value="313">6-Day Work Week (313 Days Factor)</option>
                        </select>
                        <p className="mt-1 text-[11px] text-stone-500">
                            {data.payroll_factor_method === '261' && 'Formula: (Base Salary * 12) / 261. Used for employees with Sat & Sun off.'}
                            {data.payroll_factor_method === '313' && 'Formula: (Base Salary * 12) / 313. Used for employees with Sundays off.'}
                            {data.payroll_factor_method === 'custom' && 'Formula: Base Salary / Configured standard work days.'}
                        </p>
                    </div>

                    {data.payroll_factor_method === 'custom' && (
                        <div>
                            <InputLabel value="Standard Work Days / Month" />
                            <input 
                                type="number" 
                                className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1" 
                                value={data.payroll_working_days ?? ''} 
                                onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                                onChange={e => setData('payroll_working_days', e.target.value.replace(/[-.]/g, ""))} 
                                required 
                                min="1" 
                                max="31"
                            />
                        </div>
                    )}

                    <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400">Overtime Multipliers</h4>
                        
                        <div>
                            <InputLabel value="Regular Workday OT (x of hourly rate)" />
                            <input 
                                type="number" 
                                className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1" 
                                value={data.overtime_multiplier ?? ''} 
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={e => setData('overtime_multiplier', e.target.value.replace(/-/g, ""))} 
                                required 
                                min="0.01" 
                                max="10"
                                step="0.01"
                            />
                            <p className="mt-0.5 text-[10px] text-stone-500">Legal Standard: 1.25x</p>
                        </div>

                        <div>
                            <InputLabel value="Rest Day / Special Holiday OT (x of hourly rate)" />
                            <input 
                                type="number" 
                                className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1" 
                                value={data.rest_day_ot_multiplier ?? ''} 
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={e => setData('rest_day_ot_multiplier', e.target.value.replace(/-/g, ""))} 
                                required 
                                min="0.01" 
                                max="10"
                                step="0.01"
                            />
                            <p className="mt-0.5 text-[10px] text-stone-500">Legal Standard: 1.69x (1.30 * 1.30)</p>
                        </div>

                        <div>
                            <InputLabel value="Regular Holiday OT (x of hourly rate)" />
                            <input 
                                type="number" 
                                className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px] mt-1" 
                                value={data.holiday_ot_multiplier ?? ''} 
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={e => setData('holiday_ot_multiplier', e.target.value.replace(/-/g, ""))} 
                                required 
                                min="0.01" 
                                max="10"
                                step="0.01"
                            />
                            <p className="mt-0.5 text-[10px] text-stone-500">Legal Standard: 2.60x (2.00 * 1.30)</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-6 py-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 transition hover:bg-stone-50 min-h-[44px] flex items-center justify-center"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing || !canEditHrRecords}
                        className="rounded-xl bg-clay-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-clay-700 min-h-[44px] flex items-center justify-center"
                    >
                        Save Settings
                    </button>
                </div>
            </form>
        </Modal>
    );
}

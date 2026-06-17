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
        payroll_working_days: sellerSettings.payroll_working_days || 22,
    });

    React.useEffect(() => {
        if (isOpen) {
            setData({
                overtime_rate: sellerSettings.overtime_rate || 50.00,
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
                        <p className="mt-1 text-[13px] text-gray-500">Adjust the fixed overtime rate and standard working days used in payroll requests.</p>
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
                        <InputLabel value="Fixed Overtime Rate (PHP/hr)" />
                        <input 
                            type="number" 
                            className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px]" 
                            value={data.overtime_rate ?? ''} 
                            onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                            onChange={e => setData('overtime_rate', e.target.value.replace(/-/g, ""))} 
                            required 
                            min="0" 
                            step="any"
                        />
                    </div>
                    <div>
                        <InputLabel value="Standard Work Days / Month" />
                        <input 
                            type="number" 
                            className="w-full rounded-xl border-gray-300 shadow-none transition focus:border-clay-500 focus:ring-clay-500 min-h-[44px]" 
                            value={data.payroll_working_days ?? ''} 
                            onKeyDown={(e) => { if (e.key === '-' || e.key === '.') e.preventDefault(); }}
                            onChange={e => setData('payroll_working_days', e.target.value.replace(/[-.]/g, ""))} 
                            required 
                            min="1" 
                            max="31"
                        />
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

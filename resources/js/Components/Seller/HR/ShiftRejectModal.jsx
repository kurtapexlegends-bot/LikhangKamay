import React from 'react';
import Modal from '@/Components/Modal';
import { X, Ban } from 'lucide-react';

export default function ShiftRejectModal({
    isOpen,
    onClose,
    rejectionReason,
    setRejectionReason,
    onConfirm,
    isSubmitting = false,
}) {
    if (!isOpen) return null;

    return (
        <Modal
            show={isOpen}
            onClose={onClose}
            maxWidth="md"
            bottomSheet={true}
        >
            <div className="p-6 space-y-4 bg-white rounded-3xl">
                <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                    <div>
                        <h3 className="text-sm font-extrabold text-stone-900">Decline Attendance Shift</h3>
                        <p className="text-[11px] text-stone-500 font-medium">Flag and exclude from payroll computation</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-400 hover:text-stone-700 p-1"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 text-xs text-rose-900 space-y-1">
                    <p className="font-bold flex items-center gap-1.5">
                        <Ban size={14} className="text-rose-600" />
                        <span>Excluded from Monthly Payroll</span>
                    </p>
                    <p className="text-[11px] text-rose-700/90 leading-relaxed">
                        Declining this shift removes its logged work hours from this period&apos;s automated payroll calculations and hourly adjustments.
                    </p>
                </div>

                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                        Decline Note &amp; Adjustment Reason (Optional)
                    </label>
                    <input
                        type="text"
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="e.g. Unverified off-site clock-in or incorrect shift hours"
                        className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs text-stone-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 shadow-2xs min-h-[40px]"
                    />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition min-h-[38px]"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onConfirm}
                        className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition shadow-xs disabled:opacity-50 min-h-[38px]"
                    >
                        {isSubmitting ? 'Declining...' : 'Confirm Decline'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

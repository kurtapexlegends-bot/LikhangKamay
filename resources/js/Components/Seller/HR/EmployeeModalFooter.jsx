import React from 'react';
import { Trash2, Loader2 } from 'lucide-react';

export default function EmployeeModalFooter({
    mode,
    onDelete,
    employee,
    onClose,
    processing,
    canEditHrRecords,
    canDeleteStaffAccounts,
}) {
    return (
        <div className="shrink-0 flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-stone-100 bg-[#FCF7F2]/50">
            {mode === 'edit' && onDelete && employee && (
                <button
                    type="button"
                    onClick={() => {
                        onClose();
                        onDelete(employee.id);
                    }}
                    disabled={processing || !canEditHrRecords || (employee.has_login_account && !canDeleteStaffAccounts)}
                    className="mr-auto inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                        employee.has_login_account && !canDeleteStaffAccounts
                            ? 'Only shop owner or staff manager can remove accounts with portal login'
                            : 'Remove Employee Record'
                    }
                >
                    <Trash2 size={13} />
                    <span>Remove Employee</span>
                </button>
            )}
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 transition flex items-center rounded-xl hover:bg-stone-100"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={processing || !canEditHrRecords}
                className="px-5 py-2 bg-clay-700 text-white rounded-xl text-xs font-bold hover:bg-clay-800 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-xs"
            >
                {processing ? (
                    <>
                        <Loader2 className="animate-spin" size={14} />
                        <span>{mode === 'add' ? 'Adding...' : 'Saving...'}</span>
                    </>
                ) : (
                    <span>{mode === 'add' ? 'Add Employee' : 'Save Changes'}</span>
                )}
            </button>
        </div>
    );
}

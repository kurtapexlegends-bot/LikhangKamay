import React, { useState } from 'react';
import { X, UserPlus, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff, Pencil } from 'lucide-react';
import Modal from '@/Components/Modal';
import RolePermissionSelector from './RolePermissionSelector';
import {
    DEFAULT_EMPLOYEE_ROLE,
    EMPLOYEE_ROLE_OPTIONS,
    modalFieldClass,
    modalFieldWithIconClass,
    modalSelectClass
} from '@/utils/hrHelpers';

export default function EmployeeFormModal({
    isOpen,
    onClose,
    mode = 'add', // 'add' or 'edit'
    employee = null, // for edit mode
    onSubmit,
    data,
    setData,
    processing,
    errors,
    rolePresets,
    availableModules,
    canProvisionStaffAccounts,
    canUpdateStaffAccounts,
    requiresStaffSchemaUpdate,
    canEditHrRecords,
    employeeIdValidation
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [manualEmployeeRole, setManualEmployeeRole] = useState(data.role || DEFAULT_EMPLOYEE_ROLE);

    React.useEffect(() => {
        if (isOpen) {
            setShowPassword(false);
            setManualEmployeeRole(data.role || DEFAULT_EMPLOYEE_ROLE);
        }
    }, [isOpen]);

    const getPresetRoleLabel = (presetKey) => {
        return rolePresets.find(p => p.key === presetKey)?.label || 'Custom';
    };

    const handleManualRoleChange = (value) => {
        setManualEmployeeRole(value);
        setData('role', value);
    };

    const handleProvisionToggle = (enabled) => {
        setData('create_login_account', enabled);

        if (!enabled) {
            if (mode === 'add' || !employee?.has_login_account) {
                setData('role', manualEmployeeRole || DEFAULT_EMPLOYEE_ROLE);
            }
            return;
        }

        const presetKey = data.staff_role_preset_key || (rolePresets[0]?.key || 'custom');
        setManualEmployeeRole(data.role || DEFAULT_EMPLOYEE_ROLE);
        setData('role', getPresetRoleLabel(presetKey));
        if (mode === 'add' || !employee?.has_login_account) {
            // Build module selection
            const preset = rolePresets.find((item) => item.key === presetKey) || rolePresets.find((item) => item.key === 'custom');
            const presetModules = new Set(preset?.modules || []);
            const selection = availableModules.reduce((acc, module) => {
                acc[module.key] = presetModules.has(module.key) ? 'can_edit' : null;
                return acc;
            }, {});
            setData('module_overrides', selection);
        }
    };

    const handlePresetChange = (presetKey) => {
        setData('staff_role_preset_key', presetKey);
        if (data.create_login_account || (employee && employee.has_login_account)) {
            setData('role', getPresetRoleLabel(presetKey));
        }
        // Build module selection
        const preset = rolePresets.find((item) => item.key === presetKey) || rolePresets.find((item) => item.key === 'custom');
        const presetModules = new Set(preset?.modules || []);
        const selection = availableModules.reduce((acc, module) => {
            acc[module.key] = presetModules.has(module.key) ? 'can_edit' : null;
            return acc;
        }, {});
        setData('module_overrides', selection);
    };

    const updateModuleOverride = (moduleKey, level) => {
        setData('module_overrides', {
            ...data.module_overrides,
            [moduleKey]: level,
        });
    };

    const hasLinkedLogin = mode === 'edit' && !!employee?.has_login_account;
    const editLinkedLoginIsSuspended = hasLinkedLogin && employee?.login_account?.workspace_access_enabled === false;
    const isSuspendingLinkedLogin = hasLinkedLogin && canUpdateStaffAccounts && !data.create_login_account;
    const showLinkedLoginUpdateFields = (mode === 'add' && canProvisionStaffAccounts && data.create_login_account) || 
                                       (mode === 'edit' && canUpdateStaffAccounts && (hasLinkedLogin || data.create_login_account));

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <form onSubmit={onSubmit} className="flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-start px-6 py-5 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500">
                            {mode === 'add' ? (
                                <UserPlus size={18} strokeWidth={2.5} />
                            ) : (
                                <Pencil size={18} strokeWidth={2.5} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-stone-900 tracking-tight">
                                    {mode === 'add' ? 'Add New Staff' : 'Update Staff Details'}
                                </h2>
                                {mode === 'edit' && (
                                    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                                        hasLinkedLogin
                                            ? editLinkedLoginIsSuspended
                                                ? 'bg-stone-100 text-stone-600 border border-stone-200'
                                                : 'bg-clay-50 text-clay-700 border border-clay-200'
                                            : 'bg-stone-100 text-stone-500 border border-stone-200'
                                    }`}>
                                        {hasLinkedLogin
                                            ? editLinkedLoginIsSuspended
                                                ? 'Suspended'
                                                : 'Active Login'
                                            : 'No Login'}
                                    </span>
                                )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-0.5 font-medium">
                                {mode === 'add'
                                    ? 'Create the employee record and add seller access only if needed.'
                                    : 'Update the employee record and linked workspace access.'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close employee modal"
                        className="text-stone-400 hover:text-stone-600 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                    >
                        <X size={20} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-[#FDFBF9]">
                    {/* Access Provision Toggle */}
                    {((mode === 'add' && canProvisionStaffAccounts) || (mode === 'edit' && canUpdateStaffAccounts)) && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/60 pb-5">
                            <div className="min-w-0">
                                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                    Enable Seller Portal Login
                                    <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                                        data.create_login_account ? 'bg-clay-600 text-white border-clay-700 shadow-sm' : 'bg-stone-100 text-stone-500 border-stone-200'
                                    }`}>
                                        {data.create_login_account ? 'Active' : 'Disabled'}
                                    </span>
                                </label>
                                <p className="mt-1 text-[13px] leading-snug text-stone-500">
                                    {hasLinkedLogin
                                        ? 'Suspend or restore workspace access here without deleting the linked staff account.'
                                        : 'Enable this only when the employee needs seller workspace access.'}
                                </p>
                            </div>
                            <label className="relative inline-flex shrink-0 items-center cursor-pointer min-h-[44px] min-w-[44px]">
                                <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={data.create_login_account}
                                    onChange={(e) => handleProvisionToggle(e.target.checked)}
                                />
                                <div className="h-6 w-11 rounded-full bg-stone-200 border border-stone-300 transition-colors peer-checked:bg-clay-700 peer-checked:border-clay-700 peer-focus:ring-2 peer-focus:ring-clay-500 peer-focus:ring-offset-2" />
                                <div className="pointer-events-none absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-[20px]" />
                            </label>
                        </div>
                    )}

                    {requiresStaffSchemaUpdate && (
                        <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-4 py-3 text-sm font-medium text-amber-800">
                            {mode === 'add'
                                ? 'Database migration required before login provisioning is available.'
                                : 'Database migration required before login access can be updated here.'}
                        </div>
                    )}

                    {mode === 'add' && !requiresStaffSchemaUpdate && !canProvisionStaffAccounts && (
                        <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-4 py-3 text-sm font-medium text-amber-800">
                            Only the shop owner or a user with editable People &amp; Payroll access can create seller login accounts.
                        </div>
                    )}

                    {mode === 'edit' && !requiresStaffSchemaUpdate && !canUpdateStaffAccounts && (
                        <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-4 py-3 text-sm font-medium text-amber-800">
                            Only the shop owner or a user with editable People &amp; Payroll access can change seller login access.
                        </div>
                    )}

                    {hasLinkedLogin && canUpdateStaffAccounts && (
                        <div className="rounded-xl border border-clay-200 bg-clay-50/50 px-4 py-3 text-[13px] font-medium text-stone-600">
                            This employee already has a linked seller login. You can update the linked email, reset the password, adjust access below, or suspend workspace access while keeping the account ready for restoration later.
                        </div>
                    )}

                    {isSuspendingLinkedLogin && (
                        <div className="rounded-xl border border-red-200 bg-[#FCF3F3] px-5 py-4 text-[13px] text-red-800">
                            <div className="flex items-center gap-2.5">
                                <span className="rounded-md bg-red-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                    Access Suspension
                                </span>
                                <span className="font-bold text-red-900 tracking-tight">Seller workspace access will be suspended.</span>
                            </div>
                            <div className="mt-3 space-y-1.5 leading-relaxed font-medium">
                                <p>- The employee record stays in HR and payroll history.</p>
                                <p>- The linked seller login, email, and role setup stay in place.</p>
                                <p>- Seller workspace access stays blocked until you restore it here.</p>
                                <p>- User session will be terminated upon next access attempt.</p>
                            </div>
                        </div>
                    )}

                    {editLinkedLoginIsSuspended && data.create_login_account && canUpdateStaffAccounts && (
                        <div className="rounded-xl border border-emerald-200 bg-[#F2FAF6] px-5 py-4 text-[13px] text-emerald-800">
                            <div className="flex items-center gap-2.5">
                                <span className="rounded-md bg-emerald-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                                    Access Restore
                                </span>
                                <span className="font-bold text-emerald-900 tracking-tight">Seller workspace access will be restored.</span>
                            </div>
                            <div className="mt-3 space-y-1.5 leading-relaxed font-medium">
                                <p>- The existing linked login account will be reused.</p>
                                <p>- Saved role preset and module settings can still be updated before reactivation.</p>
                            </div>
                        </div>
                    )}

                    {/* Basic Info Section */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                            Basic Employee Information
                        </h3>
                        <div className="grid gap-5 md:grid-cols-2">
                            {/* Employee ID */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Employee ID</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        className={`${modalFieldWithIconClass} ${employeeIdValidation.isValid === false ? 'border-red-300 bg-red-50 focus:ring-red-500' : ''} min-h-[44px]`}
                                        placeholder="e.g. EMP-001"
                                        value={data.employee_id}
                                        onChange={e => setData('employee_id', e.target.value)}
                                        required
                                    />
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        {data.employee_id && (
                                            employeeIdValidation.isValid === null ? (
                                                <Loader2 size={16} className="animate-spin text-stone-400" />
                                            ) : employeeIdValidation.isValid ? (
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                            ) : (
                                                <AlertTriangle size={16} className="text-red-500" />
                                            )
                                        )}
                                    </div>
                                </div>
                                {employeeIdValidation.isValid === false && (
                                    <p className="mt-1 text-[10px] font-bold text-red-600 uppercase tracking-tight flex items-center gap-1">
                                        {employeeIdValidation.message}
                                    </p>
                                )}
                                {errors.employee_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.employee_id}</p>}
                            </div>

                            {/* Legal Name */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Legal Full Name</label>
                                <input
                                    type="text"
                                    className={`${modalFieldClass} min-h-[44px]`}
                                    placeholder="e.g. Maria Clara"
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    required
                                />
                                {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
                            </div>

                            {/* Job Title / Preset Role */}
                            {showLinkedLoginUpdateFields ? (
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">Job Title (Preset)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-500 cursor-not-allowed min-h-[44px] shadow-sm"
                                        value={getPresetRoleLabel(data.staff_role_preset_key)}
                                        disabled
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Job Title</label>
                                    <select
                                        className={`${modalSelectClass} min-h-[44px]`}
                                        value={data.role}
                                        onChange={e => handleManualRoleChange(e.target.value)}
                                    >
                                        {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                                            <option key={roleOption}>{roleOption}</option>
                                        ))}
                                    </select>
                                    {errors.role && <p className="mt-1 text-xs text-red-500 font-medium">{errors.role}</p>}
                                </div>
                            )}

                            {/* Monthly Salary */}
                            <div>
                                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Monthly Salary (PHP)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    className={`${modalFieldClass} min-h-[44px]`}
                                    placeholder="0"
                                    value={data.salary}
                                    onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                    onChange={e => setData('salary', e.target.value.replace(/-/g, ""))}
                                    required
                                />
                                {errors.salary && <p className="mt-1 text-xs text-red-500 font-medium">{errors.salary}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Portal Credentials Section */}
                    {showLinkedLoginUpdateFields && (
                        <div className="space-y-4 border-t border-stone-200/60 pt-5">
                            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                                Seller Portal Credentials
                            </h3>
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Email Address</label>
                                    <input
                                        type="email"
                                        className={`${modalFieldClass} min-h-[44px]`}
                                        placeholder="maria@likhangkamay.com"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        required
                                    />
                                    {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                        {hasLinkedLogin ? 'Reset Password (Optional)' : 'Initial Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            className={`${modalFieldWithIconClass} min-h-[44px]`}
                                            placeholder={hasLinkedLogin ? 'Leave blank to keep password' : 'Set temp password'}
                                            value={data.default_password}
                                            onChange={(e) => setData('default_password', e.target.value)}
                                            required={!hasLinkedLogin && data.create_login_account}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((value) => !value)}
                                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-stone-700 min-h-[44px] flex items-center"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {errors.default_password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.default_password}</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Permissions Block */}
                    {showLinkedLoginUpdateFields && (
                        <RolePermissionSelector
                            rolePresets={rolePresets}
                            availableModules={availableModules}
                            presetKey={data.staff_role_preset_key}
                            onPresetChange={handlePresetChange}
                            moduleOverrides={data.module_overrides}
                            onModuleOverrideChange={updateModuleOverride}
                            radioName={mode === 'add' ? 'staff_role_preset_key' : 'edit_staff_role_preset_key'}
                            canEdit={canEditHrRecords}
                        />
                    )}
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-stone-100 bg-[#FCF7F2]/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 text-[13px] font-bold text-stone-600 hover:text-stone-900 transition min-h-[44px] flex items-center"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing || !canEditHrRecords}
                        className="px-6 py-2.5 bg-clay-700 text-white rounded-xl text-[13px] font-bold hover:bg-clay-800 transition disabled:opacity-70 disabled:cursor-not-allowed min-h-[44px] flex items-center"
                    >
                        {mode === 'add' ? 'Add Employee' : 'Save Changes'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

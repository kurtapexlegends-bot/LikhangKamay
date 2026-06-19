import React, { useState } from 'react';
import { X, UserPlus, Pencil, ShieldAlert, RefreshCw, Loader2 } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import RolePermissionSelector from './RolePermissionSelector';
import BasicEmployeeInfoSection from './BasicEmployeeInfoSection';
import PortalCredentialsSection from './PortalCredentialsSection';
import useConstraintValidation from '@/hooks/useConstraintValidation';
import { useToast } from '@/Components/ToastContext';
import {
    DEFAULT_EMPLOYEE_ROLE,
    buildModuleSelection,
    getModuleSelectionFromLogin,
    generateRandomEmployeeId
} from '@/utils/hrHelpers';


export default function EmployeeFormModal({
    isOpen,
    onClose,
    mode = 'add', // 'add' or 'edit'
    employee = null, // for edit mode
    rolePresets,
    availableModules,
    canProvisionStaffAccounts,
    canUpdateStaffAccounts,
    requiresStaffSchemaUpdate,
    canEditHrRecords
}) {
    const { addToast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    
    const initialPresetKey = rolePresets[0]?.key || 'hr';
    
    const { data, setData, post, patch, processing, errors } = useForm({
        employee_id: '',
        name: '',
        role: DEFAULT_EMPLOYEE_ROLE,
        salary: '',
        create_login_account: false,
        email: '',
        default_password: '',
        staff_role_preset_key: initialPresetKey,
        module_overrides: {},
    });

    const [manualEmployeeRole, setManualEmployeeRole] = useState(data.role || DEFAULT_EMPLOYEE_ROLE);

    React.useEffect(() => {
        if (isOpen) {
            setShowPassword(false);
            
            if (mode === 'add') {
                const newEmpId = generateRandomEmployeeId();
                setManualEmployeeRole(DEFAULT_EMPLOYEE_ROLE);
                setData({
                    employee_id: newEmpId,
                    name: '',
                    role: DEFAULT_EMPLOYEE_ROLE,
                    salary: '',
                    create_login_account: false,
                    email: '',
                    default_password: '',
                    staff_role_preset_key: initialPresetKey,
                    module_overrides: buildModuleSelection(initialPresetKey, rolePresets, availableModules),
                });
            } else if (mode === 'edit' && employee) {
                const hasLoginAccount = !!employee.has_login_account;
                const workspaceAccessEnabled = employee.login_account?.workspace_access_enabled !== false;
                const presetKey = employee.login_account?.role_preset_key || initialPresetKey;
                const moduleOverrides = hasLoginAccount 
                    ? getModuleSelectionFromLogin(employee.login_account, presetKey, rolePresets, availableModules) 
                    : buildModuleSelection(presetKey, rolePresets, availableModules);

                const activeRole = hasLoginAccount ? (rolePresets.find(p => p.key === presetKey)?.label || 'Custom') : (employee.role || DEFAULT_EMPLOYEE_ROLE);
                setManualEmployeeRole(activeRole);
                
                setData({
                    employee_id: employee.employee_id || generateRandomEmployeeId(),
                    name: employee.name || '',
                    role: activeRole,
                    salary: employee.salary ?? '',
                    create_login_account: hasLoginAccount ? workspaceAccessEnabled : false,
                    email: employee.login_account?.email || '',
                    default_password: '',
                    staff_role_preset_key: presetKey,
                    module_overrides: moduleOverrides,
                });
            }
        }
    }, [isOpen, mode, employee, rolePresets, availableModules]);

    const shouldValidateEmployeeId = isOpen && data.employee_id && (mode === 'add' || data.employee_id !== employee?.employee_id);
    const shouldValidateEmail = isOpen && data.create_login_account && data.email && (mode === 'add' || !employee?.login_account || data.email !== employee.login_account.email);

    const employeeIdValidation = useConstraintValidation(
        'employee_id_uniqueness',
        data.employee_id,
        { employee_id: employee?.id },
        shouldValidateEmployeeId
    );

    const emailValidation = useConstraintValidation(
        'email_availability',
        data.email,
        { user_id: employee?.login_account?.id },
        shouldValidateEmail
    );

    const isEmailGmail = !data.email || data.email.toLowerCase().endsWith('@gmail.com');
    const isEmployeeIdSaved = mode === 'edit' && employee && data.employee_id === employee.employee_id;
    const isEmailSaved = mode === 'edit' && employee?.login_account && data.email === employee.login_account.email;

    React.useEffect(() => {
        if (!isOpen) return;
        const emailInput = document.getElementById(mode === 'add' ? 'staff_email_add' : 'staff_email_edit');
        if (!emailInput) return;

        if (data.email) {
            if (!data.email.toLowerCase().endsWith('@gmail.com')) {
                emailInput.setCustomValidity('Email address must end with @gmail.com');
            } else if (emailValidation && emailValidation.isValid === false) {
                emailInput.setCustomValidity(emailValidation.message || 'This email is already registered.');
            } else {
                emailInput.setCustomValidity('');
            }
        } else {
            emailInput.setCustomValidity('');
        }
    }, [data.email, emailValidation?.isValid, emailValidation?.message, isOpen]);

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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) return;

        if (mode === 'add') {
            const isProvisioningLogin = data.create_login_account;
            post(route('hr.store'), {
                onSuccess: (page) => {
                    onClose();
                    addToast(page?.props?.flash?.success || (isProvisioningLogin ? 'Employee and staff login created. Verification code sent.' : 'Employee added.'), 'success');
                }
            });
        } else {
            if (!employee) return;
            patch(route('hr.update', employee.id), {
                onSuccess: (page) => {
                    onClose();
                    addToast(page?.props?.flash?.success || 'Employee details updated.', 'success');
                }
            });
        }
    };

    const hasLinkedLogin = mode === 'edit' && !!employee?.has_login_account;
    const editLinkedLoginIsSuspended = hasLinkedLogin && employee?.login_account?.workspace_access_enabled === false;
    const isSuspendingLinkedLogin = hasLinkedLogin && canUpdateStaffAccounts && !data.create_login_account;
    const showLinkedLoginUpdateFields = (mode === 'add' && canProvisionStaffAccounts && data.create_login_account) || 
                                       (mode === 'edit' && canUpdateStaffAccounts && (hasLinkedLogin || data.create_login_account));

    return (
        <Modal show={isOpen} onClose={onClose} maxWidth="2xl">
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
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
                    {/* Access Provision Toggle wrapped in a card */}
                    {((mode === 'add' && canProvisionStaffAccounts) || (mode === 'edit' && canUpdateStaffAccounts)) && (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-sm">
                            <div className="min-w-0">
                                <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-stone-500">
                                    Enable Seller Portal Login
                                    <span className={`inline-flex items-center justify-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest transition-colors duration-200 ${
                                        data.create_login_account ? 'bg-clay-600 text-white border-clay-700 shadow-sm' : 'bg-stone-200 text-stone-600 border-stone-300'
                                    }`}>
                                        {data.create_login_account ? 'Active' : 'Disabled'}
                                    </span>
                                </label>
                                <p className="mt-1 text-xs leading-snug text-stone-500">
                                    {hasLinkedLogin
                                        ? 'Suspend or restore workspace access here without deleting the linked staff account.'
                                        : 'Enable this only when the employee needs seller workspace access.'}
                                </p>
                            </div>
                            <label className="inline-flex shrink-0 items-center cursor-pointer min-h-[44px]">
                                <div className="relative h-6 w-11 shrink-0">
                                    <input
                                        type="checkbox"
                                        className="peer"
                                        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
                                        checked={data.create_login_account}
                                        onChange={(e) => handleProvisionToggle(e.target.checked)}
                                    />
                                    <div className="h-full w-full rounded-full bg-stone-200 border border-stone-300 transition-colors peer-checked:bg-clay-700 peer-checked:border-clay-700 peer-focus:ring-2 peer-focus:ring-clay-500 peer-focus:ring-offset-2" />
                                    <div className="pointer-events-none absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                                </div>
                            </label>
                        </div>
                    )}

                    {requiresStaffSchemaUpdate && (
                        <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-4 py-3 text-xs font-medium text-amber-800">
                            {mode === 'add'
                                ? 'Database migration required before login provisioning is available.'
                                : 'Database migration required before login access can be updated here.'}
                        </div>
                    )}

                    {mode === 'add' && !requiresStaffSchemaUpdate && !canProvisionStaffAccounts && (
                        <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-4 py-3 text-xs font-medium text-amber-800">
                            Only the shop owner or a user with editable People &amp; Payroll access can create seller login accounts.
                        </div>
                    )}

                    {mode === 'edit' && !requiresStaffSchemaUpdate && !canUpdateStaffAccounts && (
                        <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-4 py-3 text-xs font-medium text-amber-800">
                            Only the shop owner or a user with editable People &amp; Payroll access can change seller login access.
                        </div>
                    )}

                    {hasLinkedLogin && canUpdateStaffAccounts && (
                        <div className="rounded-xl border border-clay-100 bg-[#FCF7F2]/60 px-4 py-3 text-xs font-medium text-stone-600">
                            This employee already has a linked seller login. You can update the linked email, reset the password, adjust access below, or suspend workspace access while keeping the account ready for restoration later.
                        </div>
                    )}

                    {isSuspendingLinkedLogin && (
                        <div className="rounded-xl border border-red-200/80 bg-red-50/60 p-4 text-xs text-red-800 flex gap-3">
                            <ShieldAlert className="shrink-0 text-red-600" size={18} />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded bg-red-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
                                        Access Suspension
                                    </span>
                                    <span className="font-bold text-red-900">Seller workspace access will be suspended.</span>
                                </div>
                                <div className="mt-2.5 space-y-1 leading-relaxed font-medium text-red-700">
                                    <p>• The employee record stays in HR and payroll history.</p>
                                    <p>• The linked seller login, email, and role setup stay in place.</p>
                                    <p>• Seller workspace access stays blocked until you restore it here.</p>
                                    <p>• User session will be terminated upon next access attempt.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {editLinkedLoginIsSuspended && data.create_login_account && canUpdateStaffAccounts && (
                        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-xs text-emerald-800 flex gap-3">
                            <RefreshCw className="shrink-0 text-emerald-600" size={18} />
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
                                        Access Restore
                                    </span>
                                    <span className="font-bold text-emerald-900">Seller workspace access will be restored.</span>
                                </div>
                                <div className="mt-2.5 space-y-1 leading-relaxed font-medium text-emerald-700">
                                    <p>• The existing linked login account will be reused.</p>
                                    <p>• Saved role preset and module settings can still be updated before reactivation.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Basic Info Section */}
                    <BasicEmployeeInfoSection
                        data={data}
                        setData={setData}
                        errors={errors}
                        showLinkedLoginUpdateFields={showLinkedLoginUpdateFields}
                        getPresetRoleLabel={getPresetRoleLabel}
                        handleManualRoleChange={handleManualRoleChange}
                        employeeIdValidation={employeeIdValidation}
                        isEmployeeIdSaved={isEmployeeIdSaved}
                    />

                    {/* Collapsible Portal Configuration Section */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                        showLinkedLoginUpdateFields
                            ? 'max-h-[4000px] opacity-100'
                            : 'max-h-0 opacity-0 pointer-events-none !mt-0'
                    }`}>
                        <div className="space-y-6 pt-5 border-t border-stone-200/60 mt-6">
                            {/* Portal Credentials Section */}
                            <PortalCredentialsSection
                                data={data}
                                setData={setData}
                                errors={errors}
                                mode={mode}
                                showLinkedLoginUpdateFields={showLinkedLoginUpdateFields}
                                emailValidation={emailValidation}
                                isEmailGmail={isEmailGmail}
                                isEmailSaved={isEmailSaved}
                                showPassword={showPassword}
                                setShowPassword={setShowPassword}
                                hasLinkedLogin={hasLinkedLogin}
                            />

                            {/* Permissions Block */}
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
                        </div>
                    </div>
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
                        className="px-6 py-2.5 bg-clay-700 text-white rounded-xl text-[13px] font-bold hover:bg-clay-800 transition disabled:opacity-70 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                {mode === 'add' ? 'Adding...' : 'Saving...'}
                            </>
                        ) : (
                            mode === 'add' ? 'Add Employee' : 'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

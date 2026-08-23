import React, { useState } from 'react';
import { X, UserPlus, Pencil, ShieldAlert, RefreshCw, Loader2, Trash2 } from 'lucide-react';
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
    canDeleteStaffAccounts,
    requiresStaffSchemaUpdate,
    canEditHrRecords,
    sellerLocations = [],
    sellerSettings = {},
    onDelete = null,
}) {
    const { addToast } = useToast();
    const [showPassword, setShowPassword] = useState(false);
    
    const initialPresetKey = rolePresets[0]?.key || 'hr';
    const defaultWorkingDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
    
    const { data, setData, post, patch, processing, errors } = useForm({
        employee_id: '',
        name: '',
        role: DEFAULT_EMPLOYEE_ROLE,
        salary: '',
        assigned_location_id: null,
        allow_remote_clock_in: false,
        schedule_type: 'default',
        working_days: defaultWorkingDays,
        shift_start_time: '',
        shift_end_time: '',
        standard_workday_hours: '',
        grace_period_minutes: '',
        break_allowance_minutes: '',
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
                    assigned_location_id: null,
                    allow_remote_clock_in: false,
                    schedule_type: 'default',
                    working_days: defaultWorkingDays,
                    shift_start_time: '',
                    shift_end_time: '',
                    standard_workday_hours: '',
                    grace_period_minutes: '',
                    break_allowance_minutes: '',
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
                
                const empWorkingDays = Array.isArray(employee.working_days) && employee.working_days.length > 0
                    ? employee.working_days.map(d => d.toLowerCase())
                    : (employee.schedule_type === 'custom' ? [] : defaultWorkingDays);

                setData({
                    employee_id: employee.employee_id || generateRandomEmployeeId(),
                    name: employee.name || '',
                    role: activeRole,
                    salary: employee.salary ?? '',
                    assigned_location_id: employee.assigned_location_id || null,
                    allow_remote_clock_in: !!employee.allow_remote_clock_in,
                    schedule_type: employee.schedule_type || 'default',
                    working_days: empWorkingDays,
                    shift_start_time: employee.shift_start_time || '',
                    shift_end_time: employee.shift_end_time || '',
                    standard_workday_hours: employee.standard_workday_hours ?? '',
                    grace_period_minutes: employee.grace_period_minutes ?? '',
                    break_allowance_minutes: employee.break_allowance_minutes ?? '',
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
            <form onSubmit={handleSubmit} className="flex flex-col max-h-[88vh]">
                {/* Header */}
                <div className="shrink-0 flex justify-between items-center px-5 py-4 border-b border-stone-100 bg-[#FDFBF9]">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-600">
                            {mode === 'add' ? (
                                <UserPlus size={16} strokeWidth={2.5} />
                            ) : (
                                <Pencil size={16} strokeWidth={2.5} />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-stone-900 tracking-tight">
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
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close employee modal"
                        className="text-stone-400 hover:text-stone-600 transition h-8 w-8 rounded-lg hover:bg-stone-100 flex items-center justify-center"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-[#FDFBF9]">
                    {/* Basic Info (1. Staff Profile, 2. Compensation, 3. Location & Biometrics, 4. Work Schedule & Shifts) */}
                    <BasicEmployeeInfoSection
                        data={data}
                        setData={setData}
                        errors={errors}
                        showLinkedLoginUpdateFields={showLinkedLoginUpdateFields}
                        getPresetRoleLabel={getPresetRoleLabel}
                        handleManualRoleChange={handleManualRoleChange}
                        employeeIdValidation={employeeIdValidation}
                        isEmployeeIdSaved={isEmployeeIdSaved}
                        sellerLocations={sellerLocations}
                        sellerSettings={sellerSettings}
                    />

                    {/* Section 4: Seller Portal Access & Permissions */}
                    <div className="space-y-3 pt-1">
                        {((mode === 'add' && canProvisionStaffAccounts) || (mode === 'edit' && canUpdateStaffAccounts)) && (
                            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 flex items-center justify-between shadow-xs">
                                <div className="min-w-0 pr-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                                            Seller Portal Access
                                        </h3>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                            data.create_login_account ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-500'
                                        }`}>
                                            {data.create_login_account ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-[11px] text-stone-500 font-medium">
                                        Grant login access to perform duties in the seller workspace.
                                    </p>
                                </div>
                                <label className="inline-flex shrink-0 items-center cursor-pointer">
                                    <div className="relative h-6 w-11 shrink-0">
                                        <input
                                            type="checkbox"
                                            className="peer"
                                            style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}
                                            checked={data.create_login_account}
                                            onChange={(e) => handleProvisionToggle(e.target.checked)}
                                        />
                                        <div className="h-full w-full rounded-full bg-stone-200 border border-stone-300 transition-colors peer-checked:bg-clay-600 peer-checked:border-clay-600 peer-focus:ring-2 peer-focus:ring-clay-500/20" />
                                        <div className="pointer-events-none absolute left-[2px] top-[2px] h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
                                    </div>
                                </label>
                            </div>
                        )}

                        {requiresStaffSchemaUpdate && (
                            <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-3.5 py-2.5 text-xs font-medium text-amber-800">
                                {mode === 'add'
                                    ? 'System update in progress. Staff login setup will be available shortly.'
                                    : 'System update in progress. Staff login updates will be available shortly.'}
                            </div>
                        )}

                        {mode === 'add' && !requiresStaffSchemaUpdate && !canProvisionStaffAccounts && (
                            <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-3.5 py-2.5 text-xs font-medium text-amber-800">
                                Only the shop owner or a user with editable People &amp; Payroll access can create seller login accounts.
                            </div>
                        )}

                        {mode === 'edit' && !requiresStaffSchemaUpdate && !canUpdateStaffAccounts && (
                            <div className="rounded-xl border border-amber-200 bg-[#FFFBF0] px-3.5 py-2.5 text-xs font-medium text-amber-800">
                                Only the shop owner or a user with editable People &amp; Payroll access can change seller login access.
                            </div>
                        )}

                        {hasLinkedLogin && canUpdateStaffAccounts && (
                            <div className="rounded-xl border border-clay-100 bg-[#FCF7F2]/60 px-3.5 py-2.5 text-xs font-medium text-stone-600">
                                This employee already has a linked seller login. You can update the linked email, reset the password, adjust access below, or suspend workspace access while keeping the account ready for restoration later.
                            </div>
                        )}

                        {isSuspendingLinkedLogin && (
                            <div className="rounded-xl border border-red-200/80 bg-red-50/60 p-3.5 text-xs text-red-800 flex gap-2.5">
                                <ShieldAlert className="shrink-0 text-red-600" size={16} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-xs">
                                            Access Suspension
                                        </span>
                                        <span className="font-bold text-red-900">Seller workspace access will be suspended.</span>
                                    </div>
                                    <div className="mt-1.5 space-y-0.5 leading-relaxed font-medium text-red-700 text-[11px]">
                                        <p>• The employee record stays in HR and payroll history.</p>
                                        <p>• The linked seller login, email, and role setup stay in place.</p>
                                        <p>• Seller workspace access stays blocked until you restore it here.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {editLinkedLoginIsSuspended && data.create_login_account && canUpdateStaffAccounts && (
                            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3.5 text-xs text-emerald-800 flex gap-2.5">
                                <RefreshCw className="shrink-0 text-emerald-600" size={16} />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-xs">
                                            Access Restore
                                        </span>
                                        <span className="font-bold text-emerald-900">Seller workspace access will be restored.</span>
                                    </div>
                                    <div className="mt-1 space-y-0.5 leading-relaxed font-medium text-emerald-700 text-[11px]">
                                        <p>• The existing linked login account will be reused.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Collapsible Portal Configuration Section */}
                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                            showLinkedLoginUpdateFields
                                ? 'max-h-[4000px] opacity-100'
                                : 'max-h-0 opacity-0 pointer-events-none !mt-0'
                        }`}>
                            <div className="space-y-4 pt-1">
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
            </div>

                {/* Footer Actions */}
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
            </form>
        </Modal>
    );
}

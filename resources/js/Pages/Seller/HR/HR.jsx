import React, { useMemo, useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import ConfirmationModal from '@/Components/ConfirmationModal';
import Dropdown from '@/Components/Dropdown';
import SellerHeader from '@/Layouts/SellerHeader';
import { Users, UserPlus, Trash2, Banknote, Shield, Settings as SettingsIcon, EyeOff } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useConstraintValidation from '@/hooks/useConstraintValidation';

import {
    FALLBACK_ROLE_PRESETS,
    FALLBACK_MODULES,
    DEFAULT_EMPLOYEE_ROLE,
    normalizeModulePermissionLevel,
    summarizeModulePermissions,
    formatPeso
} from '@/utils/hrHelpers';

import HRMetrics from '@/Components/Seller/HR/HRMetrics';
import StaffTable from '@/Components/Seller/HR/StaffTable';
import PayrollHistoryTable from '@/Components/Seller/HR/PayrollHistoryTable';
import AccessAuditLog from '@/Components/Seller/HR/AccessAuditLog';
import AttendanceCalendarModal from '@/Components/Seller/HR/AttendanceCalendarModal';
import EmployeeFormModal from '@/Components/Seller/HR/EmployeeFormModal';
import PayrollGenerator from '@/Components/Seller/HR/PayrollGenerator';
import HRSettingsModal from '@/Components/Seller/HR/HRSettingsModal';

export default function HR({ auth, staff = [], payrolls = [], sellerSettings = {}, staffProvisioning = {}, staffAccessAudits = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { openSidebar } = useSellerWorkspaceShell();
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceModalEmployee, setAttendanceModalEmployee] = useState(null);
    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);

    const activeAttendanceEmployee = useMemo(() => {
        if (!attendanceModalEmployee) return null;
        return staff.find(emp => emp.id === attendanceModalEmployee.id) || attendanceModalEmployee;
    }, [attendanceModalEmployee, staff]);

    const generateRandomEmployeeId = () => {
        const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
        return `EMP-${randomNum}`;
    };

    const openAddModal = () => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setData({
            employee_id: generateRandomEmployeeId(),
            name: '',
            role: DEFAULT_EMPLOYEE_ROLE,
            salary: '',
            create_login_account: false,
            email: '',
            default_password: '',
            staff_role_preset_key: initialPresetKey,
            module_overrides: buildModuleSelection(initialPresetKey),
        });
        setIsModalOpen(true);
    };

    const handleMonthChange = (newMonth) => {
        router.get(
            route('hr.index'),
            { month: newMonth },
            {
                preserveState: true,
                only: ['staff', 'sellerSettings'],
                onSuccess: () => {
                    setSelectedAttendanceDate(null);
                }
            }
        );
    };

    const [confirmModal, setConfirmModal] = useState({ isOpen: false, type: null, id: null });
    const [dryRunResults, setDryRunResults] = useState(null);
    const [isDryRunning, setIsDryRunning] = useState(false);
    const [activeTab, setActiveTab] = useState('directory');
    const { addToast } = useToast();
    const [shouldAnimateKPI, setShouldAnimateKPI] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setShouldAnimateKPI(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const canEditHrRecords = staffProvisioning.canEditHrRecords ?? true;
    const canManageStaffAccounts = !!staffProvisioning.canManageStaffAccounts;
    const canCreateStaffAccounts = !!staffProvisioning.canCreateStaffAccounts;
    const canDeleteStaffAccounts = !!staffProvisioning.canDeleteStaffAccounts;
    const requiresStaffSchemaUpdate = !!staffProvisioning.requiresStaffSchemaUpdate;
    const canUpdateStaffAccounts = canManageStaffAccounts && !requiresStaffSchemaUpdate;
    const canProvisionStaffAccounts = canCreateStaffAccounts && !requiresStaffSchemaUpdate;

    const rolePresets = staffProvisioning.rolePresets?.length ? staffProvisioning.rolePresets : FALLBACK_ROLE_PRESETS;
    const availableModules = staffProvisioning.availableModules?.length ? staffProvisioning.availableModules : FALLBACK_MODULES;
    const initialPresetKey = rolePresets[0]?.key || 'hr';

    const presetLabelByKey = rolePresets.reduce((acc, preset) => {
        acc[preset.key] = preset.label;
        return acc;
    }, {});

    const showReadOnlyToast = () => addToast('Read-only people access can only view records.', 'error');
    const paginatedPayrolls = useMemo(() => Array.isArray(payrolls) ? payrolls : (payrolls?.data || []), [payrolls]);
    const pendingPayrollCount = useMemo(() => paginatedPayrolls.filter((payroll) => payroll.status === 'Pending').length, [paginatedPayrolls]);

    const hrAccessSummary = useMemo(() => {
        if (!canEditHrRecords) return { tone: 'border-stone-200 bg-stone-50 text-stone-600', label: 'View only access' };
        if (canProvisionStaffAccounts) return { tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Editable people access' };
        if (canUpdateStaffAccounts) return { tone: 'border-amber-200 bg-amber-50 text-amber-700', label: 'Editable people access' };
        return { tone: 'border-stone-200 bg-stone-50 text-stone-600', label: 'Records only' };
    }, [canEditHrRecords, canProvisionStaffAccounts, canUpdateStaffAccounts]);

    const buildModuleSelection = (presetKey) => {
        const preset = rolePresets.find((item) => item.key === presetKey) || rolePresets.find((item) => item.key === 'custom');
        const presetModules = new Set(preset?.modules || []);
        return availableModules.reduce((acc, module) => {
            acc[module.key] = presetModules.has(module.key) ? 'can_edit' : null;
            return acc;
        }, {});
    };

    // settings form
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { data: settingsData, setData: setSettingsData, post: postSettings, processing: settingsProcessing } = useForm({
        overtime_rate: sellerSettings.overtime_rate || 50.00,
        payroll_working_days: sellerSettings.payroll_working_days || 22,
    });

    const submitSettings = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        postSettings(route('hr.settings'), {
            onSuccess: () => {
                setIsSettingsOpen(false);
                addToast('Payroll settings updated.', 'success');
            }
        });
    };

    // ADD form
    const { data, setData, post, processing, reset, errors } = useForm({
        employee_id: '',
        name: '',
        role: DEFAULT_EMPLOYEE_ROLE,
        salary: '',
        create_login_account: false,
        email: '',
        default_password: '',
        staff_role_preset_key: initialPresetKey,
        module_overrides: buildModuleSelection(initialPresetKey),
    });

    const employeeIdValidation = useConstraintValidation('employee_id_uniqueness', data.employee_id, { employee_id: editingEmployee?.id });
    const emailValidation = useConstraintValidation(
        'email_availability',
        data.email,
        { user_id: editingEmployee?.login_account?.id },
        data.create_login_account
    );

    const submit = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        const isProvisioningLogin = data.create_login_account;
        post(route('hr.store'), {
            onSuccess: (page) => {
                setIsModalOpen(false);
                reset();
                addToast(page?.props?.flash?.success || (isProvisioningLogin ? 'Employee and staff login created. Verification code sent.' : 'Employee added.'), 'success');
            }
        });
    };

    // EDIT form
    const { data: editData, setData: setEditData, patch, processing: editProcessing, reset: resetEdit, errors: editErrors } = useForm({
        employee_id: '',
        name: '',
        role: DEFAULT_EMPLOYEE_ROLE,
        salary: '',
        create_login_account: false,
        email: '',
        default_password: '',
        staff_role_preset_key: initialPresetKey,
        module_overrides: buildModuleSelection(initialPresetKey),
    });
    const editEmployeeIdValidation = useConstraintValidation(
        'employee_id_uniqueness',
        editData.employee_id,
        { employee_id: editingEmployee?.id },
        !!editingEmployee && editData.employee_id !== editingEmployee.employee_id
    );
    const editEmailValidation = useConstraintValidation(
        'email_availability',
        editData.email,
        { user_id: editingEmployee?.login_account?.id },
        editData.create_login_account && (!editingEmployee?.login_account || editData.email !== editingEmployee.login_account.email)
    );

    const getModuleSelectionFromLogin = (loginAccount, presetKey) => {
        const defaultSelection = buildModuleSelection(presetKey);
        return availableModules.reduce((acc, module) => {
            const explicitValue = loginAccount?.module_permissions?.[module.key];
            acc[module.key] = normalizeModulePermissionLevel(explicitValue) ?? defaultSelection[module.key] ?? null;
            return acc;
        }, {});
    };

    const openEditModal = (employee) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        const hasLoginAccount = !!employee.has_login_account;
        const workspaceAccessEnabled = employee.login_account?.workspace_access_enabled !== false;
        const presetKey = employee.login_account?.role_preset_key || initialPresetKey;
        const moduleOverrides = hasLoginAccount ? getModuleSelectionFromLogin(employee.login_account, presetKey) : buildModuleSelection(presetKey);

        setEditingEmployee(employee);
        setEditData({
            employee_id: employee.employee_id || generateRandomEmployeeId(),
            name: employee.name || '',
            role: hasLoginAccount ? (rolePresets.find(p => p.key === presetKey)?.label || 'Custom') : (employee.role || DEFAULT_EMPLOYEE_ROLE),
            salary: employee.salary ?? '',
            create_login_account: hasLoginAccount ? workspaceAccessEnabled : false,
            email: employee.login_account?.email || '',
            default_password: '',
            staff_role_preset_key: presetKey,
            module_overrides: moduleOverrides,
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingEmployee(null);
        resetEdit();
    };

    const submitEdit = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        if (!editingEmployee) return;
        patch(route('hr.update', editingEmployee.id), {
            onSuccess: (page) => {
                closeEditModal();
                addToast(page?.props?.flash?.success || 'Employee details updated.', 'success');
            },
        });
    };

    const deleteEmployee = (id) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setConfirmModal({ isOpen: true, type: 'employee', id });
    };

    // PAYROLL Form
    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const { data: payrollData, setData: setPayrollData, post: postPayroll, processing: payrollProcessing, reset: resetPayroll, transform: transformPayroll } = useForm({
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        items: []
    });

    const openPayrollModal = () => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        const initialItems = staff.map(emp => ({
            employee_id: emp.id,
            name: emp.name,
            salary: Number(emp.salary),
            absences_days: Number(emp.payroll_prefill?.absences_days ?? 0),
            undertime_hours: Number(emp.payroll_prefill?.undertime_hours ?? 0),
            overtime_hours: Number(emp.payroll_prefill?.overtime_hours ?? 0),
            attendance_days_worked: Number(emp.payroll_prefill?.days_worked ?? 0),
            has_attendance_source: !!emp.attendance?.has_attendance_source,
            isSelected: true
        }));
        setPayrollData('month', sellerSettings.attendance_month_label || new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
        setPayrollData('items', initialItems);
        setIsPayrollModalOpen(true);
    };

    const handleDryRun = () => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        const selectedItems = payrollData.items.filter(i => i.isSelected);
        if (selectedItems.length === 0) { addToast("Please select at least one employee.", "error"); return; }
        setIsDryRunning(true);
        setDryRunResults(null);

        axios.post(route('hr.generate'), {
            action: 'dry_run',
            month: payrollData.month,
            items: selectedItems.map(i => ({
                employee_id: i.employee_id,
                absences_days: i.absences_days || 0,
                undertime_hours: i.undertime_hours || 0,
                overtime_hours: i.overtime_hours || 0
            }))
        })
        .then(response => {
            setDryRunResults(response.data);
            addToast('Dry run calculation complete.', 'success');
        })
        .catch(() => {
            addToast('Dry run failed. Please check inputs.', 'error');
        })
        .finally(() => {
            setIsDryRunning(false);
        });
    };

    const submitPayroll = (e) => {
        e.preventDefault();
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        const selectedItems = payrollData.items.filter(i => i.isSelected);
        if (selectedItems.length === 0) { addToast("Please select at least one employee.", "error"); return; }

        transformPayroll((data) => ({
            month: data.month,
            items: data.items.filter(i => i.isSelected).map(i => ({
                employee_id: i.employee_id,
                absences_days: i.absences_days || 0,
                undertime_hours: i.undertime_hours || 0,
                overtime_hours: i.overtime_hours || 0
            }))
        }));

        postPayroll(route('hr.generate'), {
            onSuccess: (page) => {
                if (page?.props?.flash?.error) { addToast(page.props.flash.error, 'error'); return; }
                setIsPayrollModalOpen(false);
                resetPayroll();
                addToast(page?.props?.flash?.success || 'Payroll request sent to Accounting.', "success");
            },
            onError: (errors) => {
                const firstError = errors.items || errors.month || Object.values(errors)[0];
                addToast(firstError || 'Unable to generate payroll right now.', 'error');
            },
        });
    };

    const deletePayroll = (id) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setConfirmModal({ isOpen: true, type: 'payroll', id });
    };

    const confirmDeleteAction = () => {
        if (!canEditHrRecords) { setConfirmModal({ isOpen: false, type: null, id: null }); return; }
        if (!confirmModal.id) return;

        if (confirmModal.type === 'employee') {
            router.delete(route('hr.destroy', confirmModal.id), {
                onSuccess: (page) => addToast(page?.props?.flash?.success || 'Employee removed', 'success'),
                onFinish: () => setConfirmModal({ isOpen: false, type: null, id: null }),
            });
            return;
        }

        if (confirmModal.type === 'payroll') {
            router.delete(route('hr.payroll.destroy', confirmModal.id), {
                onSuccess: () => addToast('Payroll request deleted', 'success'),
                onFinish: () => setConfirmModal({ isOpen: false, type: null, id: null }),
            });
        }
    };

    return (
        <>
            <Head title="People & Payroll" />
            <SellerHeader
                title="People & Payroll"
                subtitle="Manage employees, payroll, and workspace access."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-clay-400' }}
                actions={canEditHrRecords ? (
                    <>
                        {/* Desktop actions */}
                        <div className="hidden sm:flex items-center gap-2">
                            <button
                                onClick={() => setIsSettingsOpen(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-200 min-h-[44px]"
                                title="Payroll Settings"
                            >
                                <SettingsIcon size={16} />
                            </button>
                            <button
                                onClick={openPayrollModal}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-stone-700 shadow-sm ring-1 ring-inset ring-stone-200 transition hover:bg-stone-50 min-h-[44px]"
                            >
                                <Banknote size={16} /> Generate Payroll
                            </button>
                            <button
                                onClick={openAddModal}
                                className="inline-flex items-center gap-2 rounded-xl bg-clay-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-clay-200 transition hover:bg-clay-700 min-h-[44px]"
                            >
                                <UserPlus size={16} /> Add Employee
                            </button>
                        </div>

                        {/* Mobile action menu */}
                        <div className="sm:hidden">
                            <Dropdown>
                                <Dropdown.Trigger>
                                    <button
                                        type="button"
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:bg-stone-50"
                                        title="Actions"
                                    >
                                        <SettingsIcon size={18} />
                                    </button>
                                </Dropdown.Trigger>
                                <Dropdown.Content align="top-right" width="48">
                                    <button
                                        onClick={() => setIsSettingsOpen(true)}
                                        className="block w-full px-4 py-2 text-left text-xs font-bold text-stone-700 hover:bg-stone-50"
                                    >
                                        Payroll Settings
                                    </button>
                                    {activeTab === 'directory' && (
                                        <button
                                            onClick={openPayrollModal}
                                            className="block w-full px-4 py-2 text-left text-xs font-bold text-stone-700 hover:bg-stone-50"
                                        >
                                            Generate Payroll
                                        </button>
                                    )}
                                    {activeTab === 'payroll' && (
                                        <button
                                            onClick={openAddModal}
                                            className="block w-full px-4 py-2 text-left text-xs font-bold text-stone-700 hover:bg-stone-50"
                                        >
                                            Add Employee
                                        </button>
                                    )}
                                </Dropdown.Content>
                            </Dropdown>
                        </div>
                    </>
                ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[11px] font-bold text-stone-500 min-h-[44px]">
                        <EyeOff size={14} />
                        View Only
                    </span>
                )}
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
                <HRMetrics
                    staff={staff}
                    pendingPayrollCount={pendingPayrollCount}
                    hrAccessSummary={hrAccessSummary}
                    requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                    canDeleteStaffAccounts={canDeleteStaffAccounts}
                    canEditHrRecords={canEditHrRecords}
                    animate={shouldAnimateKPI}
                />

                {/* Tabs Navigation (Grid Scroll on Mobile) */}
                <div className="flex items-center gap-2 border-b border-stone-200 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button
                        onClick={() => setActiveTab('directory')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors min-h-[44px] ${
                            activeTab === 'directory'
                                ? 'border-clay-600 text-clay-700'
                                : 'border-transparent text-stone-500 hover:text-stone-700'
                        }`}
                    >
                        <Users size={16} /> Directory
                    </button>
                    <button
                        onClick={() => setActiveTab('payroll')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors min-h-[44px] ${
                            activeTab === 'payroll'
                                ? 'border-clay-600 text-clay-700'
                                : 'border-transparent text-stone-500 hover:text-stone-700'
                        }`}
                    >
                        <Banknote size={16} /> Payroll History
                    </button>
                    <button
                        onClick={() => setActiveTab('access')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-colors min-h-[44px] ${
                            activeTab === 'access'
                                ? 'border-clay-600 text-clay-700'
                                : 'border-transparent text-stone-500 hover:text-stone-700'
                        }`}
                    >
                        <Shield size={16} /> Access Audit
                    </button>
                </div>

                {activeTab === 'directory' && (
                    <StaffTable
                        staff={staff}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        canEditHrRecords={canEditHrRecords}
                        canDeleteStaffAccounts={canDeleteStaffAccounts}
                        openEditModal={openEditModal}
                        deleteEmployee={deleteEmployee}
                        openAttendanceModal={setAttendanceModalEmployee}
                        presetLabelByKey={presetLabelByKey}
                        monthLabel={sellerSettings.attendance_month_label || 'Current Month'}
                        onAddClick={openAddModal}
                    />
                )}

                {activeTab === 'payroll' && (
                    <PayrollHistoryTable
                        payrolls={payrolls}
                        canEditHrRecords={canEditHrRecords}
                        deletePayroll={deletePayroll}
                    />
                )}

                {activeTab === 'access' && (
                    <AccessAuditLog
                        auditEntries={staffAccessAudits}
                    />
                )}
            </main>

            <AttendanceCalendarModal
                employee={activeAttendanceEmployee}
                selectedDate={selectedAttendanceDate}
                onSelectDate={setSelectedAttendanceDate}
                onClose={() => setAttendanceModalEmployee(null)}
                sellerSettings={sellerSettings}
                onMonthChange={handleMonthChange}
            />

            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode="add"
                onSubmit={submit}
                data={data}
                setData={setData}
                processing={processing}
                errors={errors}
                rolePresets={rolePresets}
                availableModules={availableModules}
                canProvisionStaffAccounts={canProvisionStaffAccounts}
                canUpdateStaffAccounts={canUpdateStaffAccounts}
                requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                canEditHrRecords={canEditHrRecords}
                employeeIdValidation={employeeIdValidation}
                emailValidation={emailValidation}
            />

            {editingEmployee && (
                <EmployeeFormModal
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    mode="edit"
                    employee={editingEmployee}
                    onSubmit={submitEdit}
                    data={editData}
                    setData={setEditData}
                    processing={editProcessing}
                    errors={editErrors}
                    rolePresets={rolePresets}
                    availableModules={availableModules}
                    canProvisionStaffAccounts={canProvisionStaffAccounts}
                    canUpdateStaffAccounts={canUpdateStaffAccounts}
                    requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                    canEditHrRecords={canEditHrRecords}
                    employeeIdValidation={editEmployeeIdValidation}
                    emailValidation={editEmailValidation}
                />
            )}

            <PayrollGenerator
                isOpen={isPayrollModalOpen}
                onClose={() => { setIsPayrollModalOpen(false); setDryRunResults(null); }}
                onSubmit={submitPayroll}
                data={payrollData}
                setData={setPayrollData}
                processing={payrollProcessing}
                errors={errors}
                staff={staff}
                sellerSettings={sellerSettings}
                isDryRunning={isDryRunning}
                dryRunResults={dryRunResults}
                handleDryRun={handleDryRun}
                canEditHrRecords={canEditHrRecords}
            />

            <HRSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSubmit={submitSettings}
                data={settingsData}
                setData={setSettingsData}
                processing={settingsProcessing}
                canEditHrRecords={canEditHrRecords}
            />

            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: null, id: null })}
                onConfirm={confirmDeleteAction}
                title={confirmModal.type === 'employee' ? 'Remove employee?' : 'Delete payroll request?'}
                message={confirmModal.type === 'employee'
                    ? 'This will remove the employee record and stop their payroll calculation.'
                    : 'This payroll request will be removed from the list.'}
                icon={Trash2}
                iconBg="bg-red-50 text-red-600"
                confirmText={confirmModal.type === 'employee' ? 'Remove' : 'Delete'}
                confirmColor="bg-red-600 hover:bg-red-700"
            />

            {/* Mobile Floating Action Buttons */}
            {canEditHrRecords && (
                <div className="sm:hidden">
                    {activeTab === 'directory' && (
                        <button
                            onClick={openAddModal}
                            className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-12 px-4 bg-clay-700 text-white rounded-full shadow-lg font-bold text-xs gap-1.5 transition active:scale-95 hover:bg-clay-800"
                        >
                            <UserPlus size={16} /> Add Employee
                        </button>
                    )}
                    {activeTab === 'payroll' && (
                        <button
                            onClick={openPayrollModal}
                            className="fixed bottom-6 right-6 z-40 flex items-center justify-center h-12 px-4 bg-clay-700 text-white rounded-full shadow-lg font-bold text-xs gap-1.5 transition active:scale-95 hover:bg-clay-800"
                        >
                            <Banknote size={16} /> Generate Payroll
                        </button>
                    )}
                </div>
            )}
        </>
    );
}

HR.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;

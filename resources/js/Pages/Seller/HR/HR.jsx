import React, { useMemo, useState, useEffect } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import axios from 'axios';
import ConfirmationModal from '@/Components/ConfirmationModal';
import SellerHeader from '@/Layouts/SellerHeader';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import useConstraintValidation from '@/hooks/useConstraintValidation';

import {
    FALLBACK_ROLE_PRESETS,
    FALLBACK_MODULES,
    DEFAULT_EMPLOYEE_ROLE,
    normalizeModulePermissionLevel,
    summarizeModulePermissions,
    buildModuleSelection,
    getModuleSelectionFromLogin,
    generateRandomEmployeeId,
    getHrAccessSummary,
} from '@/utils/hrHelpers';

import HRMetrics from '@/Components/Seller/HR/HRMetrics';
import StaffTable from '@/Components/Seller/HR/StaffTable';
import PayrollHistoryTable from '@/Components/Seller/HR/PayrollHistoryTable';
import AccessAuditLog from '@/Components/Seller/HR/AccessAuditLog';
import AttendanceCalendarModal from '@/Components/Seller/HR/AttendanceCalendarModal';
import EmployeeFormModal from '@/Components/Seller/HR/EmployeeFormModal';
import PayrollGenerator from '@/Components/Seller/HR/PayrollGenerator';
import HRSettingsModal from '@/Components/Seller/HR/HRSettingsModal';

import HRHeaderActions from '@/Components/Seller/HR/HRHeaderActions';
import HRTabs from '@/Components/Seller/HR/HRTabs';
import HRStickyActionBar from '@/Components/Seller/HR/HRStickyActionBar';

export default function HR({ auth, staff = [], payrolls = [], sellerSettings = {}, staffProvisioning = {}, staffAccessAudits = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { openSidebar } = useSellerWorkspaceShell();
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceModalEmployee, setAttendanceModalEmployee] = useState(null);
    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);    const activeAttendanceEmployee = useMemo(() => attendanceModalEmployee ? (staff.find(emp => emp.id === attendanceModalEmployee.id) || attendanceModalEmployee) : null, [attendanceModalEmployee, staff]);
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
            module_overrides: buildModuleSelection(initialPresetKey, rolePresets, availableModules),
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

    const { canEditHrRecords = true, canManageStaffAccounts, canCreateStaffAccounts, canDeleteStaffAccounts, requiresStaffSchemaUpdate } = staffProvisioning;
    const canUpdateStaffAccounts = !!canManageStaffAccounts && !requiresStaffSchemaUpdate;
    const canProvisionStaffAccounts = !!canCreateStaffAccounts && !requiresStaffSchemaUpdate;

    const rolePresets = staffProvisioning.rolePresets?.length ? staffProvisioning.rolePresets : FALLBACK_ROLE_PRESETS;
    const availableModules = staffProvisioning.availableModules?.length ? staffProvisioning.availableModules : FALLBACK_MODULES;
    const initialPresetKey = rolePresets[0]?.key || 'hr';
    const presetLabelByKey = useMemo(() => Object.fromEntries(rolePresets.map(p => [p.key, p.label])), [rolePresets]);
    const showReadOnlyToast = () => addToast('Read-only people access can only view records.', 'error');
    const pendingPayrollCount = useMemo(() => {
        const list = Array.isArray(payrolls) ? payrolls : (payrolls?.data || []);
        return list.filter((p) => p.status === 'Pending').length;
    }, [payrolls]);
    const hrAccessSummary = useMemo(() => getHrAccessSummary(canEditHrRecords, canProvisionStaffAccounts, canUpdateStaffAccounts), [canEditHrRecords, canProvisionStaffAccounts, canUpdateStaffAccounts]);

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
        module_overrides: buildModuleSelection(initialPresetKey, rolePresets, availableModules),
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
        module_overrides: buildModuleSelection(initialPresetKey, rolePresets, availableModules),
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
    const openEditModal = (employee) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        const hasLoginAccount = !!employee.has_login_account;
        const workspaceAccessEnabled = employee.login_account?.workspace_access_enabled !== false;
        const presetKey = employee.login_account?.role_preset_key || initialPresetKey;
        const moduleOverrides = hasLoginAccount 
            ? getModuleSelectionFromLogin(employee.login_account, presetKey, rolePresets, availableModules) 
            : buildModuleSelection(presetKey, rolePresets, availableModules);

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
                subtitle="Manage staff profiles, payroll runs, and account access."
                auth={auth}
                onMenuClick={openSidebar}
                badge={{ label: 'Enterprise', iconColor: 'text-clay-400' }}
                actions={
                    <HRHeaderActions
                        canEditHrRecords={canEditHrRecords}
                        onSettingsClick={() => setIsSettingsOpen(true)}
                        onPayrollClick={openPayrollModal}
                        onAddClick={openAddModal}
                    />
                }
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

                <HRTabs activeTab={activeTab} setActiveTab={setActiveTab} />

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

            <HRStickyActionBar
                canEditHrRecords={canEditHrRecords}
                activeTab={activeTab}
                onAddClick={openAddModal}
                onPayrollClick={openPayrollModal}
                onSettingsClick={() => setIsSettingsOpen(true)}
            />
        </>
    );
}

HR.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;

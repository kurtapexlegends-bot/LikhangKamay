import React, { useMemo, useState, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import SellerHeader from '@/Layouts/SellerHeader';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';

import {
    FALLBACK_ROLE_PRESETS,
    FALLBACK_MODULES,
    getHrAccessSummary,
} from '@/utils/hrHelpers';

import HRMetrics from '@/Components/Seller/HR/HRMetrics';
import AttendanceCalendarModal from '@/Components/Seller/HR/AttendanceCalendarModal';
import EmployeeFormModal from '@/Components/Seller/HR/EmployeeFormModal';
import PayrollGenerator from '@/Components/Seller/HR/PayrollGenerator';
import HRSettingsModal from '@/Components/Seller/HR/HRSettingsModal';
import HRHeaderActions from '@/Components/Seller/HR/HRHeaderActions';
import HRTabs from '@/Components/Seller/HR/HRTabs';
import HRTabContentWrapper from '@/Components/Seller/HR/HRTabContentWrapper';

export default function HR({ auth, staff = [], payrolls = [], sellerSettings = {}, staffProvisioning = {}, staffAccessAudits = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { openSidebar } = useSellerWorkspaceShell();
    const [searchTerm, setSearchTerm] = useState('');
    const [attendanceModalEmployee, setAttendanceModalEmployee] = useState(null);
    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);
    
    const activeAttendanceEmployee = useMemo(() => 
        attendanceModalEmployee 
            ? (staff.find(emp => emp.id === attendanceModalEmployee.id) || attendanceModalEmployee) 
            : null, 
        [attendanceModalEmployee, staff]
    );

    const openAddModal = () => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
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
    const presetLabelByKey = useMemo(() => Object.fromEntries(rolePresets.map(p => [p.key, p.label])), [rolePresets]);
    const showReadOnlyToast = () => addToast('Read-only people access can only view records.', 'error');
    
    const pendingPayrollCount = useMemo(() => {
        const list = Array.isArray(payrolls) ? payrolls : (payrolls?.data || []);
        return list.filter((p) => p.status === 'Pending').length;
    }, [payrolls]);
    
    const hrAccessSummary = useMemo(() => 
        getHrAccessSummary(canEditHrRecords, canProvisionStaffAccounts, canUpdateStaffAccounts), 
        [canEditHrRecords, canProvisionStaffAccounts, canUpdateStaffAccounts]
    );

    const openEditModal = (employee) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setEditingEmployee(employee);
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingEmployee(null);
    };

    const deleteEmployee = (id) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setConfirmModal({ isOpen: true, type: 'employee', id });
    };

    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);

    const openPayrollModal = () => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setIsPayrollModalOpen(true);
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

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
                        activeTab={activeTab}
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

                <HRTabContentWrapper
                    activeTab={activeTab}
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
                    openAddModal={openAddModal}
                    payrolls={payrolls}
                    deletePayroll={deletePayroll}
                    staffAccessAudits={staffAccessAudits}
                />
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
                rolePresets={rolePresets}
                availableModules={availableModules}
                canProvisionStaffAccounts={canProvisionStaffAccounts}
                canUpdateStaffAccounts={canUpdateStaffAccounts}
                requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                canEditHrRecords={canEditHrRecords}
            />

            {editingEmployee && (
                <EmployeeFormModal
                    isOpen={isEditModalOpen}
                    onClose={closeEditModal}
                    mode="edit"
                    employee={editingEmployee}
                    rolePresets={rolePresets}
                    availableModules={availableModules}
                    canProvisionStaffAccounts={canProvisionStaffAccounts}
                    canUpdateStaffAccounts={canUpdateStaffAccounts}
                    requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                    canEditHrRecords={canEditHrRecords}
                />
            )}

            <PayrollGenerator
                isOpen={isPayrollModalOpen}
                onClose={() => setIsPayrollModalOpen(false)}
                staff={staff}
                sellerSettings={sellerSettings}
                canEditHrRecords={canEditHrRecords}
                onViewAttendanceLogs={(employeeId) => {
                    const emp = staff.find(e => e.id === employeeId);
                    if (emp) {
                        setAttendanceModalEmployee(emp);
                    }
                }}
                isCalendarOpen={!!attendanceModalEmployee}
            />

            <HRSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                sellerSettings={sellerSettings}
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


        </>
    );
}

HR.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;

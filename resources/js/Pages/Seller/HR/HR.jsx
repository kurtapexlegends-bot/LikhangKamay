import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import ConfirmationModal from '@/Components/ConfirmationModal';
import SellerHeader from '@/Layouts/SellerHeader';
import { Trash2, UserX, UserCheck, UserPlus } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import { AnimatePresence, motion } from 'framer-motion';

import {
    FALLBACK_ROLE_PRESETS,
    FALLBACK_MODULES,
} from '@/utils/hrHelpers';

import HRMetrics from '@/Components/Seller/HR/HRMetrics';
import AttendanceCalendarModal from '@/Components/Seller/HR/AttendanceCalendarModal';
import EmployeeFormModal from '@/Components/Seller/HR/EmployeeFormModal';
import PayrollGenerator from '@/Components/Seller/HR/PayrollGenerator';
import HRSettingsModal from '@/Components/Seller/HR/HRSettingsModal';
import HRTabContentWrapper from '@/Components/Seller/HR/HRTabContentWrapper';
import EmployeeAttendanceDrawer from '@/Components/Seller/HR/EmployeeAttendanceDrawer';
import StaffInspectorPane from '@/Components/Seller/HR/StaffInspectorPane';
import StaffRosterList from '@/Components/Seller/HR/StaffRosterList';
import StaffCardMatrix from '@/Components/Seller/HR/StaffCardMatrix';
import StaffDirectoryToolbar from '@/Components/Seller/HR/StaffDirectoryToolbar';

export default function HR({ auth, staff = [], payrolls = [], sellerSettings = {}, staffProvisioning = {}, staffAccessAudits = [], locations = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const { openSidebar } = useSellerWorkspaceShell();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [viewMode, setViewMode] = useState('list');
    const [directoryFilter, setDirectoryFilter] = useState('all');
    const [entitlementFilter, setEntitlementFilter] = useState('all');
    const [accountFilter, setAccountFilter] = useState('all');
    const [attendanceCalendarEmployee, setAttendanceCalendarEmployee] = useState(null);
    const [auditDrawerEmployee, setAuditDrawerEmployee] = useState(null);
    const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(null);
    
    const activeSelectedEmployee = useMemo(() => {
        if (!selectedEmployee) return null;
        return (staff || []).find(e => e.id === selectedEmployee.id) || selectedEmployee;
    }, [selectedEmployee, staff]);

    const activeAttendanceEmployee = useMemo(() => 
        attendanceCalendarEmployee 
            ? (staff.find(emp => emp.id === attendanceCalendarEmployee.id) || attendanceCalendarEmployee) 
            : null, 
        [attendanceCalendarEmployee, staff]
    );

    const filteredStaff = useMemo(() => {
        return (staff || []).filter((emp) => {
            if (searchTerm) {
                const q = searchTerm.toLowerCase();
                const match = (
                    (emp.name && emp.name.toLowerCase().includes(q)) ||
                    (emp.role && emp.role.toLowerCase().includes(q)) ||
                    (emp.employee_id && emp.employee_id.toLowerCase().includes(q))
                );
                if (!match) return false;
            }

            if (directoryFilter === 'clocked_in') {
                if (!(emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session)) return false;
            } else if (directoryFilter === 'paused') {
                if (emp.attendance?.current_state !== 'paused') return false;
            } else if (directoryFilter === 'off_duty') {
                if (emp.attendance?.current_state === 'clocked_in' || emp.attendance?.current_state === 'paused') return false;
            }

            if (entitlementFilter !== 'all') {
                const perms = emp.login_account?.module_permissions || {};
                if (entitlementFilter === 'orders' && !perms.orders) return false;
                if (entitlementFilter === 'accounting' && !perms.accounting) return false;
                if (entitlementFilter === 'procurement' && !perms.procurement) return false;
                if (entitlementFilter === 'hr' && !perms.hr) return false;
                if (entitlementFilter === 'catalog' && !perms.catalog) return false;
            }

            if (accountFilter !== 'all') {
                const hasLogin = emp.has_login_account || !!emp.login_account;
                if (accountFilter === 'portal' && (!hasLogin || emp.login_account?.workspace_access_enabled === false)) return false;
                if (accountFilter === 'manual' && hasLogin) return false;
                if (accountFilter === 'suspended' && !(emp.login_account?.workspace_access_enabled === false || emp.status?.toLowerCase() === 'suspended')) return false;
            }

            return true;
        });
    }, [staff, searchTerm, directoryFilter, entitlementFilter, accountFilter]);

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
    const [suspensionModal, setSuspensionModal] = useState({ isOpen: false, employee: null });
    const getInitialTab = () => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam && ['directory', 'payroll', 'access'].includes(tabParam)) {
                return tabParam;
            }
        }
        return 'directory';
    };

    const [activeTab, setActiveTabState] = useState(getInitialTab);

    const setActiveTab = useCallback((newTab) => {
        setActiveTabState(newTab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (newTab === 'directory') {
                url.searchParams.delete('tab');
            } else {
                url.searchParams.set('tab', newTab);
            }
            window.history.replaceState({}, '', url.toString());
        }
    }, []);

    useEffect(() => {
        const handlePopState = () => {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab');
            if (tabParam && ['directory', 'payroll', 'access'].includes(tabParam)) {
                setActiveTabState(tabParam);
            } else {
                setActiveTabState('directory');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
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

    const hrTabs = useMemo(() => [
        { key: 'directory', label: 'Directory', count: staff?.length || 0 },
        { key: 'payroll', label: 'Payroll History', count: pendingPayrollCount > 0 ? pendingPayrollCount : null },
        { key: 'access', label: 'Access History' },
    ], [staff?.length, pendingPayrollCount]);
    
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

    const toggleSuspension = (employee) => {
        if (!canEditHrRecords) { showReadOnlyToast(); return; }
        setSuspensionModal({ isOpen: true, employee });
    };

    const confirmToggleSuspension = () => {
        if (!suspensionModal.employee) return;
        const emp = suspensionModal.employee;
        router.post(route('hr.employees.toggle-suspension', emp.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                addToast(page?.props?.flash?.success || 'Employee status updated', 'success');
                setSuspensionModal({ isOpen: false, employee: null });
            },
            onError: (err) => {
                const errorMsg = Object.values(err)[0] || 'Failed to update employee status.';
                addToast(errorMsg, 'error');
                setSuspensionModal({ isOpen: false, employee: null });
            },
        });
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
                onSuccess: () => addToast('Draft payroll run cancelled', 'success'),
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
            />

            <main className="flex-1 w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 space-y-6">
                <HRMetrics
                    staff={staff}
                    pendingPayrollCount={pendingPayrollCount}
                    animate={shouldAnimateKPI}
                />

                {activeTab === 'directory' ? (
                    <div className="space-y-4">
                        <StaffDirectoryToolbar
                            tabs={hrTabs}
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            filterState={directoryFilter}
                            setFilterState={setDirectoryFilter}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            totalCount={filteredStaff.length}
                            canEditHrRecords={canEditHrRecords}
                            onAddClick={openAddModal}
                            entitlementFilter={entitlementFilter}
                            setEntitlementFilter={setEntitlementFilter}
                            accountFilter={accountFilter}
                            setAccountFilter={setAccountFilter}
                        />

                        <div className="relative">
                            <div className="flex flex-col lg:flex-row items-start min-w-0">
                                {/* Master List or Cards with Smooth Width Adaptation */}
                                <div className="flex-1 min-w-0 w-full">
                                    {viewMode === 'list' ? (
                                        <StaffRosterList
                                            staff={filteredStaff}
                                            selectedEmployeeId={activeSelectedEmployee?.id}
                                            onSelectEmployee={(emp) => setSelectedEmployee(emp.id === activeSelectedEmployee?.id ? null : emp)}
                                            isDualPane={!!activeSelectedEmployee}
                                        />
                                    ) : (
                                        <StaffCardMatrix
                                            staff={filteredStaff}
                                            selectedEmployeeId={activeSelectedEmployee?.id}
                                            onSelectEmployee={(emp) => setSelectedEmployee(emp.id === activeSelectedEmployee?.id ? null : emp)}
                                            canEditHrRecords={canEditHrRecords}
                                            openEditModal={openEditModal}
                                            openAttendanceModal={setAttendanceCalendarEmployee}
                                            openTimeCard={(emp) => router.visit(route('hr.employees.time-card', emp.id))}
                                            onAddClick={openAddModal}
                                            isDualPane={!!activeSelectedEmployee}
                                        />
                                    )}
                                </div>

                                {/* Desktop Inspector Drawer with Synchronized Width & Slide */}
                                <AnimatePresence initial={false}>
                                    {activeSelectedEmployee && (
                                        <motion.div
                                            key="desktop-inspector-pane"
                                            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
                                            animate={{ width: 380, opacity: 1, marginLeft: 20 }}
                                            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
                                            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                            className="hidden lg:block shrink-0 sticky top-4 overflow-hidden"
                                        >
                                            <div className="w-[380px]">
                                                <StaffInspectorPane
                                                    key={activeSelectedEmployee.id}
                                                    employee={activeSelectedEmployee}
                                                    onClose={() => setSelectedEmployee(null)}
                                                    onEdit={openEditModal}
                                                    onToggleSuspension={toggleSuspension}
                                                    onOpenCalendar={setAttendanceCalendarEmployee}
                                                    onOpenTimeCard={(emp) => router.visit(route('hr.employees.time-card', emp.id))}
                                                    canEditHrRecords={canEditHrRecords}
                                                    canManageStaffAccounts={canManageStaffAccounts}
                                                    presetLabelByKey={presetLabelByKey}
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Mobile Slide-Up Modal / Bottom Sheet for Inspector */}
                            <AnimatePresence>
                                {activeSelectedEmployee && (
                                    <motion.div
                                        key="mobile-inspector-backdrop"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={() => setSelectedEmployee(null)}
                                        className="fixed inset-0 z-50 lg:hidden flex items-end justify-center bg-stone-900/40 backdrop-blur-xs p-0 sm:p-4"
                                    >
                                        <motion.div
                                            key="mobile-inspector-sheet"
                                            initial={{ opacity: 0, y: '100%' }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: '100%' }}
                                            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]"
                                        >
                                            <StaffInspectorPane
                                                key={activeSelectedEmployee.id}
                                                employee={activeSelectedEmployee}
                                                onClose={() => setSelectedEmployee(null)}
                                                onEdit={openEditModal}
                                                onToggleSuspension={toggleSuspension}
                                                onOpenCalendar={setAttendanceCalendarEmployee}
                                                onOpenTimeCard={(emp) => router.visit(route('hr.employees.time-card', emp.id))}
                                                canEditHrRecords={canEditHrRecords}
                                                canManageStaffAccounts={canManageStaffAccounts}
                                                presetLabelByKey={presetLabelByKey}
                                            />
                                        </motion.div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                ) : (
                    <HRTabContentWrapper
                        tabs={hrTabs}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        pendingPayrollCount={pendingPayrollCount}
                        staff={staff}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        canEditHrRecords={canEditHrRecords}
                        canManageStaffAccounts={canManageStaffAccounts}
                        canDeleteStaffAccounts={canDeleteStaffAccounts}
                        openEditModal={openEditModal}
                        deleteEmployee={deleteEmployee}
                        onToggleSuspension={toggleSuspension}
                        openAttendanceModal={setAttendanceCalendarEmployee}
                        openAuditDrawer={setAuditDrawerEmployee}
                        presetLabelByKey={presetLabelByKey}
                        monthLabel={sellerSettings.attendance_month_label || 'Current Month'}
                        openAddModal={openAddModal}
                        openPayrollModal={openPayrollModal}
                        payrolls={payrolls}
                        deletePayroll={deletePayroll}
                        staffAccessAudits={staffAccessAudits}
                    />
                )}

                {canEditHrRecords && activeTab === 'directory' && (
                    <button
                        type="button"
                        onClick={openAddModal}
                        aria-label="Add new staff member"
                        className="fixed bottom-6 right-4 z-40 md:hidden flex items-center gap-2 rounded-full bg-clay-600 px-4 py-3 text-sm font-bold text-white shadow-xl shadow-clay-900/20 active:scale-95 transition-all hover:bg-clay-700 min-h-[48px] focus:outline-none focus:ring-2 focus:ring-clay-500 focus:ring-offset-2"
                    >
                        <UserPlus size={18} className="shrink-0" />
                        <span>Add Staff</span>
                    </button>
                )}
            </main>

            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode="add"
                rolePresets={rolePresets}
                availableModules={availableModules}
                canProvisionStaffAccounts={canProvisionStaffAccounts}
                canUpdateStaffAccounts={canUpdateStaffAccounts}
                canDeleteStaffAccounts={canDeleteStaffAccounts}
                requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                canEditHrRecords={canEditHrRecords}
                sellerLocations={locations}
                sellerSettings={sellerSettings}
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
                    canDeleteStaffAccounts={canDeleteStaffAccounts}
                    requiresStaffSchemaUpdate={requiresStaffSchemaUpdate}
                    canEditHrRecords={canEditHrRecords}
                    sellerLocations={locations}
                    sellerSettings={sellerSettings}
                    onDelete={deleteEmployee}
                />
            )}

            <PayrollGenerator
                isOpen={isPayrollModalOpen}
                onClose={() => setIsPayrollModalOpen(false)}
                staff={staff}
                sellerSettings={sellerSettings}
                canEditHrRecords={canEditHrRecords}
                onMonthChange={handleMonthChange}
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
                title={confirmModal.type === 'employee' ? 'Remove staff member?' : 'Cancel draft payroll run?'}
                message={confirmModal.type === 'employee'
                    ? 'This will remove the staff member from your active team and revoke portal access. Past payroll distributions, approved compensation, and attendance logs will remain safely archived for audit compliance.'
                    : 'This draft payroll run will be cancelled. Past submitted and paid periods are unaffected.'}
                icon={Trash2}
                iconBg="bg-red-50 text-red-600"
                confirmText={confirmModal.type === 'employee' ? 'Remove Staff Member' : 'Cancel Payroll Run'}
                confirmColor="bg-red-600 hover:bg-red-700"
                isVeryHighRisk={true}
            />

            <ConfirmationModal
                isOpen={suspensionModal.isOpen}
                onClose={() => setSuspensionModal({ isOpen: false, employee: null })}
                onConfirm={confirmToggleSuspension}
                title={
                    suspensionModal.employee?.status?.toLowerCase() === 'suspended' || suspensionModal.employee?.login_account?.workspace_access_enabled === false
                        ? `Reactivate ${suspensionModal.employee?.name}?`
                        : `Suspend ${suspensionModal.employee?.name}?`
                }
                message={
                    suspensionModal.employee?.status?.toLowerCase() === 'suspended' || suspensionModal.employee?.login_account?.workspace_access_enabled === false
                        ? 'This will restore their workspace portal login, shift clock-in capabilities, and role module access.'
                        : 'This will temporarily pause their portal login and shift attendance. All past payroll logs and timesheets remain safely saved.'
                }
                icon={
                    suspensionModal.employee?.status?.toLowerCase() === 'suspended' || suspensionModal.employee?.login_account?.workspace_access_enabled === false
                        ? UserCheck
                        : UserX
                }
                iconBg={
                    suspensionModal.employee?.status?.toLowerCase() === 'suspended' || suspensionModal.employee?.login_account?.workspace_access_enabled === false
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                }
                confirmText={
                    suspensionModal.employee?.status?.toLowerCase() === 'suspended' || suspensionModal.employee?.login_account?.workspace_access_enabled === false
                        ? 'Reactivate Employee'
                        : 'Suspend Employee'
                }
                confirmColor={
                    suspensionModal.employee?.status?.toLowerCase() === 'suspended' || suspensionModal.employee?.login_account?.workspace_access_enabled === false
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-amber-600 hover:bg-amber-700'
                }
            />

            <AttendanceCalendarModal
                employee={activeAttendanceEmployee}
                selectedDate={selectedAttendanceDate}
                onSelectDate={setSelectedAttendanceDate}
                onClose={() => setAttendanceCalendarEmployee(null)}
                sellerSettings={sellerSettings}
                onMonthChange={handleMonthChange}
            />

            <EmployeeAttendanceDrawer
                employee={auditDrawerEmployee}
                isOpen={!!auditDrawerEmployee}
                onClose={() => setAuditDrawerEmployee(null)}
            />
        </>
    );
}

HR.layout = (page) => <SellerWorkspaceLayout active="hr">{page}</SellerWorkspaceLayout>;

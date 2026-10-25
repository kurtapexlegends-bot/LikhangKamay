import React from 'react';
import StaffTable from '@/Components/Seller/HR/StaffTable';
import PayrollHistoryTable from '@/Components/Seller/HR/PayrollHistoryTable';
import AccessAuditLog from '@/Components/Seller/HR/AccessAuditLog';
import PayrollRunwayHeader from '@/Components/Seller/HR/PayrollRunwayHeader';

export default function HRTabContentWrapper({
    tabs,
    activeTab,
    setActiveTab,
    pendingPayrollCount,
    staff,
    searchTerm,
    setSearchTerm,
    canEditHrRecords,
    canManageStaffAccounts,
    canDeleteStaffAccounts,
    openEditModal,
    deleteEmployee,
    onToggleSuspension,
    openAttendanceModal,
    openAuditDrawer,
    presetLabelByKey,
    monthLabel,
    openAddModal,
    openPayrollModal,
    payrolls,
    deletePayroll,
    staffAccessAudits
}) {
    if (activeTab === 'directory') {
        return (
            <StaffTable
                tabs={tabs}
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
                onToggleSuspension={onToggleSuspension}
                openAttendanceModal={openAttendanceModal}
                openAuditDrawer={openAuditDrawer}
                presetLabelByKey={presetLabelByKey}
                monthLabel={monthLabel}
                onAddClick={openAddModal}
            />
        );
    }

    if (activeTab === 'payroll') {
        return (
            <div className="space-y-5">
                <PayrollRunwayHeader
                    staff={staff}
                    monthLabel={monthLabel}
                    pendingPayrollCount={pendingPayrollCount}
                    openPayrollModal={openPayrollModal}
                    canEditHrRecords={canEditHrRecords}
                />
                <PayrollHistoryTable
                    tabs={tabs}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    pendingPayrollCount={pendingPayrollCount}
                    staffCount={staff?.length || 0}
                    payrolls={payrolls}
                    canEditHrRecords={canEditHrRecords}
                    deletePayroll={deletePayroll}
                    openPayrollModal={openPayrollModal}
                />
            </div>
        );
    }

    if (activeTab === 'access') {
        return (
            <AccessAuditLog
                tabs={tabs}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                pendingPayrollCount={pendingPayrollCount}
                staffCount={staff?.length || 0}
                auditEntries={staffAccessAudits}
            />
        );
    }

    return null;
}

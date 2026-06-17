import React from 'react';
import StaffTable from '@/Components/Seller/HR/StaffTable';
import PayrollHistoryTable from '@/Components/Seller/HR/PayrollHistoryTable';
import AccessAuditLog from '@/Components/Seller/HR/AccessAuditLog';

export default function HRTabContentWrapper({
    activeTab,
    staff,
    searchTerm,
    setSearchTerm,
    canEditHrRecords,
    canDeleteStaffAccounts,
    openEditModal,
    deleteEmployee,
    openAttendanceModal,
    presetLabelByKey,
    monthLabel,
    openAddModal,
    payrolls,
    deletePayroll,
    staffAccessAudits
}) {
    if (activeTab === 'directory') {
        return (
            <StaffTable
                staff={staff}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                canEditHrRecords={canEditHrRecords}
                canDeleteStaffAccounts={canDeleteStaffAccounts}
                openEditModal={openEditModal}
                deleteEmployee={deleteEmployee}
                openAttendanceModal={openAttendanceModal}
                presetLabelByKey={presetLabelByKey}
                monthLabel={monthLabel}
                onAddClick={openAddModal}
            />
        );
    }

    if (activeTab === 'payroll') {
        return (
            <PayrollHistoryTable
                payrolls={payrolls}
                canEditHrRecords={canEditHrRecords}
                deletePayroll={deletePayroll}
            />
        );
    }

    if (activeTab === 'access') {
        return (
            <AccessAuditLog
                auditEntries={staffAccessAudits}
            />
        );
    }

    return null;
}

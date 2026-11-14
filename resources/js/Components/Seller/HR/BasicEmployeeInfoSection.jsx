import React from 'react';
import EmployeeIdentityCard from '@/Components/Seller/HR/EmployeeForm/EmployeeIdentityCard';
import EmployeeDriverLogisticsCard from '@/Components/Seller/HR/EmployeeForm/EmployeeDriverLogisticsCard';
import EmployeeDocumentsVaultCard from '@/Components/Seller/HR/EmployeeForm/EmployeeDocumentsVaultCard';
import EmployeeSchedulePolicyCard from '@/Components/Seller/HR/EmployeeForm/EmployeeSchedulePolicyCard';
import EmployeeAttendanceLocationCard from '@/Components/Seller/HR/EmployeeForm/EmployeeAttendanceLocationCard';

export default function BasicEmployeeInfoSection({
    data,
    setData,
    errors = {},
    showLinkedLoginUpdateFields,
    getPresetRoleLabel,
    handleManualRoleChange,
    employeeIdValidation,
    isEmployeeIdSaved,
    sellerLocations = [],
    sellerSettings = {},
    driverLicensePhotoUrl = null,
    employeeId = null,
    documents = [],
    isDocumentsLoading = false,
    onDocumentsMutated = null,
    stagedDocuments = [],
    onAddStagedDocument = null,
    onRemoveStagedDocument = null,
    documentTypes = {},
    canEditHrRecords = true,
}) {
    const isDriver = data.role === 'Logistics & Driver' || data.role === 'Logistics / Driver' || data.role === 'Driver' || data.staff_role_preset_key === 'driver';

    return (
        <div className="space-y-4">
            {/* 1. Identity, Employee ID, Role, Salary */}
            <EmployeeIdentityCard
                data={data}
                setData={setData}
                errors={errors}
                showLinkedLoginUpdateFields={showLinkedLoginUpdateFields}
                getPresetRoleLabel={getPresetRoleLabel}
                handleManualRoleChange={handleManualRoleChange}
                employeeIdValidation={employeeIdValidation}
                isEmployeeIdSaved={isEmployeeIdSaved}
            />

            {/* 2. Driver Logistics & Vehicle Details (Visible for drivers) */}
            {isDriver && (
                <EmployeeDriverLogisticsCard
                    data={data}
                    setData={setData}
                    errors={errors}
                    driverLicensePhotoUrl={driverLicensePhotoUrl}
                />
            )}

            {/* 3. Employee Documents Vault */}
            <EmployeeDocumentsVaultCard
                employeeId={employeeId}
                documents={documents}
                isLoading={isDocumentsLoading}
                onDocumentsMutated={onDocumentsMutated}
                stagedDocuments={stagedDocuments}
                onAddStagedDocument={onAddStagedDocument}
                onRemoveStagedDocument={onRemoveStagedDocument}
                documentTypes={documentTypes}
                canEdit={canEditHrRecords}
            />

            {/* 4. Work Schedule & Shift Policy */}
            <EmployeeSchedulePolicyCard
                data={data}
                setData={setData}
                sellerSettings={sellerSettings}
            />

            {/* 5. Attendance & Location */}
            <EmployeeAttendanceLocationCard
                data={data}
                setData={setData}
                sellerLocations={sellerLocations}
            />
        </div>
    );
}

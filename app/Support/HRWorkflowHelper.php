<?php

namespace App\Support;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\User;
use App\Services\SellerEntitlementService;
use App\Services\StaffAttendanceService;
use App\Support\HR\HRRolePresets;
use App\Support\HR\HRStaffProvisioner;
use App\Support\HR\HREmployeeLoader;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class HRWorkflowHelper
{
    public static function canEditHrRecords(User $actor): bool
    {
        return HRStaffProvisioner::canEditHrRecords($actor);
    }

    public static function rolePresetOptions(SellerEntitlementService $entitlementService): array
    {
        return HRRolePresets::rolePresetOptions($entitlementService);
    }

    public static function moduleOptions(SellerEntitlementService $entitlementService): array
    {
        return HRRolePresets::moduleOptions($entitlementService);
    }

    public static function supportsStaffProvisioningSchema(): bool
    {
        return HRStaffProvisioner::supportsStaffProvisioningSchema();
    }

    public static function supportsStaffAccessAuditSchema(): bool
    {
        return HRStaffProvisioner::supportsStaffAccessAuditSchema();
    }

    public static function userLevelOptions(): array
    {
        return HRRolePresets::userLevelOptions();
    }

    public static function permissionLevelLabel(?string $level): string
    {
        return HRRolePresets::permissionLevelLabel($level);
    }

    public static function resolveRequestedStaffAccessPermissionLevel(Request $request): string
    {
        return HRStaffProvisioner::resolveRequestedStaffAccessPermissionLevel($request);
    }

    public static function normalizeRequestedModuleOverrides(
        array $requestedOverrides,
        array $supportedModules,
        string $presetKey,
        ?string $legacyPermissionLevel = null
    ): array {
        return HRStaffProvisioner::normalizeRequestedModuleOverrides(
            $requestedOverrides,
            $supportedModules,
            $presetKey,
            $legacyPermissionLevel
        );
    }

    public static function rolePresetModules(string $presetKey): array
    {
        return HRRolePresets::rolePresetModules($presetKey);
    }

    public static function buildStaffAccessSnapshot(User $staffUser): array
    {
        return HRStaffProvisioner::buildStaffAccessSnapshot($staffUser);
    }

    public static function recordStaffAccessAudit(
        User $seller,
        User $actor,
        string $event,
        Employee $employee,
        ?User $staffUser,
        array $details = []
    ): void {
        HREmployeeLoader::recordStaffAccessAudit($seller, $actor, $event, $employee, $staffUser, $details);
    }

    public static function notifyAccountingOfPayrollRun(Payroll $payroll, User $seller, string $month, User $actor): void
    {
        HREmployeeLoader::notifyAccountingOfPayrollRun($payroll, $seller, $month, $actor);
    }

    public static function accountingRecipientsForSeller(User $seller): Collection
    {
        return HREmployeeLoader::accountingRecipientsForSeller($seller);
    }

    public static function buildEmployeeUpdateSuccessMessage(
        bool $createdLogin,
        bool $workspaceSuspended,
        bool $workspaceRestored,
        bool $emailChanged,
        bool $passwordReset
    ): string {
        return HRStaffProvisioner::buildEmployeeUpdateSuccessMessage(
            $createdLogin,
            $workspaceSuspended,
            $workspaceRestored,
            $emailChanged,
            $passwordReset
        );
    }

    public static function appendLoginUpdateFollowUps(string $message, bool $emailChanged, bool $passwordReset): string
    {
        return HRStaffProvisioner::appendLoginUpdateFollowUps($message, $emailChanged, $passwordReset);
    }

    public static function serializePayrollRun(Payroll $payroll, User $seller): array
    {
        return HREmployeeLoader::serializePayrollRun($payroll, $seller);
    }

    public static function getEmployeeRecordsWithLogin(User $seller): Collection
    {
        return HREmployeeLoader::getEmployeeRecordsWithLogin($seller);
    }

    public static function getRecentAccessAudits(User $seller): array
    {
        return HREmployeeLoader::getRecentAccessAudits($seller);
    }

    public static function resolveActivePeriod(Request $request): Carbon
    {
        return HREmployeeLoader::resolveActivePeriod($request);
    }

    public static function getEmployeesWithAttendance(
        User $seller,
        StaffAttendanceService $attendanceService,
        ?Carbon $parsedMonth = null
    ): Collection {
        return HREmployeeLoader::getEmployeesWithAttendance($seller, $attendanceService, $parsedMonth);
    }

    public static function buildSellerSettings(User $seller, Carbon $activePeriod): array
    {
        return HREmployeeLoader::buildSellerSettings($seller, $activePeriod);
    }

    public static function buildStaffProvisioningData(
        User $actor,
        SellerEntitlementService $entitlementService,
        bool $supportsProvisioning,
        bool $canEditHrRecords
    ): array {
        return HRStaffProvisioner::buildStaffProvisioningData($actor, $entitlementService, $supportsProvisioning, $canEditHrRecords);
    }

    public static function sanitizeAndPrepareProvisionRequest(Request $request): void
    {
        HRStaffProvisioner::sanitizeAndPrepareProvisionRequest($request);
    }

    public static function getProvisionValidationRules(
        User $seller,
        SellerEntitlementService $entitlementService,
        ?Employee $employee = null,
        ?User $linkedLogin = null,
        bool $shouldManageLoginSettings = false
    ): array {
        return HRStaffProvisioner::getProvisionValidationRules(
            $seller,
            $entitlementService,
            $employee,
            $linkedLogin,
            $shouldManageLoginSettings
        );
    }

    public static function handleUpdateAuditLog(
        User $seller,
        User $actor,
        Employee $employee,
        ?User $linkedLogin,
        ?array $auditBefore,
        array $result
    ): void {
        HREmployeeLoader::handleUpdateAuditLog($seller, $actor, $employee, $linkedLogin, $auditBefore, $result);
    }

    public static function parseSelectedPayrollItems(array $validated): array
    {
        return HREmployeeLoader::parseSelectedPayrollItems($validated);
    }
}

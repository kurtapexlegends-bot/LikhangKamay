<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Schema;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HrStaffProvisioningTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_employee_record_without_login_account(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Maria Santos',
            'role' => 'Assistant',
            'salary' => 14500,
            'create_login_account' => false,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee added successfully.');

        $employee = Employee::first();

        $this->assertNotNull($employee);
        $this->assertSame($owner->id, $employee->user_id);
        $this->assertSame('Maria Santos', $employee->name);
        $this->assertSame('Assistant', $employee->role);
        $this->assertSame('Active', $employee->status);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_owner_can_create_employee_and_linked_staff_login_with_verification_requirements(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Jose Reyes',
            'role' => 'Accounting Clerk',
            'salary' => 18500,
            'create_login_account' => true,
            'email' => 'jose.reyes@gmail.com',
            'default_password' => 'password',
            'staff_user_level' => 'standard',
            'staff_role_preset_key' => 'accounting',
            'module_overrides' => [
                'accounting' => true,
                'overview' => true,
                'orders' => false,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee and staff login created. A verification email was sent.');

        $employee = Employee::first();
        $staff = User::where('role', 'staff')->first();

        $this->assertNotNull($employee);
        $this->assertNotNull($staff);
        $this->assertSame($owner->id, $employee->user_id);
        $this->assertSame($employee->id, $staff->employee_id);
        $this->assertSame($owner->id, $staff->seller_owner_id);
        $this->assertSame($owner->id, $staff->created_by_user_id);
        $this->assertSame('standard', $staff->getStaffUserLevel());
        $this->assertSame('accounting', $staff->staff_role_preset_key);
        $this->assertTrue((bool) data_get($staff->staff_module_permissions, 'accounting'));
        $this->assertTrue((bool) data_get($staff->staff_module_permissions, 'overview'));
        $this->assertFalse((bool) $staff->email_verified_at);
        $this->assertTrue($staff->must_change_password);

        $this->post('/logout');
        Notification::assertSentTo($staff, VerifyEmailNotification::class);

        $loginResponse = $this->post('/login', [
            'email' => 'jose.reyes@gmail.com',
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($staff);
        $loginResponse->assertRedirect(route('verification.notice', absolute: false));
    }

    public function test_owner_can_grant_staff_access_management_permission_without_using_legacy_user_level(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Nina Torres',
            'role' => 'HR Officer',
            'salary' => 21000,
            'create_login_account' => true,
            'email' => 'nina.torres@gmail.com',
            'default_password' => 'password',
            'manage_staff_accounts' => true,
            'staff_role_preset_key' => 'hr',
            'module_overrides' => [
                'hr' => true,
                'overview' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee and staff login created. A verification email was sent.');

        $staff = User::where('email', 'nina.torres@gmail.com')->first();

        $this->assertNotNull($staff);
        $this->assertTrue($staff->hasStaffManagementPermission());
        $this->assertTrue($staff->canManageStaffAccounts());
        $this->assertTrue((bool) data_get($staff->staff_module_permissions, User::STAFF_MANAGE_STAFF_ACCOUNTS_FLAG));

        Notification::assertSentTo($staff, VerifyEmailNotification::class);
    }

    public function test_owner_can_assign_update_access_permission_level_without_granting_full_staff_account_control(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Paolo Cruz',
            'role' => 'HR Coordinator',
            'salary' => 19800,
            'create_login_account' => true,
            'email' => 'paolo.cruz@gmail.com',
            'default_password' => 'password',
            'staff_access_permission_level' => User::STAFF_ACCESS_PERMISSION_UPDATE,
            'staff_role_preset_key' => 'hr',
            'module_overrides' => [
                'hr' => true,
                'overview' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee and staff login created. A verification email was sent.');

        $staff = User::where('email', 'paolo.cruz@gmail.com')->first();

        $this->assertNotNull($staff);
        $this->assertSame(User::STAFF_ACCESS_PERMISSION_UPDATE, $staff->getStaffAccessPermissionLevel());
        $this->assertTrue($staff->hasStaffManagementPermission());
        $this->assertTrue($staff->canManageStaffAccounts());
        $this->assertFalse($staff->canCreateStaffAccounts());
        $this->assertFalse($staff->canDeleteStaffAccounts());
        $this->assertSame(
            User::STAFF_ACCESS_PERMISSION_UPDATE,
            data_get($staff->staff_module_permissions, User::STAFF_ACCESS_PERMISSION_LEVEL_FLAG)
        );

        Notification::assertSentTo($staff, VerifyEmailNotification::class);
    }

    public function test_staff_login_creation_requires_gmail_address(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $response = $this->from(route('hr.index'))->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Ana Cruz',
            'role' => 'HR Assistant',
            'salary' => 16000,
            'create_login_account' => true,
            'email' => 'ana@company.com',
            'default_password' => 'password',
            'staff_user_level' => 'standard',
            'staff_role_preset_key' => 'hr',
            'module_overrides' => [
                'hr' => true,
            ],
        ]);

        $response->assertRedirect(route('hr.index'));
        $response->assertSessionHasErrors('email');
        $this->assertDatabaseCount('employees', 0);
        $this->assertDatabaseCount('users', 1);
    }

    public function test_hr_staff_cannot_create_login_accounts_or_assign_permissions(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $response = $this->actingAs($staff)->post(route('hr.store'), [
            'name' => 'Blocked User',
            'role' => 'Assistant',
            'salary' => 12000,
            'create_login_account' => true,
            'email' => 'blocked.user@gmail.com',
            'default_password' => 'password',
            'staff_user_level' => 'standard',
            'staff_role_preset_key' => 'procurement',
            'module_overrides' => [
                'procurement' => true,
            ],
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'blocked.user@gmail.com']);
        Notification::assertNothingSent();
    }

    public function test_hr_staff_with_read_only_access_cannot_create_employee_records(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $response = $this->actingAs($staff)->post(route('hr.store'), [
            'name' => 'Read Only Attempt',
            'role' => 'Assistant',
            'salary' => 12000,
            'create_login_account' => false,
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('employees', ['name' => 'Read Only Attempt']);
    }

    public function test_staff_manager_with_hr_access_can_create_login_accounts(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();
        $manager = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withStaffUserLevelFlag(['hr' => true], 'manager'),
        ]);
        StaffAttendanceSession::create([
            'staff_user_id' => $manager->id,
            'seller_owner_id' => $owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $response = $this->actingAs($manager)->post(route('hr.store'), [
            'name' => 'Managed User',
            'role' => 'Assistant',
            'salary' => 13800,
            'create_login_account' => true,
            'email' => 'managed.user@gmail.com',
            'default_password' => 'password',
            'staff_user_level' => 'standard',
            'staff_role_preset_key' => 'customer_support',
            'module_overrides' => [
                'orders' => true,
                'reviews' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee and staff login created. A verification email was sent.');

        $staff = User::where('email', 'managed.user@gmail.com')->first();

        $this->assertNotNull($staff);
        $this->assertSame('standard', $staff->getStaffUserLevel());
        $this->assertSame('customer_support', $staff->staff_role_preset_key);
        Notification::assertSentTo($staff, VerifyEmailNotification::class);
    }

    public function test_staff_with_update_access_cannot_create_new_login_accounts(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();
        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withStaffAccessPermissionLevelFlag(['hr' => true], User::STAFF_ACCESS_PERMISSION_UPDATE),
        ]);
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        $response = $this->actingAs($staff)->post(route('hr.store'), [
            'name' => 'Limited User',
            'role' => 'Assistant',
            'salary' => 13800,
            'create_login_account' => true,
            'email' => 'limited.user@gmail.com',
            'default_password' => 'password',
            'staff_access_permission_level' => User::STAFF_ACCESS_PERMISSION_READ_ONLY,
            'staff_role_preset_key' => 'customer_support',
            'module_overrides' => [
                'orders' => true,
                'messages' => true,
                'reviews' => true,
            ],
        ]);

        $response->assertForbidden();
        $this->assertDatabaseMissing('users', ['email' => 'limited.user@gmail.com']);
        Notification::assertNothingSent();
    }

    public function test_owner_can_submit_staff_only_alias_and_it_normalizes_to_standard_level(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Staff Alias User',
            'role' => 'Assistant',
            'salary' => 13800,
            'create_login_account' => true,
            'email' => 'staff.only.alias@gmail.com',
            'default_password' => 'password',
            'staff_user_level' => 'staff_only',
            'staff_role_preset_key' => 'customer_support',
            'module_overrides' => [
                'orders' => true,
                'reviews' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee and staff login created. A verification email was sent.');

        $staff = User::where('email', 'staff.only.alias@gmail.com')->first();

        $this->assertNotNull($staff);
        $this->assertSame('standard', $staff->getStaffUserLevel());
    }

    public function test_hr_staff_cannot_delete_employees_with_linked_login_accounts(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Linked Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $response = $this->actingAs($staff)->delete(route('hr.destroy', $employee->id));

        $response->assertForbidden();
        $this->assertDatabaseHas('employees', ['id' => $employee->id]);
        $this->assertDatabaseHas('users', ['id' => $linkedLogin->id]);
    }

    public function test_owner_can_delete_employees_with_linked_login_accounts(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Owner Removable Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $response = $this->actingAs($owner)->delete(route('hr.destroy', $employee->id));

        $response->assertRedirect();
        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertDatabaseMissing('users', ['id' => $linkedLogin->id]);
    }

    public function test_owner_can_update_employee_record_and_sync_linked_login_name(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Original Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'name' => 'Original Employee',
            'email' => 'original.employee@gmail.com',
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $response = $this->actingAs($owner)->patch(route('hr.update', $employee->id), [
            'name' => 'Updated Employee',
            'role' => 'HR Coordinator',
            'salary' => 18750,
            'create_login_account' => true,
            'email' => $linkedLogin->email,
            'default_password' => '',
            'staff_user_level' => 'standard',
            'staff_role_preset_key' => $linkedLogin->staff_role_preset_key,
            'module_overrides' => [
                'hr' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee details updated successfully.');
        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'name' => 'Updated Employee',
            'role' => 'HR Coordinator',
            'salary' => 18750,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $linkedLogin->id,
            'name' => 'Updated Employee',
        ]);
    }

    public function test_owner_can_update_linked_login_access_details_from_employee_update(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Linked Employee',
            'role' => 'HR',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'name' => 'Linked Employee',
            'email' => 'linked.employee@gmail.com',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $response = $this->actingAs($owner)->patch(route('hr.update', $employee->id), [
            'name' => 'Linked Employee Updated',
            'role' => 'Accounting',
            'salary' => 19500,
            'create_login_account' => true,
            'email' => 'linked.updated@gmail.com',
            'default_password' => 'password',
            'staff_user_level' => 'manager',
            'staff_role_preset_key' => 'accounting',
            'module_overrides' => [
                'accounting' => true,
                'overview' => true,
                'hr' => false,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas(
            'success',
            'Employee and seller login updated successfully. A verification email was sent to the updated address. The employee must change the new password on next sign-in.'
        );

        $linkedLogin->refresh();

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'name' => 'Linked Employee Updated',
            'role' => 'Accounting',
            'salary' => 19500,
        ]);
        $this->assertSame('linked.updated@gmail.com', $linkedLogin->email);
        $this->assertSame('manager', $linkedLogin->getStaffUserLevel());
        $this->assertSame('accounting', $linkedLogin->staff_role_preset_key);
        $this->assertTrue((bool) data_get($linkedLogin->staff_module_permissions, 'accounting'));
        $this->assertTrue((bool) data_get($linkedLogin->staff_module_permissions, 'overview'));
        $this->assertFalse((bool) data_get($linkedLogin->staff_module_permissions, 'hr'));
        $this->assertTrue($linkedLogin->must_change_password);
        $this->assertNull($linkedLogin->email_verified_at);

        Notification::assertSentTo($linkedLogin, VerifyEmailNotification::class);
    }

    public function test_owner_can_provision_login_for_existing_employee_via_update(): void
    {
        Notification::fake();

        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Provision Later',
            'role' => 'Assistant',
            'salary' => 14250,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($owner)->patch(route('hr.update', $employee->id), [
            'name' => 'Provision Later',
            'role' => 'Procurement',
            'salary' => 14250,
            'create_login_account' => true,
            'email' => 'provision.later@gmail.com',
            'default_password' => 'password',
            'staff_user_level' => 'manager',
            'staff_role_preset_key' => 'procurement',
            'module_overrides' => [
                'procurement' => true,
                'stock_requests' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee updated and seller login created. A verification email was sent.');

        $staff = User::where('employee_id', $employee->id)->first();

        $this->assertNotNull($staff);
        $this->assertSame('provision.later@gmail.com', $staff->email);
        $this->assertSame('manager', $staff->getStaffUserLevel());
        $this->assertSame('procurement', $staff->staff_role_preset_key);
        $this->assertTrue((bool) data_get($staff->staff_module_permissions, 'procurement'));
        $this->assertTrue((bool) data_get($staff->staff_module_permissions, 'stock_requests'));

        Notification::assertSentTo($staff, VerifyEmailNotification::class);
    }

    public function test_owner_can_suspend_existing_login_access_via_update_without_deleting_the_linked_login(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Revoke Access',
            'role' => 'HR',
            'salary' => 17000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email' => 'revoke.access@gmail.com',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $response = $this->actingAs($owner)->patch(route('hr.update', $employee->id), [
            'name' => 'Revoke Access Updated',
            'role' => 'Assistant',
            'salary' => 17500,
            'create_login_account' => false,
            'email' => 'revoke.access@gmail.com',
            'default_password' => '',
            'staff_user_level' => 'standard',
            'staff_role_preset_key' => 'hr',
            'module_overrides' => [
                'hr' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas(
            'success',
            'Employee updated and seller workspace access suspended. The linked login was kept for future reactivation.'
        );

        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'name' => 'Revoke Access Updated',
            'role' => 'Assistant',
            'salary' => 17500,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $linkedLogin->id,
        ]);

        $this->assertFalse($linkedLogin->fresh()->isWorkspaceAccessEnabled());
    }

    public function test_owner_can_restore_suspended_login_access_via_update(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Restore Access',
            'role' => 'HR',
            'salary' => 17000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email' => 'restore.access@gmail.com',
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], false),
        ]);

        $response = $this->actingAs($owner)->patch(route('hr.update', $employee->id), [
            'name' => 'Restore Access Updated',
            'role' => 'Accounting',
            'salary' => 18200,
            'create_login_account' => true,
            'email' => 'restore.access@gmail.com',
            'default_password' => '',
            'staff_user_level' => 'manager',
            'staff_role_preset_key' => 'accounting',
            'module_overrides' => [
                'accounting' => true,
                'overview' => true,
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee updated and seller workspace access restored.');

        $linkedLogin->refresh();

        $this->assertTrue($linkedLogin->isWorkspaceAccessEnabled());
        $this->assertSame('manager', $linkedLogin->getStaffUserLevel());
        $this->assertSame('accounting', $linkedLogin->staff_role_preset_key);
        $this->assertTrue((bool) data_get($linkedLogin->staff_module_permissions, 'accounting'));
        $this->assertTrue((bool) data_get($linkedLogin->staff_module_permissions, 'overview'));
    }

    public function test_hr_staff_with_read_only_access_cannot_update_employee_records(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Editable Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($staff)->patch(route('hr.update', $employee->id), [
            'name' => 'Edited By HR',
            'role' => 'Payroll Assistant',
            'salary' => 16250,
        ]);

        $response->assertForbidden();
        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'name' => 'Editable Employee',
            'role' => 'Assistant',
            'salary' => 15000,
        ]);
    }

    public function test_hr_staff_with_update_access_can_update_employee_record_without_affecting_permissions(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withStaffAccessPermissionLevelFlag(
                ['hr' => true],
                User::STAFF_ACCESS_PERMISSION_UPDATE
            ),
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Editable Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($staff)->patch(route('hr.update', $employee->id), [
            'name' => 'Edited By HR',
            'role' => 'Payroll Assistant',
            'salary' => 16250,
        ]);

        $response->assertRedirect();
        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'name' => 'Edited By HR',
            'role' => 'Payroll Assistant',
            'salary' => 16250,
        ]);
    }

    public function test_hr_staff_cannot_suspend_existing_login_access_via_update(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Protected Login',
            'role' => 'HR',
            'salary' => 17000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email' => 'protected.login@gmail.com',
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $response = $this->actingAs($staff)->patch(route('hr.update', $employee->id), [
            'name' => 'Protected Login Updated',
            'role' => 'HR',
            'salary' => 17200,
            'create_login_account' => false,
        ]);

        $response->assertForbidden();
        $this->assertDatabaseHas('employees', [
            'id' => $employee->id,
            'name' => 'Protected Login',
            'salary' => 17000,
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $linkedLogin->id,
        ]);
        $this->assertTrue($linkedLogin->fresh()->isWorkspaceAccessEnabled());
    }

    public function test_hr_staff_with_read_only_access_cannot_delete_employees_without_linked_login_accounts(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Read Only Protected Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($staff)->delete(route('hr.destroy', $employee->id));

        $response->assertForbidden();
        $this->assertDatabaseHas('employees', ['id' => $employee->id]);
    }

    public function test_hr_staff_with_read_only_access_cannot_update_payroll_settings(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $response = $this->actingAs($staff)->post(route('hr.settings'), [
            'overtime_rate' => 99,
            'payroll_working_days' => 26,
        ]);

        $response->assertForbidden();
        $owner->refresh();
        $this->assertNotSame(99.0, (float) $owner->overtime_rate);
        $this->assertNotSame(26, (int) $owner->payroll_working_days);
    }

    public function test_hr_staff_with_read_only_access_cannot_generate_payroll(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $staff = $this->createClockedInStaff($owner, [
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => ['hr' => true],
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Payroll Protected Employee',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($staff)->post(route('hr.generate'), [
            'month' => 'April 2026',
            'items' => [[
                'employee_id' => $employee->id,
                'absences_days' => 0,
                'undertime_hours' => 0,
                'overtime_hours' => 0,
            ]],
        ]);

        $response->assertForbidden();
        $this->assertDatabaseCount('payrolls', 0);
    }

    public function test_existing_employee_records_without_login_still_render_safely(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        Employee::create([
            'user_id' => $owner->id,
            'name' => 'Legacy Employee',
            'role' => 'Potter',
            'salary' => 17250,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Seller/HR')
                ->where('staff.0.name', 'Legacy Employee')
                ->where('staff.0.has_login_account', false)
                ->where('staff.0.login_account', null)
                ->where('staffProvisioning.canEditHrRecords', true)
                ->where('staffProvisioning.canManageStaffAccounts', true)
        );
    }

    public function test_hr_staff_provisioning_exposes_messages_module_access_and_customer_support_default(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Seller/HR')
                ->has('staffProvisioning.availableModules', fn (Assert $modules) => $modules
                    ->where('6.key', 'messages')
                    ->where('6.label', 'Messages')
                    ->etc()
                )
                ->has('staffProvisioning.rolePresets', fn (Assert $presets) => $presets
                    ->where('3.key', 'customer_support')
                    ->where('3.modules.0', 'orders')
                    ->where('3.modules.1', 'messages')
                    ->where('3.modules.2', 'reviews')
                    ->etc()
                )
        );
    }

    public function test_hr_directory_includes_linked_login_avatar_data_for_synced_employee_display(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Avatar Sync Employee',
            'role' => 'HR',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $linkedLogin = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'avatar' => 'avatars/staff-avatar.png',
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Seller/HR')
                ->where('staff.0.has_login_account', true)
                ->where('staff.0.login_account.id', $linkedLogin->id)
                ->where('staff.0.login_account.avatar', 'avatars/staff-avatar.png')
        );
    }

    public function test_hr_directory_preserves_standard_staff_user_level_for_linked_login_accounts(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Standard Staff Member',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_module_permissions' => User::withStaffUserLevelFlag(['orders' => true], 'standard'),
        ]);

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Seller/HR')
                ->where('staff.0.login_account.user_level', 'standard')
        );
    }

    public function test_hr_directory_includes_saved_staff_access_permission_level_for_linked_login_accounts(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Permission Level Staff',
            'role' => 'Assistant',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_module_permissions' => User::withStaffAccessPermissionLevelFlag(['orders' => true], User::STAFF_ACCESS_PERMISSION_UPDATE),
        ]);

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(
            fn (Assert $page) => $page
                ->component('Seller/HR')
                ->where('staff.0.login_account.staff_access_permission_level', User::STAFF_ACCESS_PERMISSION_UPDATE)
        );
    }

    public function test_hr_page_renders_safely_when_staff_login_schema_is_unavailable(): void
    {
        Schema::partialMock()
            ->shouldReceive('hasColumn')
            ->andReturnUsing(function (string $table, string $column) {
                if (
                    $table === 'users' && in_array($column, [
                        'seller_owner_id',
                        'staff_role_preset_key',
                        'staff_module_permissions',
                        'must_change_password',
                        'created_by_user_id',
                        'employee_id',
                    ], true)
                ) {
                    return false;
                }

                return true;
            });

        $owner = $this->createOwnerWithHrAccess();

        Employee::create([
            'user_id' => $owner->id,
            'name' => 'Legacy Employee',
            'role' => 'Potter',
            'salary' => 17250,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(
            fn(Assert $page) => $page
                ->component('Seller/HR')
                ->where('staff.0.name', 'Legacy Employee')
                ->where('staff.0.has_login_account', false)
                ->where('staff.0.login_account', null)
                ->where('staffProvisioning.canEditHrRecords', true)
                ->where('staffProvisioning.canManageStaffAccounts', false)
                ->where('staffProvisioning.requiresStaffSchemaUpdate', true)
        );
    }

    private function createOwnerWithHrAccess(): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => false,
            'procurement' => false,
        ];
        $owner->save();

        return $owner;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function createClockedInStaff(User $owner, array $attributes = []): User
    {
        $staff = User::factory()->staff($owner)->create($attributes);

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone')),
            'worked_minutes' => 60,
        ]);

        return $staff;
    }
}

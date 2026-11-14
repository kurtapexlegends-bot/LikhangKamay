<?php

namespace Tests\Feature\Seller;

use App\Actions\Seller\HR\CreateEmployeeAction;
use App\Actions\Seller\HR\TerminateEmployeeAction;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\HR\EmployeeDocumentService;
use App\Services\StorageUrl;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class EmployeeDocumentStorageTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_upload_view_and_delete_employee_documents(): void
    {
        $privateDisk = StorageUrl::privateDisk();
        Storage::fake($privateDisk);
        $owner = $this->createOwnerWithHrAccess();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Elena Cruz',
            'role' => 'Potter',
            'salary' => 16500,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);

        $file = UploadedFile::fake()->create('nbi-clearance.pdf', 320, 'application/pdf');

        $uploadResponse = $this->actingAs($owner)->post(route('hr.employees.documents.store', $employee->id), [
            'document_type' => EmployeeDocument::TYPE_NBI_CLEARANCE,
            'title' => 'NBI Clearance 2026',
            'expires_at' => '2027-06-30',
            'notes' => 'Original physical copy filed',
            'document' => $file,
        ]);

        $uploadResponse->assertRedirect();
        $uploadResponse->assertSessionHas('success', 'Employee document uploaded successfully.');

        $document = EmployeeDocument::where('employee_id', $employee->id)->first();
        $this->assertNotNull($document);
        $this->assertSame($owner->id, $document->user_id);
        $this->assertSame($owner->id, $document->uploaded_by_user_id);
        $this->assertSame(EmployeeDocument::TYPE_NBI_CLEARANCE, $document->document_type);
        $this->assertSame('NBI Clearance 2026', $document->title);
        $this->assertSame('nbi-clearance.pdf', $document->original_filename);
        Storage::disk($privateDisk)->assertExists($document->file_path);

        $indexResponse = $this->actingAs($owner)->get(route('hr.index'));
        $indexResponse->assertInertia(fn (Assert $page) => $page
            ->component('Seller/HR/HR')
            ->has('documentTypes', fn (Assert $types) => $types
                ->where('valid_id', 'Valid Government ID')
                ->where('nbi_clearance', 'NBI / Police Clearance')
                ->etc()
            )
            ->has('staff', 1, fn (Assert $staffRow) => $staffRow
                ->where('id', $employee->id)
                ->where('documents_count', 1)
                ->where('documents', [])
                ->etc()
            )
        );

        $lazyResponse = $this->actingAs($owner)->getJson(
            route('hr.employees.documents.index', $employee->id)
        );
        $expectedFileUrl = route('hr.employees.documents.file', [$employee->id, $document->id]);
        $expectedDownloadUrl = route('hr.employees.documents.file', [$employee->id, $document->id, 'download' => 1]);
        $lazyResponse->assertOk()
            ->assertJsonCount(1, 'documents')
            ->assertJsonPath('total', 1)
            ->assertJsonPath('documents.0.id', $document->id)
            ->assertJsonPath('documents.0.title', 'NBI Clearance 2026')
            ->assertJsonPath('documents.0.document_type', EmployeeDocument::TYPE_NBI_CLEARANCE)
            ->assertJsonPath('documents.0.is_pdf', true)
            ->assertJsonPath('documents.0.expires_at', '2027-06-30')
            ->assertJsonPath('documents.0.file_url', $expectedFileUrl)
            ->assertJsonPath('documents.0.download_url', $expectedDownloadUrl)
            ->assertJsonMissingPath('documents.0.file_path');

        $this->assertNotEmpty($lazyResponse->json('documents.0.uploaded_at'));
        $this->assertStringNotContainsString('/object/public/', (string) $lazyResponse->json('documents.0.file_url'));

        // Authenticated inline stream & attachment download work
        $inlineStream = $this->actingAs($owner)->get($expectedFileUrl);
        $inlineStream->assertOk();
        $this->assertStringStartsWith('inline;', (string) $inlineStream->headers->get('content-disposition'));

        $downloadStream = $this->actingAs($owner)->get($expectedDownloadUrl);
        $downloadStream->assertOk();
        $this->assertStringStartsWith('attachment;', (string) $downloadStream->headers->get('content-disposition'));

        $recordsResponse = $this->actingAs($owner)->get(
            route('hr.employees.time-card', ['employee' => $employee->id, 'tab' => 'documents'])
        );
        $recordsResponse->assertInertia(fn (Assert $page) => $page
            ->component('Seller/HR/TimeCardAudit')
            ->where('initialTab', 'documents')
            ->has('documentTypes', fn (Assert $types) => $types
                ->where('valid_id', 'Valid Government ID')
                ->where('nbi_clearance', 'NBI / Police Clearance')
                ->etc()
            )
            ->has('documents', 1, fn (Assert $docRow) => $docRow
                ->where('id', $document->id)
                ->where('title', 'NBI Clearance 2026')
                ->where('file_url', $expectedFileUrl)
                ->etc()
            )
        );

        $storedPath = $document->file_path;
        $deleteResponse = $this->actingAs($owner)->delete(
            route('hr.employees.documents.destroy', [$employee->id, $document->id])
        );

        $deleteResponse->assertRedirect();
        $deleteResponse->assertSessionHas('success', 'Employee document removed.');
        $this->assertDatabaseMissing('employee_documents', ['id' => $document->id]);
        Storage::disk($privateDisk)->assertMissing($storedPath);
    }

    public function test_owner_can_stage_initial_documents_when_creating_an_employee(): void
    {
        $privateDisk = StorageUrl::privateDisk();
        Storage::fake($privateDisk);
        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Ramon Reyes',
            'role' => 'Kiln Operator',
            'salary' => 17000,
            'create_login_account' => false,
            'staged_documents' => [
                [
                    'document_type' => EmployeeDocument::TYPE_VALID_ID,
                    'title' => 'PhilSys National ID',
                    'file' => UploadedFile::fake()->image('national-id.png', 600, 400),
                ],
                [
                    'document_type' => EmployeeDocument::TYPE_RESUME,
                    'title' => 'Updated CV',
                    'file' => UploadedFile::fake()->create('ramon-cv.pdf', 250, 'application/pdf'),
                ],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee added successfully.');

        $employee = Employee::where('user_id', $owner->id)->firstOrFail();
        $documents = EmployeeDocument::where('employee_id', $employee->id)->get();

        $this->assertCount(2, $documents);
        foreach ($documents as $doc) {
            Storage::disk($privateDisk)->assertExists($doc->file_path);
        }
    }

    public function test_read_only_hr_staff_cannot_upload_or_delete_employee_documents(): void
    {
        Storage::fake(StorageUrl::privateDisk());
        $owner = $this->createOwnerWithHrAccess();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Liza Mendoza',
            'role' => 'Glaze Technician',
            'salary' => 16000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);
        $existingDoc = EmployeeDocument::create([
            'employee_id' => $employee->id,
            'user_id' => $owner->id,
            'uploaded_by_user_id' => $owner->id,
            'document_type' => EmployeeDocument::TYPE_MEDICAL_CERTIFICATE,
            'title' => 'Annual Medical Fit-to-Work',
            'file_path' => 'employee_documents/test/medical.pdf',
            'original_filename' => 'medical.pdf',
            'mime_type' => 'application/pdf',
            'file_size' => 102400,
        ]);

        $readOnlyStaff = $this->createClockedInStaff($owner, [
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withStaffAccessPermissionLevelFlag([
                'overview' => true,
                'hr' => User::STAFF_ACCESS_PERMISSION_READ_ONLY,
            ], User::STAFF_ACCESS_PERMISSION_READ_ONLY),
        ]);

        $this->actingAs($readOnlyStaff)
            ->get(route('hr.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('staffProvisioning.canEditHrRecords', false)
                ->where('staff.0.documents_count', 1)
            );

        $this->actingAs($readOnlyStaff)
            ->post(route('hr.employees.documents.store', $employee->id), [
                'document_type' => EmployeeDocument::TYPE_RESUME,
                'document' => UploadedFile::fake()->create('cv.pdf', 100, 'application/pdf'),
            ])
            ->assertForbidden();

        $this->actingAs($readOnlyStaff)
            ->delete(route('hr.employees.documents.destroy', [$employee->id, $existingDoc->id]))
            ->assertForbidden();

        $this->assertDatabaseHas('employee_documents', ['id' => $existingDoc->id]);
    }

    public function test_cross_seller_and_mismatched_document_actions_are_forbidden(): void
    {
        Storage::fake(StorageUrl::privateDisk());
        $sellerA = $this->createOwnerWithHrAccess();
        $sellerB = $this->createOwnerWithHrAccess();

        $employeeA1 = Employee::create([
            'user_id' => $sellerA->id,
            'name' => 'Worker One',
            'role' => 'Potter',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);
        $employeeA2 = Employee::create([
            'user_id' => $sellerA->id,
            'name' => 'Worker Two',
            'role' => 'Packer',
            'salary' => 14000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);
        $docA1 = EmployeeDocument::create([
            'employee_id' => $employeeA1->id,
            'user_id' => $sellerA->id,
            'document_type' => EmployeeDocument::TYPE_VALID_ID,
            'title' => 'ID',
            'file_path' => 'employee_documents/test/id.png',
            'original_filename' => 'id.png',
            'mime_type' => 'image/png',
            'file_size' => 50000,
        ]);

        // Cross-tenant read, upload, and delete blocked
        $this->actingAs($sellerB)
            ->getJson(route('hr.employees.documents.index', $employeeA1->id))
            ->assertForbidden();

        $this->actingAs($sellerB)
            ->post(route('hr.employees.documents.store', $employeeA1->id), [
                'document_type' => EmployeeDocument::TYPE_VALID_ID,
                'document' => UploadedFile::fake()->image('id.png'),
            ])
            ->assertForbidden();

        $this->actingAs($sellerB)
            ->get(route('hr.employees.documents.file', [$employeeA1->id, $docA1->id]))
            ->assertForbidden();

        $this->actingAs($sellerB)
            ->delete(route('hr.employees.documents.destroy', [$employeeA1->id, $docA1->id]))
            ->assertForbidden();

        // Cross-employee ID mismatch blocked even for same seller
        $this->actingAs($sellerA)
            ->get(route('hr.employees.documents.file', [$employeeA2->id, $docA1->id]))
            ->assertNotFound();

        $this->actingAs($sellerA)
            ->delete(route('hr.employees.documents.destroy', [$employeeA2->id, $docA1->id]))
            ->assertForbidden();

        $this->assertDatabaseHas('employee_documents', ['id' => $docA1->id]);
    }

    public function test_document_upload_rejects_oversized_and_unsupported_files(): void
    {
        Storage::fake(StorageUrl::privateDisk());
        $owner = $this->createOwnerWithHrAccess();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Carlo Diaz',
            'role' => 'Artisan',
            'salary' => 15500,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);

        $this->actingAs($owner)
            ->post(route('hr.employees.documents.store', $employee->id), [
                'document_type' => EmployeeDocument::TYPE_OTHER,
                'document' => UploadedFile::fake()->create('huge.pdf', 5120, 'application/pdf'),
            ])
            ->assertSessionHasErrors(['document']);

        $this->actingAs($owner)
            ->post(route('hr.employees.documents.store', $employee->id), [
                'document_type' => EmployeeDocument::TYPE_OTHER,
                'document' => UploadedFile::fake()->create('script.txt', 10, 'text/plain'),
            ])
            ->assertSessionHasErrors(['document']);

        $this->assertDatabaseCount('employee_documents', 0);
    }

    public function test_presigned_upload_can_attach_and_stage_documents_privately(): void
    {
        $privateDisk = StorageUrl::privateDisk();
        Storage::fake($privateDisk);
        $owner = $this->createOwnerWithHrAccess();

        $presign = $this->actingAs($owner)->postJson(route('api.uploads.presign'), [
            'folder' => 'employee_documents',
            'filename' => 'contract.pdf',
            'contentType' => 'application/pdf',
        ])->assertOk();

        $key = $presign->json('key');
        $pdfBytes = "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";

        $this->actingAs($owner)
            ->call('PUT', route('api.uploads.local', ['key' => $key]), [], [], [], [], $pdfBytes)
            ->assertOk();

        $createResponse = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Mara Santos',
            'role' => 'Finisher',
            'salary' => 15500,
            'create_login_account' => false,
            'staged_documents' => [
                [
                    'document_type' => EmployeeDocument::TYPE_EMPLOYMENT_CONTRACT,
                    'title' => 'Signed Contract',
                    'document_key' => $key,
                    'original_filename' => 'contract.pdf',
                ],
            ],
        ]);

        $createResponse->assertRedirect();
        $createResponse->assertSessionHas('success', 'Employee added successfully.');

        $doc = EmployeeDocument::where('user_id', $owner->id)->firstOrFail();
        $this->assertSame($key, $doc->file_path);
        $this->assertSame('contract.pdf', $doc->original_filename);
        Storage::disk($privateDisk)->assertExists($key);
    }

    public function test_staged_document_failure_rolls_back_earlier_files_and_surfaces_error(): void
    {
        $privateDisk = StorageUrl::privateDisk();
        Storage::fake($privateDisk);
        $owner = $this->createOwnerWithHrAccess();

        $action = app(CreateEmployeeAction::class);
        $result = $action->execute($owner, $owner, [
            'name' => 'Jules Navarro',
            'role' => 'Shaper',
            'salary' => 16000,
            'create_login_account' => false,
            'staged_documents' => [
                [
                    'document_type' => EmployeeDocument::TYPE_VALID_ID,
                    'title' => 'Valid ID',
                    'file' => UploadedFile::fake()->image('id.png', 400, 300),
                ],
                [
                    'document_type' => EmployeeDocument::TYPE_RESUME,
                    'title' => 'Missing Presigned File',
                    'document_key' => "employee_documents/{$owner->id}/does-not-exist.pdf",
                ],
            ],
        ]);

        $this->assertFalse($result['success']);
        $this->assertTrue($result['documentsFailed']);
        $this->assertStringContainsString('documents failed to save', $result['message']);
        $this->assertDatabaseCount('employee_documents', 0);
        $this->assertEmpty(Storage::disk($privateDisk)->allFiles());
    }

    public function test_terminating_employee_cleans_up_private_documents_and_records(): void
    {
        $privateDisk = StorageUrl::privateDisk();
        Storage::fake($privateDisk);
        $owner = $this->createOwnerWithHrAccess();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Dante Perez',
            'role' => 'Potter',
            'salary' => 16000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);

        $service = app(EmployeeDocumentService::class);
        $doc = $service->storeUploadedFile(
            $owner,
            $owner,
            $employee,
            UploadedFile::fake()->image('gov-id.png', 300, 200),
            ['document_type' => EmployeeDocument::TYPE_VALID_ID]
        );
        Storage::disk($privateDisk)->assertExists($doc->file_path);

        app(TerminateEmployeeAction::class)->execute($owner, $owner, $employee->id);

        $this->assertSoftDeleted('employees', ['id' => $employee->id]);
        $this->assertDatabaseMissing('employee_documents', ['id' => $doc->id]);
        Storage::disk($privateDisk)->assertMissing($doc->file_path);
    }

    public function test_supports_schema_caches_true_and_prefers_server_mime_type(): void
    {
        Storage::fake(StorageUrl::privateDisk());
        Cache::forget(EmployeeDocumentService::SCHEMA_CACHE_KEY);

        $this->assertTrue(EmployeeDocumentService::supportsSchema());
        $this->assertTrue((bool) Cache::get(EmployeeDocumentService::SCHEMA_CACHE_KEY));

        $owner = $this->createOwnerWithHrAccess();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Kiko Tan',
            'role' => 'Glazer',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);

        // Spoof client MIME as text/html on a real PNG file; server must persist image/png
        $pngFile = UploadedFile::fake()->image('scan.png', 200, 200);
        $spoofedUpload = new UploadedFile(
            $pngFile->getPathname(),
            'scan.png',
            'text/html',
            null,
            true
        );

        $doc = app(EmployeeDocumentService::class)->storeUploadedFile(
            $owner,
            $owner,
            $employee,
            $spoofedUpload,
            ['document_type' => EmployeeDocument::TYPE_VALID_ID]
        );

        $this->assertSame('image/png', $doc->mime_type);
    }

    public function test_presigned_upload_rejects_spoofed_binary_with_invalid_magic_bytes(): void
    {
        $privateDisk = StorageUrl::privateDisk();
        Storage::fake($privateDisk);
        $owner = $this->createOwnerWithHrAccess();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Maya Lim',
            'role' => 'Potter',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);

        $key = "employee_documents/{$owner->id}/spoofed-file.jpg";
        // Random binary payload that is neither JPEG, PNG, WEBP, nor PDF
        Storage::disk($privateDisk)->put($key, "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09");

        $this->actingAs($owner)
            ->post(route('hr.employees.documents.store', $employee->id), [
                'document_type' => EmployeeDocument::TYPE_VALID_ID,
                'document_key' => $key,
                'original_filename' => 'spoofed-file.jpg',
            ])
            ->assertSessionHasErrors(['document_key']);

        $this->assertDatabaseCount('employee_documents', 0);
        Storage::disk($privateDisk)->assertMissing($key);
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

<?php

declare(strict_types=1);

namespace App\Http\Requests\Seller\HR;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Support\HRWorkflowHelper;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeDocumentRequest extends FormRequest
{
    use InteractsWithSellerContext;

    public function authorize(): bool
    {
        $actor = $this->sellerActor();
        abort_unless(HRWorkflowHelper::canEditHrRecords($actor), 403, 'Read-only people access can only view records.');

        /** @var Employee|null $employee */
        $employee = $this->route('employee');
        abort_unless($employee && $employee->user_id === $this->sellerOwnerId(), 403, 'Unauthorized employee access.');

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $sellerOwnerId = $this->sellerOwnerId();
        $keyPattern = '#^employee_documents/' . preg_quote((string) $sellerOwnerId, '#') . '/[A-Za-z0-9\-]+\.(jpg|jpeg|png|webp|pdf)$#i';

        return [
            'document_type' => ['required', 'string', Rule::in(array_keys(EmployeeDocument::documentTypes()))],
            'title' => ['nullable', 'string', 'max:150'],
            'document' => ['nullable', 'required_without:document_key', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:4096'],
            'document_key' => ['nullable', 'required_without:document', 'string', 'max:255', "regex:{$keyPattern}"],
            'original_filename' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'document.required_without' => 'Please select a document to upload.',
            'document_key.required_without' => 'Please select a document to upload.',
            'document_key.regex' => 'Invalid uploaded document reference.',
            'document.max' => 'Document size must not exceed 4MB.',
            'document.mimes' => 'Accepted formats are JPG, PNG, WEBP, and PDF.',
        ];
    }
}

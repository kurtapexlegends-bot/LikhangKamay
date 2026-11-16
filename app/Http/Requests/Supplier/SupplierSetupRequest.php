<?php

declare(strict_types=1);

namespace App\Http\Requests\Supplier;

use App\Support\SupplierAddress;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SupplierSetupRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isSupplier() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\User|null $user */
        $user = $this->user();
        $hasExistingPermit = !empty($user?->business_permit);

        $docValidator = function (string $attribute, mixed $value, \Closure $fail) {
            if ($value === null) {
                return;
            }
            if ($value instanceof \Illuminate\Http\UploadedFile) {
                $mime = $value->getMimeType();
                $validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                if (!in_array($mime, $validMimes, true)) {
                    $fail("The {$attribute} must be a file of type: jpg, jpeg, png, webp, pdf.");
                }
                if ($value->getSize() > 4096 * 1024) {
                    $fail("The {$attribute} may not be greater than 4MB.");
                }
            } elseif (is_string($value)) {
                if (!str_starts_with($value, 'legal_docs/')) {
                    $fail("The {$attribute} is an invalid document reference.");
                }
            } else {
                $fail("The {$attribute} is invalid.");
            }
        };

        return [
            'phone_number' => ['required', 'string', 'regex:/^09\d{9}$/'],
            'province' => ['required', 'string', 'max:100', Rule::in(SupplierAddress::SUPPORTED_PROVINCES)],
            'city' => ['required', 'string', 'max:100'],
            'barangay' => ['required', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'regex:/^\d{4}$/'],
            'street_address' => ['required', 'string', 'min:5', 'max:255'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'business_permit' => [
                $hasExistingPermit ? 'nullable' : 'required',
                $docValidator,
            ],
            'dti_registration' => [
                'nullable',
                $docValidator,
            ],
            'valid_id' => [
                'nullable',
                $docValidator,
            ],
            'tin_id' => [
                'nullable',
                $docValidator,
            ],
            'tin_number' => ['nullable', 'string', 'regex:/^[\d-]+$/', 'max:20'],
            'selfie_data_url' => [
                'nullable',
                'string',
                function (string $attribute, mixed $value, \Closure $fail) {
                    if ($value === null || $value === '') {
                        return;
                    }
                    if (!is_string($value) || !str_starts_with($value, 'data:image/')) {
                        $fail('The face check photo must be a valid image data URL.');
                        return;
                    }
                    if (strlen($value) > 1500000) {
                        $fail('The face check image payload is too large.');
                    }
                },
            ],
            'face_descriptor' => ['nullable'],
            'id_face_descriptor' => ['nullable'],
            'face_match_score' => ['nullable', 'numeric', 'between:0,100'],
            'id_face_detected' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Custom validation messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone_number.required' => 'A valid mobile contact number is required for dispatch notifications.',
            'phone_number.regex' => 'Please provide a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).',
            'province.in' => 'Supplier warehouses must currently be located in Cavite or Greater Manila Area (NCR, Laguna, Rizal, Bulacan, Batangas).',
            'postal_code.regex' => 'Postal code must be a 4-digit number (e.g. 4114).',
            'street_address.min' => 'Street address must be at least 5 characters.',
            'tin_number.regex' => 'TIN must contain only numbers and dashes (e.g. 123-456-789-000).',
            'business_permit.required' => 'Please upload your Mayor’s Permit or Business License for verification.',
            'business_permit.max' => 'The business permit document must not exceed 4MB.',
        ];
    }
}

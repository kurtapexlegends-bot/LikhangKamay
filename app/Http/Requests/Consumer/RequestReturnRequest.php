<?php

declare(strict_types=1);

namespace App\Http\Requests\Consumer;

use Illuminate\Foundation\Http\FormRequest;

class RequestReturnRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'return_reason' => ['required_without:reason', 'nullable', 'string', 'max:1000'],
            'reason' => ['required_without:return_reason', 'nullable', 'string', 'max:1000'],
            'return_proof_image' => ['required_without_all:proof_photos,proof_photo', 'nullable', 'image', 'max:4096'],
            'proof_photos' => ['required_without_all:return_proof_image,proof_photo', 'nullable', 'array', 'min:1', 'max:5'],
            'proof_photos.*' => ['nullable', 'image', 'max:4096'],
            'proof_photo' => ['nullable', 'image', 'max:4096'],
            'policy_id' => ['nullable', 'integer'],
            'damage_reason_code' => ['nullable', 'string', 'max:100'],
            'checklist_confirmations' => ['nullable', 'array'],
            'checklist_confirmations.*' => ['nullable', 'string', 'max:100'],
            'photo_angle_keys' => ['nullable', 'array', 'max:5'],
            'photo_angle_keys.*' => ['nullable', 'string', 'max:100'],
        ];
    }
}

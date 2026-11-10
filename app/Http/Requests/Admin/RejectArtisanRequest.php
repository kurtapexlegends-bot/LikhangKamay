<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class RejectArtisanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Gate::allows('admin-action');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => ['nullable', 'string', 'max:1000'],
            'revision_items' => ['nullable', 'array', 'max:20'],
            'revision_items.*.key' => ['required_with:revision_items', 'string', 'max:80'],
            'revision_items.*.label' => ['nullable', 'string', 'max:120'],
            'revision_items.*.note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Ensure either at least one specific revision item or a 10+ char reason is provided.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $reason = trim((string) $this->input('reason', ''));
            $items = $this->input('revision_items', []);

            if (empty($items) && mb_strlen($reason) < 10) {
                $validator->errors()->add('reason', 'Select at least one revision item or enter at least 10 characters of feedback.');
            }
        });
    }
}

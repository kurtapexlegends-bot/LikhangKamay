<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ModerateCatalogItemRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['exists:products,id'],
            'action' => ['required', 'string', 'in:approve,reject,flag'],
            'feedback' => ['nullable', 'string', 'max:1000'],
            'revision_items' => ['nullable', 'array', 'max:20'],
            'revision_items.*.key' => ['required_with:revision_items', 'string', 'max:80'],
            'revision_items.*.label' => ['nullable', 'string', 'max:120'],
            'revision_items.*.note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $action = $this->input('action');
            $feedback = trim((string) $this->input('feedback', ''));
            $items = $this->input('revision_items', []);

            if (in_array($action, ['reject', 'flag'], true) && empty($feedback) && empty($items)) {
                $validator->errors()->add('feedback', 'Select at least one revision item or enter feedback when rejecting or flagging products.');
            }
        });
    }
}

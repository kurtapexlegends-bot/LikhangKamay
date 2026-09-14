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

            if (in_array($action, ['reject', 'flag'], true) && empty($feedback)) {
                $validator->errors()->add('feedback', 'Feedback/reason is required when rejecting or flagging products.');
            }
        });
    }
}

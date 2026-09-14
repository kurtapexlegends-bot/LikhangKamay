<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreEmailTemplateRequest extends FormRequest
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
            'id' => ['nullable', 'integer', 'exists:email_templates,id'],
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'button_label' => ['nullable', 'string', 'max:100'],
            'button_url' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', 'in:system,custom'],
        ];
    }
}

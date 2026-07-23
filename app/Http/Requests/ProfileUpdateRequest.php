<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required_without:name', 'nullable', 'string', 'min:2', 'max:50'],
            'last_name' => ['nullable', 'string', 'min:2', 'max:50'],
            'name' => ['required_without:first_name', 'nullable', 'string', 'min:2', 'max:50'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
            // Shop Details (Nullable/Optional)
            'shop_name' => ['nullable', 'string', 'min:3', 'max:30'],
            'phone_number' => ['nullable', 'string', 'max:20'],
            'street_address' => ['nullable', 'string', 'max:255'],
            'barangay' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:255'],
            'region' => ['nullable', 'string', 'max:255'],
            'zip_code' => ['nullable', 'string', 'max:20'],
            'avatar' => ['nullable', 'image', 'max:10240'], // Max 10MB
        ];
    }
}

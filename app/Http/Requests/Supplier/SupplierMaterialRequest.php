<?php

declare(strict_types=1);

namespace App\Http\Requests\Supplier;

use App\Services\B2BSupplyHubService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class SupplierMaterialRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();
        return $user !== null && $user->isSupplier();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'category' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'numeric', 'min:0.01'],
            'stock' => ['required', 'integer', 'min:0'],
            'moq' => ['required', 'integer', 'min:1', 'max:50000'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0.01'],
            'wholesale_min_qty' => ['nullable', 'integer', 'min:2', 'max:50000'],
            'supply_unit' => ['required', 'string', Rule::in(array_keys(B2BSupplyHubService::SUPPLY_UNITS))],
            'weight' => ['nullable', 'numeric', 'min:0.01'],
            'cover_photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
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
            'moq.required' => 'Please specify a Minimum Order Quantity (MOQ).',
            'supply_unit.in' => 'Please select a valid wholesale packaging unit (e.g. kg, sack, drum, crate).',
            'cover_photo.max' => 'The cover photo may not be greater than 4MB.',
        ];
    }
}

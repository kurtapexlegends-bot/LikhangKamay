<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CheckoutRequest extends FormRequest
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
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.variant' => 'nullable|string|max:255',
            'shipping_method' => 'required|string|in:Delivery,Pick Up',
            'selected_address_id' => 'nullable',
            'shipping_address' => 'nullable|string',
            'shipping_address_type' => 'nullable|string|in:home,office,other',
            'shipping_street_address' => 'nullable|string|max:255',
            'shipping_barangay' => 'nullable|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_region' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'recipient_name' => 'nullable|string|max:100',
            'phone_number' => 'nullable|string|max:20',
            'payment_method' => 'required|string|in:COD,GCash',
            'total' => 'required|numeric',
            'shipping_notes' => 'nullable|string',
            'save_address' => 'nullable|boolean',
        ];
    }
}

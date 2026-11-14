<?php

namespace App\Http\Requests\Seller;

use Illuminate\Foundation\Http\FormRequest;

class StorePosOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user && $user->canEditSellerModule('orders'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'payment_method' => ['required', 'string', 'in:pos_cash,pos_gcash,pos_maya'],
            'cash_tendered' => ['required_if:payment_method,pos_cash', 'nullable', 'numeric', 'min:0', 'max:9999999.99'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
            'customer_name' => ['nullable', 'string', 'max:120'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one product to the walk-in cart.',
            'items.min' => 'Add at least one product to the walk-in cart.',
            'cash_tendered.required_if' => 'Enter the cash amount tendered by the customer.',
        ];
    }
}

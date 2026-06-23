<?php

declare(strict_types=1);

namespace App\Http\Requests\Seller;

use Illuminate\Foundation\Http\FormRequest;

class UpdateOrderStatusRequest extends FormRequest
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
            'status' => ['required', 'string', 'in:Accepted,Processing,Rejected,Shipped,Ready for Pickup,Delivered,Completed,Cancelled'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'shipping_notes' => ['nullable', 'string', 'max:500'],
            'proof_of_delivery' => ['nullable', 'image', 'max:5120'],
        ];
    }
}

<?php

namespace App\Http\Requests\Consumer;

use Illuminate\Foundation\Http\FormRequest;

class ValidateVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'code' => 'required|string|max:50',
            'shop_id' => 'nullable|integer',
            'subtotals' => 'required|array|min:1',
            'subtotals.*' => 'required|numeric|min:0',
            'items' => 'nullable|array',
            'items.*.id' => 'nullable|integer|min:1|exists:products,id',
            'items.*.product_id' => 'nullable|integer|min:1|exists:products,id',
            'items.*.qty' => 'nullable|integer|min:1|max:10000',
        ];
    }
}

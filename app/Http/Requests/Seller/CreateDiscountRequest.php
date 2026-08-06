<?php

namespace App\Http\Requests\Seller;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class CreateDiscountRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user();
        return $user && in_array($user->role, ['artisan', 'staff', 'admin', 'super_admin']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['nullable', 'string', 'max:255'],
            'type' => ['nullable', 'in:percentage,fixed'],
            'value' => ['nullable', 'numeric', 'min:0.01'],
            'max_purchase_limit' => ['nullable', 'integer', 'min:1'],
            'start_at' => ['required', 'date'],
            'end_at' => ['required', 'date', 'after:start_at'],
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer', 'exists:products,id'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.product_id' => ['required_with:items', 'integer', 'exists:products,id'],
            'items.*.type' => ['required_with:items', 'in:percentage,fixed'],
            'items.*.value' => ['required_with:items', 'numeric', 'min:0.01'],
        ];
    }

    /**
     * Additional validation to enforce price safety guards.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            if ($this->has('product_ids') && $this->type) {
                $type = $this->type;
                $value = (float) $this->value;
                $products = Product::whereIn('id', $this->product_ids ?? [])->get();

                foreach ($products as $product) {
                    $orig = (float) $product->price;
                    if ($type === 'percentage' && $value >= 100) {
                        $validator->errors()->add('value', "Percentage discount for '{$product->name}' cannot equal or exceed 100%.");
                    } elseif ($type === 'fixed' && $value >= $orig) {
                        $validator->errors()->add('value', "Fixed promo price (₱" . number_format($value, 2) . ") for '{$product->name}' cannot equal or exceed original price (₱" . number_format($orig, 2) . ").");
                    }
                }
            }

            if ($this->has('items')) {
                foreach ($this->items as $index => $item) {
                    $product = Product::find($item['product_id'] ?? null);
                    if ($product) {
                        $type = $item['type'] ?? 'percentage';
                        $val = (float) ($item['value'] ?? 0);
                        $orig = (float) $product->price;

                        if ($type === 'percentage' && $val >= 100) {
                            $validator->errors()->add("items.{$index}.value", "Percentage discount for '{$product->name}' cannot equal or exceed 100%.");
                        } elseif ($type === 'fixed' && $val >= $orig) {
                            $validator->errors()->add("items.{$index}.value", "Fixed promo price (₱" . number_format($val, 2) . ") for '{$product->name}' cannot equal or exceed original price (₱" . number_format($orig, 2) . ").");
                        }
                    }
                }
            }
        });
    }
}

<?php

declare(strict_types=1);

namespace App\Http\Requests\Seller;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;

class ToggleWholesaleSupplyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var \App\Models\User|null $actor */
        $actor = $this->user();
        if (!$actor || !$actor->isArtisan()) {
            return false;
        }

        $seller = $actor->getEffectiveSeller() ?? $actor;
        if (!$seller->canAccessSupplyHub()) {
            return false;
        }

        $product = $this->route('product');
        if ($product instanceof Product) {
            return (int) $product->user_id === (int) $seller->id;
        }

        if (is_string($product) || is_int($product)) {
            $resolved = Product::where('id', $product)->orWhere('slug', (string) $product)->first();
            return $resolved !== null && (int) $resolved->user_id === (int) $seller->id;
        }

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
            'is_b2b_supply' => ['required', 'boolean'],
            'moq' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'wholesale_min_qty' => ['nullable', 'integer', 'min:2', 'max:10000'],
            'supply_unit' => ['nullable', 'string', 'max:50'],
        ];
    }
}

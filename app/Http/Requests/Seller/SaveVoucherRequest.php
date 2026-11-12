<?php

namespace App\Http\Requests\Seller;

use App\Models\Product;
use App\Models\Voucher;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveVoucherRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $updates = [];

        if ($this->has('code')) {
            $updates['code'] = strtoupper(trim((string) $this->input('code')));
        }

        if ($this->input('scope_type') !== Voucher::SCOPE_SPECIFIC_PRODUCTS) {
            $updates['applicable_products'] = null;
        }

        if ($this->input('scope_type') !== Voucher::SCOPE_CATEGORY) {
            $updates['applicable_category'] = null;
        }

        if ($this->input('min_requirement_type', Voucher::REQ_SPEND) !== Voucher::REQ_QUANTITY) {
            $updates['min_quantity'] = null;
        }

        if ($this->input('discount_type') !== Voucher::TYPE_PERCENTAGE) {
            $updates['max_discount'] = null;
        }

        if (!empty($updates)) {
            $this->merge($updates);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        /** @var Voucher|int|string|null $routeVoucher */
        $routeVoucher = $this->route('voucher');
        $voucherId = $routeVoucher instanceof Voucher ? $routeVoucher->id : $routeVoucher;

        $isPercentage = $this->input('discount_type') === Voucher::TYPE_PERCENTAGE;

        return [
            'code' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'regex:/^[A-Z0-9_-]+$/',
                Rule::unique('vouchers', 'code')->ignore($voucherId),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:500'],
            'discount_type' => ['required', 'string', Rule::in([Voucher::TYPE_PERCENTAGE, Voucher::TYPE_FIXED_AMOUNT])],
            'scope_type' => ['nullable', 'string', Rule::in([Voucher::SCOPE_ALL, Voucher::SCOPE_SPECIFIC_PRODUCTS, Voucher::SCOPE_CATEGORY])],
            'applicable_products' => ['required_if:scope_type,' . Voucher::SCOPE_SPECIFIC_PRODUCTS, 'nullable', 'array', 'min:1'],
            'applicable_products.*' => ['integer', 'min:1'],
            'applicable_category' => ['required_if:scope_type,' . Voucher::SCOPE_CATEGORY, 'nullable', 'string', 'max:100'],
            'min_requirement_type' => ['nullable', 'string', Rule::in([Voucher::REQ_SPEND, Voucher::REQ_QUANTITY])],
            'min_quantity' => ['required_if:min_requirement_type,' . Voucher::REQ_QUANTITY, 'nullable', 'integer', 'min:1', 'max:1000'],
            'target_audience' => ['nullable', 'string', Rule::in([
                Voucher::AUDIENCE_ALL,
                Voucher::AUDIENCE_FOLLOWERS,
                Voucher::AUDIENCE_NEW_CUSTOMERS,
                Voucher::AUDIENCE_REPEAT_CUSTOMERS,
            ])],
            'discount_value' => array_values(array_filter([
                'required',
                $isPercentage ? 'integer' : 'numeric',
                'min:1',
                $isPercentage ? 'max:90' : 'max:100000',
            ])),
            'min_spend' => ['nullable', 'numeric', 'min:0', 'max:1000000'],
            'max_discount' => ['nullable', 'numeric', 'min:1', 'max:1000000'],
            'usage_limit_total' => ['nullable', 'integer', 'min:1', 'max:1000000'],
            'usage_limit_per_user' => ['required', 'integer', 'min:1', 'max:100'],
            'is_public' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'starts_at' => ['nullable', 'date'],
            'expires_at' => array_values(array_filter([
                'nullable',
                'date',
                $this->filled('starts_at') ? 'after:starts_at' : null,
            ])),
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            $totalPool = $this->filled('usage_limit_total') ? (int) $this->input('usage_limit_total') : null;
            $perUser = (int) $this->input('usage_limit_per_user', 1);

            if (
                !$validator->errors()->hasAny(['usage_limit_total', 'usage_limit_per_user']) &&
                $totalPool !== null &&
                $perUser > $totalPool
            ) {
                $validator->errors()->add(
                    'usage_limit_per_user',
                    "Uses per buyer ({$perUser}) cannot exceed the total redemption pool ({$totalPool})."
                );
            }

            $reqType = $this->input('min_requirement_type', Voucher::REQ_SPEND);
            $discountType = $this->input('discount_type');
            $discountVal = (float) $this->input('discount_value', 0);
            $minSpend = $this->filled('min_spend') ? (float) $this->input('min_spend') : 0.0;

            if (
                !$validator->errors()->hasAny(['discount_value', 'min_spend']) &&
                $discountType === Voucher::TYPE_FIXED_AMOUNT &&
                $reqType === Voucher::REQ_SPEND &&
                $minSpend > 0 &&
                $discountVal > $minSpend
            ) {
                $validator->errors()->add(
                    'min_spend',
                    'Minimum spend (PHP ' . number_format($minSpend, 2) . ') must be at least equal to the fixed discount (PHP ' . number_format($discountVal, 2) . '). Leave empty for no minimum.'
                );
            }

            if (!$validator->errors()->has('applicable_products') && $this->input('scope_type') === Voucher::SCOPE_SPECIFIC_PRODUCTS) {
                $ids = array_values(array_unique(array_filter(array_map('intval', (array) $this->input('applicable_products', [])))));
                $sellerOwnerId = $this->user()?->getEffectiveSeller()?->id;

                if ($sellerOwnerId && !empty($ids)) {
                    $routeVoucher = $this->route('voucher');
                    $voucherModel = $routeVoucher instanceof Voucher
                        ? $routeVoucher
                        : ($routeVoucher ? Voucher::find($routeVoucher) : null);
                    $existingIds = $voucherModel
                        ? array_map('intval', (array) ($voucherModel->applicable_products ?? []))
                        : [];

                    $ownedQuery = Product::where('user_id', $sellerOwnerId)->whereIn('id', $ids);
                    if (!empty($existingIds)) {
                        $ownedQuery->withTrashed()->where(function ($q) use ($existingIds) {
                            $q->whereNull('deleted_at')->orWhereIn('id', $existingIds);
                        });
                    }

                    $ownedCount = $ownedQuery->count();

                    if ($ownedCount !== count($ids)) {
                        $validator->errors()->add(
                            'applicable_products',
                            'One or more selected products do not belong to your workshop.'
                        );
                    }
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'code.regex' => 'Promo codes may only contain uppercase letters, numbers, hyphens, and underscores.',
            'code.unique' => 'This promo code is already in use. Please choose a unique code.',
            'applicable_products.required_if' => 'Select at least one product for this voucher.',
            'applicable_products.min' => 'Select at least one product for this voucher.',
            'applicable_category.required_if' => 'Select a workshop category for this voucher.',
            'expires_at.after' => 'Expiration date must be strictly later than the start date.',
            'discount_value.min' => 'Discount value must be at least 1.',
            'discount_value.max' => $this->input('discount_type') === Voucher::TYPE_PERCENTAGE
                ? 'Percentage discount cannot exceed 90%.'
                : 'Discount value cannot exceed PHP 100,000.',
            'max_discount.min' => 'Maximum discount cap must be at least PHP 1.',
            'min_spend.min' => 'Minimum basket spend cannot be negative.',
            'min_quantity.min' => 'Minimum item quantity must be at least 1.',
            'usage_limit_total.min' => 'Total redemption pool must be at least 1.',
            'usage_limit_per_user.min' => 'Uses per buyer must be at least 1.',
        ];
    }
}

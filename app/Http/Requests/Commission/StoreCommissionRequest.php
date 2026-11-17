<?php

declare(strict_types=1);

namespace App\Http\Requests\Commission;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCommissionRequest extends FormRequest
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
            'receiver_id' => ['required', 'integer', 'exists:users,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'total_amount' => ['required', 'numeric', 'min:50', 'max:500000'],
            'deposit_type' => ['required', 'in:percentage,fixed'],
            'deposit_value' => ['required', 'numeric', 'gt:0'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v) {
            $total = (float) $this->input('total_amount', 0);
            $type = (string) $this->input('deposit_type');
            $val = (float) $this->input('deposit_value', 0);

            if ($total <= 0) {
                $v->errors()->add('total_amount', 'Total amount must be greater than zero.');
                return;
            }

            $depositAmount = 0.0;
            if ($type === 'percentage') {
                if ($val < 1 || $val > 90) {
                    $v->errors()->add('deposit_value', 'Downpayment percentage must be between 1% and 90%.');
                } else {
                    $depositAmount = round($total * ($val / 100), 2);
                }
            } elseif ($type === 'fixed') {
                if ($val <= 0) {
                    $v->errors()->add('deposit_value', 'Downpayment amount must be greater than ₱0.');
                } elseif ($val >= $total) {
                    $v->errors()->add('deposit_value', 'Downpayment amount must be strictly less than the total commission amount.');
                } else {
                    $depositAmount = round($val, 2);
                }
            }

            $balanceAmount = round($total - $depositAmount, 2);

            if ($depositAmount > 0 && $depositAmount < 20.00) {
                $v->errors()->add('deposit_value', 'The resulting downpayment is ₱' . number_format($depositAmount, 2) . '. PayMongo requires a minimum transaction amount of ₱20.00.');
            }

            if ($balanceAmount > 0 && $balanceAmount < 20.00) {
                $v->errors()->add('deposit_value', 'The resulting final balance is ₱' . number_format($balanceAmount, 2) . '. PayMongo requires a minimum transaction amount of ₱20.00.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'receiver_id.required' => 'A recipient customer is required for custom commissions.',
            'title.required' => 'Commission title is required.',
            'total_amount.min' => 'Minimum commission amount is ₱50.00.',
            'deposit_value.gt' => 'Downpayment value must be greater than zero.',
        ];
    }
}

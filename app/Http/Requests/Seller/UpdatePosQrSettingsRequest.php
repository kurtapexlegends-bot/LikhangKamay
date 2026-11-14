<?php

namespace App\Http\Requests\Seller;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePosQrSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();

        return (bool) ($user && ($user->isArtisan() || $user->isWorkspaceOwner() || $user->canEditSellerModule('orders')));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $noPathTraversal = function (string $attribute, mixed $value, \Closure $fail): void {
            if (!is_string($value) || $value === '') {
                return;
            }

            if (
                str_contains($value, '..')
                || str_contains($value, '\\')
                || str_contains($value, "\0")
                || str_contains($value, '//')
                || preg_match('#(?:^|/)\.#', $value) === 1
            ) {
                $fail('The ' . str_replace('_', ' ', $attribute) . ' contains an invalid storage path.');
            }
        };

        return [
            'pos_gcash_qr_key' => ['nullable', 'string', 'max:500', 'starts_with:shops/', $noPathTraversal],
            'pos_maya_qr_key' => ['nullable', 'string', 'max:500', 'starts_with:shops/', $noPathTraversal],
            'clear_gcash_qr' => ['nullable', 'boolean'],
            'clear_maya_qr' => ['nullable', 'boolean'],
        ];
    }
}

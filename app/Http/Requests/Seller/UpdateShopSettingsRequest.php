<?php

declare(strict_types=1);

namespace App\Http\Requests\Seller;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\UploadedFile;

class UpdateShopSettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user()?->getEffectiveSeller();
        return (bool) ($user && $user->isArtisan());
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'bio' => 'nullable|string|max:500',
            'banner_image' => [
                'nullable',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $ext = strtolower($value->getClientOriginalExtension());
                        if (!in_array($ext, ['jpeg', 'jpg', 'png', 'gif', 'webp'], true)) {
                            $fail('The banner image must be a file of type: jpeg, png, jpg, gif, webp.');
                        }
                        if ($value->getSize() > 5242880) {
                            $fail('The banner image must not be greater than 5120 kilobytes.');
                        }
                    } elseif (!is_string($value)) {
                        $fail('The banner image must be a valid image file or storage key.');
                    }
                },
            ],
            'avatar' => [
                'nullable',
                function ($attribute, $value, $fail) {
                    if ($value instanceof UploadedFile) {
                        $ext = strtolower($value->getClientOriginalExtension());
                        if (!in_array($ext, ['jpeg', 'jpg', 'png', 'gif', 'webp'], true)) {
                            $fail('The avatar must be a file of type: jpeg, png, jpg, gif, webp.');
                        }
                        if ($value->getSize() > 10485760) {
                            $fail('The avatar must not be greater than 10240 kilobytes.');
                        }
                    } elseif (!is_string($value)) {
                        $fail('The avatar must be a valid image file or storage key.');
                    }
                },
            ],
            'banner_key' => 'nullable|string',
            'avatar_key' => 'nullable|string',
            'auto_reply_on_completion' => 'nullable|boolean',
            'auto_reply_completion_message' => 'nullable|string|max:1000',
        ];
    }
}

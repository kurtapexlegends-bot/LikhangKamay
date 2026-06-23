<?php

declare(strict_types=1);

namespace App\Http\Requests\Consumer;

use Illuminate\Foundation\Http\FormRequest;

class RequestReturnRequest extends FormRequest
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
            'return_reason' => ['required', 'string', 'max:1000'],
            'return_proof_image' => ['required', 'image', 'max:5120'],
        ];
    }
}

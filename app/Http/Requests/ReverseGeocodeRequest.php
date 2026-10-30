<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReverseGeocodeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'latitude.required' => 'Latitude coordinate is required.',
            'latitude.numeric' => 'Latitude must be a valid numeric coordinate.',
            'latitude.between' => 'Latitude must be between -90 and 90 degrees.',
            'longitude.required' => 'Longitude coordinate is required.',
            'longitude.numeric' => 'Longitude must be a valid numeric coordinate.',
            'longitude.between' => 'Longitude must be between -180 and 180 degrees.',
        ];
    }
}

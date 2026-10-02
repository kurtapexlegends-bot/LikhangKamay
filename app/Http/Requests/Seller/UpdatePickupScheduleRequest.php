<?php

declare(strict_types=1);

namespace App\Http\Requests\Seller;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePickupScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user()?->getEffectiveSeller();
        return (bool) ($user && $user->isArtisan());
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'is_enabled' => ['required', 'boolean'],
            'operating_days' => ['present', 'array'],
            'operating_days.*' => ['integer', 'between:1,7'],
            'time_slots' => ['present', 'array'],
            'time_slots.*.id' => ['required', 'string', 'max:50'],
            'time_slots.*.label' => ['nullable', 'string', 'max:100'],
            'time_slots.*.start_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'time_slots.*.end_time' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'time_slots.*.max_capacity' => ['required', 'integer', 'min:1', 'max:100'],
            'pickup_location_id' => ['nullable', 'integer', 'exists:seller_locations,id'],
            'max_advance_days' => ['nullable', 'integer', 'between:7,90'],
        ];
    }
}

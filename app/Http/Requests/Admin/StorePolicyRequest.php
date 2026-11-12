<?php

declare(strict_types=1);

namespace App\Http\Requests\Admin;

use App\Models\PlatformPolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class StorePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('admin-action');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', 'string', Rule::in(PlatformPolicy::ALL_TYPES)],
            'title' => ['required', 'string', 'max:255'],
            'version' => ['nullable', 'string', 'max:32'],
            'content_markdown' => ['required', 'string', 'min:10', 'max:100000'],
            'structured_criteria' => ['nullable', 'array'],
            'structured_criteria.return_window_hours' => ['nullable', 'integer', 'min:1', 'max:720'],
            'structured_criteria.max_photos' => ['nullable', 'integer', 'min:1', 'max:5'],
            'structured_criteria.eligible_reasons' => ['nullable', 'array'],
            'structured_criteria.eligible_reasons.*.code' => ['nullable', 'string', 'max:100'],
            'structured_criteria.eligible_reasons.*.label' => ['required_with:structured_criteria.eligible_reasons', 'string', 'max:255'],
            'structured_criteria.eligible_reasons.*.requires_description' => ['nullable', 'boolean'],
            'structured_criteria.eligible_reasons.*.enabled' => ['nullable', 'boolean'],
            'structured_criteria.mandatory_photo_angles' => ['nullable', 'array', 'max:5'],
            'structured_criteria.mandatory_photo_angles.*.key' => ['nullable', 'string', 'max:100'],
            'structured_criteria.mandatory_photo_angles.*.label' => ['required_with:structured_criteria.mandatory_photo_angles', 'string', 'max:255'],
            'structured_criteria.mandatory_photo_angles.*.required' => ['nullable', 'boolean'],
            'structured_criteria.checklist_items' => ['nullable', 'array'],
            'structured_criteria.checklist_items.*.key' => ['nullable', 'string', 'max:100'],
            'structured_criteria.checklist_items.*.label' => ['required_with:structured_criteria.checklist_items', 'string', 'max:500'],
            'structured_criteria.checklist_items.*.required' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'structured_criteria.return_window_hours' => 'return inspection window',
            'structured_criteria.max_photos' => 'proof photo ceiling',
            'structured_criteria.eligible_reasons' => 'eligible claim reasons',
            'structured_criteria.eligible_reasons.*.label' => 'claim reason label',
            'structured_criteria.mandatory_photo_angles' => 'mandatory photo angles',
            'structured_criteria.mandatory_photo_angles.*.label' => 'photo angle label',
            'structured_criteria.checklist_items' => 'eligibility checklist',
            'structured_criteria.checklist_items.*.label' => 'eligibility checklist statement',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'structured_criteria.eligible_reasons.*.label.required_with' => 'Every eligible claim reason must have a label.',
            'structured_criteria.eligible_reasons.*.label.string' => 'Every eligible claim reason must have a label.',
            'structured_criteria.mandatory_photo_angles.*.label.required_with' => 'Every mandatory photo angle must have a label.',
            'structured_criteria.mandatory_photo_angles.*.label.string' => 'Every mandatory photo angle must have a label.',
            'structured_criteria.checklist_items.*.label.required_with' => 'Every eligibility checklist item must have a statement.',
            'structured_criteria.checklist_items.*.label.string' => 'Every eligibility checklist item must have a statement.',
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator) {
            if ($this->input('type') !== PlatformPolicy::TYPE_RETURN_REFUND) {
                return;
            }

            $criteria = $this->input('structured_criteria');
            if (!is_array($criteria)) {
                return;
            }

            $maxPhotos = (int) ($criteria['max_photos'] ?? 5);
            $requiredAnglesCount = collect($criteria['mandatory_photo_angles'] ?? [])
                ->filter(fn ($angle) => is_array($angle) && filter_var($angle['required'] ?? true, FILTER_VALIDATE_BOOLEAN))
                ->count();

            if ($requiredAnglesCount > $maxPhotos) {
                $validator->errors()->add(
                    'structured_criteria.max_photos',
                    "Max proof photos ({$maxPhotos}) cannot be fewer than the {$requiredAnglesCount} required photo angles."
                );
            }
        });
    }
}

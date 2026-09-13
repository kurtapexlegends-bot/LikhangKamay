<?php

declare(strict_types=1);

namespace App\Http\Requests\Seller\HR;

use App\Support\HRWorkflowHelper;
use Illuminate\Foundation\Http\FormRequest;

class RejectAttendanceSessionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $actor = $this->user();
        return $actor !== null && HRWorkflowHelper::canEditHrRecords($actor);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reason' => 'nullable|string|max:255',
        ];
    }
}

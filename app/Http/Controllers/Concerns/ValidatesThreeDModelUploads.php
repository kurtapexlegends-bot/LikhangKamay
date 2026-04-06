<?php

namespace App\Http\Controllers\Concerns;

use Closure;
use Illuminate\Http\UploadedFile;

trait ValidatesThreeDModelUploads
{
    /**
     * Railway can report .glb/.gltf uploads with MIME types that do not map
     * cleanly through Laravel's mimes rule. Validate by file extension instead.
     *
     * @return array<int, mixed>
     */
    protected function threeDModelUploadRules(bool $required = false): array
    {
        return [
            $required ? 'required' : 'nullable',
            'file',
            'max:51200',
            function (string $attribute, mixed $value, Closure $fail): void {
                if (!$value instanceof UploadedFile) {
                    return;
                }

                $extension = strtolower((string) $value->getClientOriginalExtension());

                if (!in_array($extension, ['glb', 'gltf'], true)) {
                    $fail("The {$attribute} field must be a file of type: glb, gltf.");
                }
            },
        ];
    }
}

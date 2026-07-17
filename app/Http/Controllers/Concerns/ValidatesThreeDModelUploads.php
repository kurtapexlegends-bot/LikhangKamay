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
            function (string $attribute, mixed $value, Closure $fail): void {
                if (is_string($value)) {
                    $extension = strtolower(pathinfo($value, PATHINFO_EXTENSION));
                    if (!in_array($extension, ['glb', 'gltf'], true)) {
                        $fail("The {$attribute} field must be a file of type: glb, gltf.");
                    }
                    return;
                }

                if ($value instanceof UploadedFile) {
                    $extension = strtolower((string) $value->getClientOriginalExtension());
                    if (!in_array($extension, ['glb', 'gltf'], true)) {
                        $fail("The {$attribute} field must be a file of type: glb, gltf.");
                    }
                    if ($value->getSize() > 51200 * 1024) {
                        $fail("The {$attribute} field must not be greater than 50MB.");
                    }
                    return;
                }

                $fail("The {$attribute} must be a file or a valid storage path.");
            },
        ];
    }
}

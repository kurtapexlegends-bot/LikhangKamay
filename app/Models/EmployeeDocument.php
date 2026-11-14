<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $employee_id
 * @property int $user_id
 * @property int|null $uploaded_by_user_id
 * @property string $document_type
 * @property string $title
 * @property string $file_path
 * @property string $original_filename
 * @property string|null $mime_type
 * @property int $file_size
 * @property \Illuminate\Support\Carbon|null $expires_at
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
class EmployeeDocument extends Model
{
    use HasFactory;

    public const TYPE_VALID_ID = 'valid_id';
    public const TYPE_RESUME = 'resume';
    public const TYPE_NBI_CLEARANCE = 'nbi_clearance';
    public const TYPE_BARANGAY_CLEARANCE = 'barangay_clearance';
    public const TYPE_MEDICAL_CERTIFICATE = 'medical_certificate';
    public const TYPE_EMPLOYMENT_CONTRACT = 'employment_contract';
    public const TYPE_GOVERNMENT_IDS = 'government_ids';
    public const TYPE_OTHER = 'other';

    /**
     * Canonical document categories supported in HR employee records.
     *
     * @return array<string, string>
     */
    public static function documentTypes(): array
    {
        return [
            self::TYPE_VALID_ID => 'Valid Government ID',
            self::TYPE_RESUME => 'Resume / CV',
            self::TYPE_NBI_CLEARANCE => 'NBI / Police Clearance',
            self::TYPE_BARANGAY_CLEARANCE => 'Barangay Clearance',
            self::TYPE_MEDICAL_CERTIFICATE => 'Medical Certificate',
            self::TYPE_EMPLOYMENT_CONTRACT => 'Employment Contract',
            self::TYPE_GOVERNMENT_IDS => 'SSS / PhilHealth / Pag-IBIG / TIN',
            self::TYPE_OTHER => 'Other Document',
        ];
    }

    protected $fillable = [
        'employee_id',
        'user_id',
        'uploaded_by_user_id',
        'document_type',
        'title',
        'file_path',
        'original_filename',
        'mime_type',
        'file_size',
        'expires_at',
        'notes',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'expires_at' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id')->withTrashed();
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id')->withTrashed();
    }

    public function getFileUrlAttribute(): ?string
    {
        if (empty($this->file_path) || !$this->id || !$this->employee_id) {
            return null;
        }

        return rescue(fn () => route('hr.employees.documents.file', [
            'employee' => $this->employee_id,
            'document' => $this->id,
        ]), null, report: false);
    }

    public function getDownloadUrlAttribute(): ?string
    {
        if (empty($this->file_path) || !$this->id || !$this->employee_id) {
            return null;
        }

        return rescue(fn () => route('hr.employees.documents.file', [
            'employee' => $this->employee_id,
            'document' => $this->id,
            'download' => 1,
        ]), null, report: false);
    }

    public function isPdf(): bool
    {
        return strcasecmp((string) $this->mime_type, 'application/pdf') === 0
            || str_ends_with(strtolower((string) $this->original_filename), '.pdf');
    }

    public function isImage(): bool
    {
        if (str_starts_with(strtolower((string) $this->mime_type), 'image/')) {
            return true;
        }

        $ext = strtolower(pathinfo((string) $this->original_filename, PATHINFO_EXTENSION));
        return in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true);
    }

    public function getTypeLabel(): string
    {
        $types = self::documentTypes();
        return $types[$this->document_type] ?? 'Document';
    }

    /**
     * Serialize document payload for HR workspace views.
     *
     * @return array<string, mixed>
     */
    public function serializeForHr(): array
    {
        $uploadedAt = $this->created_at?->toIso8601String();

        return [
            'id' => $this->id,
            'employee_id' => $this->employee_id,
            'document_type' => $this->document_type,
            'document_type_label' => $this->getTypeLabel(),
            'title' => $this->title ?: $this->getTypeLabel(),
            'file_url' => $this->file_url,
            'download_url' => $this->download_url,
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => (int) ($this->file_size ?? 0),
            'is_pdf' => $this->isPdf(),
            'is_image' => $this->isImage(),
            'expires_at' => $this->expires_at?->format('Y-m-d'),
            'notes' => $this->notes,
            'uploaded_by_name' => $this->relationLoaded('uploadedBy') ? $this->uploadedBy?->name : null,
            'uploaded_at' => $uploadedAt,
            'created_at' => $uploadedAt,
        ];
    }
}

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'kyc_selfie_path')) {
                $table->string('kyc_selfie_path')->nullable()->after('valid_id');
            }
            if (!Schema::hasColumn('users', 'kyc_liveness_verified_at')) {
                $table->timestamp('kyc_liveness_verified_at')->nullable()->after('kyc_selfie_path');
            }
            if (!Schema::hasColumn('users', 'requires_checkout_face_check')) {
                $table->boolean('requires_checkout_face_check')->default(false)->after('kyc_liveness_verified_at');
            }
            if (!Schema::hasColumn('users', 'face_descriptor')) {
                $table->json('face_descriptor')->nullable()->after('requires_checkout_face_check');
            }
            if (!Schema::hasColumn('users', 'kyc_verification_meta')) {
                $table->json('kyc_verification_meta')->nullable()->after('face_descriptor');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToDrop = array_values(array_filter([
                Schema::hasColumn('users', 'kyc_selfie_path') ? 'kyc_selfie_path' : null,
                Schema::hasColumn('users', 'kyc_liveness_verified_at') ? 'kyc_liveness_verified_at' : null,
                Schema::hasColumn('users', 'requires_checkout_face_check') ? 'requires_checkout_face_check' : null,
                Schema::hasColumn('users', 'face_descriptor') ? 'face_descriptor' : null,
                Schema::hasColumn('users', 'kyc_verification_meta') ? 'kyc_verification_meta' : null,
            ]));

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};

<?php

use App\Casts\PostgresCompatibleBoolean;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (
            Schema::hasTable('users')
            && Schema::hasColumn('users', 'requires_checkout_face_check')
            && Schema::hasColumn('users', 'kyc_liveness_verified_at')
            && Schema::hasColumn('users', 'is_test')
        ) {
            DB::table('users')
                ->whereIn('role', ['user', 'buyer'])
                ->whereNull('kyc_liveness_verified_at')
                ->where('is_test', PostgresCompatibleBoolean::dbVal(false))
                ->update(['requires_checkout_face_check' => PostgresCompatibleBoolean::dbVal(true)]);
        }
    }

    public function down(): void
    {
        if (
            Schema::hasTable('users')
            && Schema::hasColumn('users', 'requires_checkout_face_check')
            && Schema::hasColumn('users', 'kyc_liveness_verified_at')
        ) {
            DB::table('users')
                ->whereIn('role', ['user', 'buyer'])
                ->whereNull('kyc_liveness_verified_at')
                ->update(['requires_checkout_face_check' => PostgresCompatibleBoolean::dbVal(false)]);
        }
    }
};

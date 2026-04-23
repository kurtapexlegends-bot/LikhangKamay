<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verification_code_hash')) {
                $table->text('email_verification_code_hash')->nullable()->after('email_verified_at');
            }

            if (!Schema::hasColumn('users', 'email_verification_code_expires_at')) {
                $table->timestamp('email_verification_code_expires_at')->nullable()->after('email_verification_code_hash');
            }

            if (!Schema::hasColumn('users', 'email_verification_code_sent_at')) {
                $table->timestamp('email_verification_code_sent_at')->nullable()->after('email_verification_code_expires_at');
            }

            if (!Schema::hasColumn('users', 'email_verification_code_attempts')) {
                $table->unsignedTinyInteger('email_verification_code_attempts')->default(0)->after('email_verification_code_sent_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columns = array_filter([
                Schema::hasColumn('users', 'email_verification_code_hash') ? 'email_verification_code_hash' : null,
                Schema::hasColumn('users', 'email_verification_code_expires_at') ? 'email_verification_code_expires_at' : null,
                Schema::hasColumn('users', 'email_verification_code_sent_at') ? 'email_verification_code_sent_at' : null,
                Schema::hasColumn('users', 'email_verification_code_attempts') ? 'email_verification_code_attempts' : null,
            ]);

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};

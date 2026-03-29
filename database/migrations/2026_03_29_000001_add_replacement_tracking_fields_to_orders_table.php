<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('replacement_resolution_description')->nullable()->after('return_proof_image');
            $table->timestamp('replacement_started_at')->nullable()->after('replacement_resolution_description');
            $table->timestamp('replacement_resolved_at')->nullable()->after('replacement_started_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'replacement_resolution_description',
                'replacement_started_at',
                'replacement_resolved_at',
            ]);
        });
    }
};

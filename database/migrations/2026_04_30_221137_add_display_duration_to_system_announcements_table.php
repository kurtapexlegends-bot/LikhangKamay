<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('system_announcements', function (Blueprint $table) {
            $table->unsignedInteger('display_duration')->nullable()->after('broadcast_version')
                  ->comment('Seconds the banner stays visible per user. Null = until dismissed.');
        });
    }

    public function down(): void
    {
        Schema::table('system_announcements', function (Blueprint $table) {
            $table->dropColumn('display_duration');
        });
    }
};

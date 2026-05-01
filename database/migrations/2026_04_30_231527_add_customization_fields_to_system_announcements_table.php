<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('system_announcements', function (Blueprint $table) {
            $table->string('icon_name')->nullable()->after('message');
            $table->string('bg_color')->nullable()->after('icon_name');
            $table->string('text_color')->nullable()->after('bg_color');
            $table->string('action_text')->nullable()->after('text_color');
            $table->string('action_url')->nullable()->after('action_text');
        });
    }

    public function down(): void
    {
        Schema::table('system_announcements', function (Blueprint $table) {
            $table->dropColumn(['icon_name', 'bg_color', 'text_color', 'action_text', 'action_url']);
        });
    }
};
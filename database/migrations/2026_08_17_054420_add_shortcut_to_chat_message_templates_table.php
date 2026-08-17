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
        Schema::table('chat_message_templates', function (Blueprint $table) {
            if (!Schema::hasColumn('chat_message_templates', 'shortcut')) {
                $table->string('shortcut', 50)->nullable()->after('title')->index();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_message_templates', function (Blueprint $table) {
            if (Schema::hasColumn('chat_message_templates', 'shortcut')) {
                $table->dropIndex(['shortcut']);
                $table->dropColumn('shortcut');
            }
        });
    }
};

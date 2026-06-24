<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Create team_channels table
        Schema::create('team_channels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->foreignId('created_by_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['seller_owner_id']);
        });

        // 2. Create team_channel_members table
        Schema::create('team_channel_members', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_channel_id')->constrained('team_channels')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();

            $table->unique(['team_channel_id', 'user_id']);
        });

        // 3. Modify team_messages table
        Schema::table('team_messages', function (Blueprint $table) {
            $table->foreignId('team_channel_id')->nullable()->after('receiver_id')->constrained('team_channels')->nullOnDelete();
            $table->foreignId('receiver_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('team_messages', function (Blueprint $table) {
            $table->dropForeign(['team_channel_id']);
            $table->dropColumn('team_channel_id');
            // Revert receiver_id to not nullable
            $table->foreignId('receiver_id')->nullable(false)->change();
        });

        Schema::dropIfExists('team_channel_members');
        Schema::dropIfExists('team_channels');
    }
};

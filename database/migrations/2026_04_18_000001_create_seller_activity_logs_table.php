<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('seller_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_owner_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_type', 30)->nullable();
            $table->string('category', 40)->default('operations');
            $table->string('module', 60)->default('workspace');
            $table->string('event_type', 60)->default('updated');
            $table->string('severity', 20)->default('info');
            $table->string('status', 40)->nullable();
            $table->string('title');
            $table->text('summary');
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->string('subject_label')->nullable();
            $table->string('reference')->nullable();
            $table->string('amount_label')->nullable();
            $table->json('details')->nullable();
            $table->text('target_url')->nullable();
            $table->string('target_label')->nullable();
            $table->timestamp('occurred_at')->nullable()->index();
            $table->timestamps();

            $table->index(['seller_owner_id', 'category']);
            $table->index(['seller_owner_id', 'module']);
            $table->index(['seller_owner_id', 'severity']);
            $table->index(['seller_owner_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_activity_logs');
    }
};

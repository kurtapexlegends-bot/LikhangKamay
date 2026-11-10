<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('revision_requests')) {
            Schema::create('revision_requests', function (Blueprint $table) {
                $table->id();
                $table->string('revisable_type');
                $table->unsignedBigInteger('revisable_id');
                $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
                $table->json('revision_items');
                $table->text('summary_note')->nullable();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();

                $table->index(['revisable_type', 'revisable_id', 'resolved_at'], 'revision_requests_lookup_idx');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('revision_requests');
    }
};

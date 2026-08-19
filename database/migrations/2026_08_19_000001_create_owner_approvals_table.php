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
        if (!Schema::hasTable('owner_approvals')) {
            Schema::create('owner_approvals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('reviewer_id')->nullable()->constrained('users')->nullOnDelete();
                
                $table->string('domain'); // 'hr_payroll', 'staff_rate', 'procurement', 'discount', 'refund', 'product_draft'
                $table->nullableMorphs('approvable');
                
                $table->string('title');
                $table->text('summary')->nullable();
                $table->json('changes_payload')->nullable();
                
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->text('rejection_reason')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamps();

                $table->index(['seller_id', 'status']);
                $table->index(['seller_id', 'domain']);
                $table->index(['requester_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('owner_approvals');
    }
};

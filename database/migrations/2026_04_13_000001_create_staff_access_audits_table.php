<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_access_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('staff_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('event', 60);
            $table->string('summary');
            $table->json('details')->nullable();
            $table->timestamps();

            $table->index(['seller_owner_id', 'created_at']);
            $table->index(['staff_user_id', 'created_at']);
            $table->index(['employee_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_access_audits');
    }
};

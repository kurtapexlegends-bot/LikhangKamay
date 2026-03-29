<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->date('attendance_date');
            $table->timestamp('clock_in_at');
            $table->timestamp('clock_out_at')->nullable();
            $table->string('close_mode')->nullable();
            $table->unsignedInteger('worked_minutes')->default(0);
            $table->timestamps();

            $table->index(['staff_user_id', 'clock_out_at']);
            $table->index(['seller_owner_id', 'attendance_date']);
            $table->index(['employee_id', 'attendance_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_attendance_sessions');
    }
};

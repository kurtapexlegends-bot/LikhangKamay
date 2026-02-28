<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        // 1. EMPLOYEES TABLE (Simple List)
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // The Seller
            $table->string('name');
            $table->string('role'); // e.g., "Potter", "Assistant"
            $table->decimal('salary', 10, 2);
            $table->string('status')->default('Active'); // Active, On Leave
            $table->date('join_date');
            $table->timestamps();
        });

        // 2. PAYROLLS TABLE (History of Approvals)
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('month'); // e.g., "January 2026"
            $table->decimal('total_amount', 10, 2);
            $table->integer('employee_count');
            $table->string('status')->default('Paid');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('payrolls');
        Schema::dropIfExists('employees');
    }
};
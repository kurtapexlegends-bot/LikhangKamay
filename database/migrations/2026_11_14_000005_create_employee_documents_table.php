<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('employee_documents')) {
            return;
        }

        Schema::create('employee_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('document_type', 64);
            $table->string('title', 150);
            $table->string('file_path', 500);
            $table->string('original_filename', 255);
            $table->string('mime_type', 120)->nullable();
            $table->unsignedInteger('file_size')->default(0);
            $table->date('expires_at')->nullable();
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'employee_id']);
            $table->index(['employee_id', 'document_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_documents');
    }
};

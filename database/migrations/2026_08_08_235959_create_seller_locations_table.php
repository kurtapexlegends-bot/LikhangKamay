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
        if (!Schema::hasTable('seller_locations')) {
            Schema::create('seller_locations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('name');
                $table->string('address')->nullable();
                $table->decimal('latitude', 10, 8);
                $table->decimal('longitude', 11, 8);
                $table->integer('radius_meters')->default(100);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'assigned_location_id')) {
                $table->foreignId('assigned_location_id')
                    ->nullable()
                    ->after('user_id')
                    ->constrained('seller_locations')
                    ->nullOnDelete();
            }

            if (!Schema::hasColumn('employees', 'allow_remote_clock_in')) {
                $table->boolean('allow_remote_clock_in')
                    ->default(false)
                    ->after('assigned_location_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'assigned_location_id')) {
                $table->dropForeign(['assigned_location_id']);
                $table->dropColumn('assigned_location_id');
            }
            if (Schema::hasColumn('employees', 'allow_remote_clock_in')) {
                $table->dropColumn('allow_remote_clock_in');
            }
        });

        Schema::dropIfExists('seller_locations');
    }
};

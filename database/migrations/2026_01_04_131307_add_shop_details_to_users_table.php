<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Address / Contact Info (Step 1)
            $table->string('phone_number')->nullable()->after('shop_name');
            $table->string('street_address')->nullable()->after('phone_number');
            $table->string('city')->nullable()->after('street_address');
            $table->string('zip_code')->nullable()->after('city');

            // Legal Verification Files (Step 2)
            // We store the PATH to the file, not the file itself
            $table->string('business_permit')->nullable()->after('zip_code');
            $table->string('dti_registration')->nullable()->after('business_permit');
            $table->string('valid_id')->nullable()->after('dti_registration');
            $table->string('tin_id')->nullable()->after('valid_id');
            
            // Setup Completion Timestamp
            // We'll use this to know if they finished the whole wizard
            $table->timestamp('setup_completed_at')->nullable()->after('updated_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'phone_number', 'street_address', 'city', 'zip_code',
                'business_permit', 'dti_registration', 'valid_id', 'tin_id',
                'setup_completed_at'
            ]);
        });
    }
};
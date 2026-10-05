<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use App\Models\PlatformVariable;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('platform_variables')) {
            $record = PlatformVariable::where('key', 'contact_info')->first();
            if ($record) {
                $data = json_decode((string) $record->value, true) ?: [];
                $data['email'] = 'likhangkamaybusiness@gmail.com';
                $record->value = json_encode($data);
                $record->save();
            } else {
                PlatformVariable::create([
                    'key' => 'contact_info',
                    'value' => json_encode([
                        'email' => 'likhangkamaybusiness@gmail.com',
                        'phone' => '+639701640999',
                        'address' => 'Blk 35 Lot 17 Brgy. San Miguel 1 Dasmarinas City, Cavite',
                    ]),
                    'type' => 'json',
                    'description' => 'Platform contact and support information',
                ]);
            }

            \Illuminate\Support\Facades\Cache::forget('system_settings_all');
            \Illuminate\Support\Facades\Cache::forget('setting_contact_info');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};

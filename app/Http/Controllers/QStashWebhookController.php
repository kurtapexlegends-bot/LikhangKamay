<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\User;

class QStashWebhookController extends Controller
{
    /**
     * Handle incoming async jobs from QStash.
     */
    public function handle(Request $request)
    {
        // Simple security check
        $secret = config('services.qstash.secret');
        if ($request->input('secret') !== $secret) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $type = $request->input('type');
        $data = $request->input('data', []);

        try {
            switch ($type) {
                case 'send_verification_email':
                    $this->processEmailVerification($data);
                    break;
                
                case 'send_password_reset':
                    $this->processPasswordReset($data);
                    break;

                default:
                    Log::warning("Unknown QStash job type: {$type}");
            }

            return response()->json(['status' => 'success']);
        } catch (\Exception $e) {
            Log::error("QStash Job Processing Failed: " . $e->getMessage());
            return response()->json(['error' => 'Processing failed'], 500);
        }
    }

    protected function processEmailVerification(array $data)
    {
        $user = User::find($data['user_id']);
        if ($user) {
            // Re-use the existing logic but execute it here in the background
            $user->sendEmailVerificationNotification();
        }
    }

    protected function processPasswordReset(array $data)
    {
        $user = User::find($data['user_id']);
        if ($user) {
            $user->sendPasswordResetNotification($data['token']);
        }
    }
}

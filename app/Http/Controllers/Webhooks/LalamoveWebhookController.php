<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LalamoveWebhookController extends Controller
{
    /**
     * Handle Lalamove Webhook calls.
     */
    public function __invoke(Request $request)
    {
        Log::info('Lalamove Webhook received', $request->all());
        
        // Placeholder for future implementation
        return response()->json(['status' => 'received']);
    }
}

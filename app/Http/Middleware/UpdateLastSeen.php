<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use App\Models\User;

class UpdateLastSeen
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        try {
            if (Auth::check()) {
                $user = Auth::user();
                $cacheKey = 'user-is-online-' . $user->id;

                // Update only if cache expired (expires every 15 minutes or so)
                if (!Cache::has($cacheKey)) {
                    $user->last_seen_at = now();
                    $user->save(); // Save to DB

                    // Cache for 15 minutes to prevent DB spam
                    Cache::put($cacheKey, true, now()->addMinutes(15));
                }
            }
        } catch (\Exception $e) {
            // Silently fail to keep the app running even if DB is unstable
        }

        return $next($request);
    }
}

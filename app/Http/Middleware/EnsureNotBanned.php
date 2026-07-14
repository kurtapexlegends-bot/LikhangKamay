<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class EnsureNotBanned
{
    public function handle(Request $request, Closure $next)
    {
        if (Auth::check()) {
            $user = Auth::user();
            
            // Resolve employing artisan's banned state if the user is staff
            $ownerBanned = $user->isStaff() && $user->sellerOwner?->banned_at !== null;
            
            if ($user->banned_at !== null || $ownerBanned) {
                Auth::logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                return redirect()->route('login')->withErrors([
                    'email' => 'This account has been suspended or banned by an administrator.'
                ]);
            }
        }

        return $next($request);
    }
}

<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Assuming there's at least one user
$user = User::first();

if (!$user) {
    echo "No user found in database.\n";
    exit;
}

echo "Testing Remember Me for user: {$user->email}\n";
echo "Initial remember_token: " . ($user->remember_token ?: 'NULL') . "\n";

// Simulate login with remember
Auth::login($user, true);

// Refresh user from DB
$user->refresh();

echo "Post-login remember_token: " . ($user->remember_token ?: 'NULL') . "\n";

if ($user->remember_token) {
    echo "SUCCESS: Remember token was generated.\n";
} else {
    echo "FAILURE: Remember token was NOT generated.\n";
}

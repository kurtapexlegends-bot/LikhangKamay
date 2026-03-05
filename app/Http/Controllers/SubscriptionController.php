<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class SubscriptionController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Count how many products the user has active
        $activeProductsCount = $user->products()->where('status', 'Active')->count();

        return Inertia::render('Seller/Subscription', [
            'subscription_tier' => $user->subscription_tier,
            'sponsorship_credits' => $user->sponsorship_credits,
            'active_products_count' => $activeProductsCount,
            'product_limit' => $user->getProductLimit()
        ]);
    }
}

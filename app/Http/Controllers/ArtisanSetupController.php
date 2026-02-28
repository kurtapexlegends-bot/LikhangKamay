<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Mail\NewArtisanApplication;

class ArtisanSetupController extends Controller
{
    public function create()
    {
        $user = Auth::user();
        
        // Guard: Only artisans can access this page
        if (!$user->isArtisan()) {
            return redirect('/shop');
        }
        
        // Guard: Already approved artisans go to dashboard
        if ($user->isApproved()) {
            return redirect()->route('dashboard');
        }
        
        // Guard: Pending approval artisans go to pending page
        if ($user->isPendingApproval() && $user->setup_completed_at) {
            return redirect()->route('artisan.pending');
        }
        
        return Inertia::render('Auth/ArtisanSetup');
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $step = $request->input('current_step');

        // --- STEP 1: SHOP INFO ---
        if ($step == 1) {
            $validated = $request->validate([
                'shop_name' => ['required', 'string', 'max:30', Rule::unique('users', 'shop_name')->ignore($user->id)],
                'phone_number' => 'required|string|max:20',
                'street_address' => 'required|string|max:255',
                'city' => 'required|string',
                'zip_code' => 'required|string|max:10',
                'barangay' => 'required|string', 
            ]);

            $user->update([
                'shop_name' => $validated['shop_name'],
                'phone_number' => $validated['phone_number'],
                'street_address' => $validated['street_address'],
                'city' => $validated['city'],
                'zip_code' => $validated['zip_code'],
            ]);

            return back(); 
        }

        // --- STEP 2: LEGAL FILES ---
        if ($step == 2) {
            $request->validate([
                'business_permit' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'dti_registration' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'valid_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
                'tin_id' => 'required|file|mimes:jpg,jpeg,png,pdf|max:10240',
            ]);

            $upload = function ($key) use ($request) {
                if ($request->hasFile($key)) {
                    return $request->file($key)->store('legal_docs', 'public');
                }
                return null;
            };

            $user->update([
                'business_permit' => $upload('business_permit'),
                'dti_registration' => $upload('dti_registration'),
                'valid_id' => $upload('valid_id'),
                'tin_id' => $upload('tin_id'),
                'setup_completed_at' => now(),
                'artisan_status' => 'pending',
                'artisan_rejection_reason' => null,
            ]);

            // Notify super admin about new application
            $adminEmail = 'likhangkamaybusiness@gmail.com';
            Mail::to($adminEmail)->send(new NewArtisanApplication($user));

            return redirect()->route('artisan.pending');
        }

        return back()->with('error', 'Invalid step');
    }
}
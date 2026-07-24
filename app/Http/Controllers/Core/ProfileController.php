<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;

use App\Http\Requests\ProfileUpdateRequest;
use App\Support\PersonName;
use App\Support\StructuredAddress;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Session;
use App\Facades\Settings;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request)
    {
        try {
            $user = $request->user();

            if ($user->role === 'artisan' && $user->artisan_status === 'pending') {
                return redirect()->route('artisan.pending');
            }

            // Workspace profile shell for seller owners, seller staff, and super admins.
            if (in_array($user->role, ['artisan', 'staff', 'super_admin'], true)) {
                return Inertia::render('Seller/Profile/Edit', [
                    'mustVerifyEmail' => $user instanceof MustVerifyEmail,
                    'status' => session('status'),
                    'addresses' => $user->addresses()->orderBy('is_default', 'desc')->get(),
                    'profileMode' => $user->role === 'artisan' ? 'owner' : 'personal',
                    'workspaceShell' => $user->role === 'super_admin' ? 'admin' : 'seller',
                ]);
            }

            // Default view for Buyers using the Public Shop Layout
            return Inertia::render('Consumer/Profile/Edit', [
                'mustVerifyEmail' => $user instanceof MustVerifyEmail,
                'status' => session('status'),
                'addresses' => $user->addresses()->orderBy('is_default', 'desc')->get(),
            ]);
        } catch (Throwable $e) {
            Log::error("Profile edit error: " . $e->getMessage());
            return Inertia::render('Consumer/Profile/Edit', [
                'mustVerifyEmail' => false,
                'status' => 'error',
                'addresses' => [],
            ]);
        }
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'artisan' && $user->artisan_status === 'pending') {
            return redirect()->route('artisan.pending');
        }

        $data = $request->validated();
        $emailChanged = false;

        $name = PersonName::normalize(
            $data['first_name'] ?? null,
            $data['last_name'] ?? null,
            $data['name'] ?? $user->name,
        );

        $persistableName = \App\Models\User::persistableNameAttributes($name);
        $data['name'] = $persistableName['name'];

        if (\App\Models\User::supportsSplitNameColumns()) {
            $data['first_name'] = $persistableName['first_name'] ?? null;
            $data['last_name'] = $persistableName['last_name'] ?? null;
        } else {
            unset($data['first_name'], $data['last_name']);
        }

        foreach (['phone_number', 'street_address', 'barangay', 'city', 'region', 'zip_code'] as $field) {
            if (array_key_exists($field, $data)) {
                $data[$field] = StructuredAddress::clean($data[$field]);
            }
        }

        // Keep the existing avatar unless the user explicitly uploads a replacement.
        if (!$request->hasFile('avatar')) {
            unset($data['avatar']);
        }

        // Handle Avatar Upload
        if ($request->hasFile('avatar')) {
            try {
                // Delete old avatar if exists
                if ($user->avatar) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
                }

                $path = $request->file('avatar')->store('avatars', 'public');
                $data['avatar'] = $path;
            } catch (\Exception $e) {
                Log::error('Profile avatar upload failed: ' . $e->getMessage());
                // Don't crash the request, just notify that the image failed
                Session::flash('error', 'Profile details updated, but your avatar could not be saved due to storage restrictions.');
            }
        }

        $user->fill($data);

        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
            $emailChanged = true;
        }

        $user->save();

        // If Super Admin, handle platform branding updates
        if ($user->role === 'super_admin') {
            if ($request->has('platform_name')) {
                \App\Facades\Settings::set('platform_name', $request->platform_name);
            }

            if ($request->hasFile('platform_logo')) {
                $logoPath = $request->file('platform_logo')->store('branding', 'public');
                $logoUrl = \App\Services\StorageUrl::url($logoPath);
                \App\Facades\Settings::set('platform_logo', $logoUrl);
            }
        }

        if ($emailChanged) {
            try {
                $user->sendEmailVerificationNotification();
            } catch (Throwable $exception) {
                Log::error('Profile verification code email failed to send.', [
                    'user_id' => $user->id,
                    'email' => $user->email,
                    'message' => $exception->getMessage(),
                ]);

                return Redirect::route('profile.edit')
                    ->with('error', 'Profile updated, but the verification code could not be sent right now.');
            }

            return Redirect::route('profile.edit')
                ->with('status', 'verification-code-sent');
        }

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user->role === 'artisan' && $user->artisan_status === 'pending') {
            return redirect()->route('artisan.pending');
        }

        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}

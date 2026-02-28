<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\UserAddress;
use Illuminate\Support\Facades\Auth;

class UserAddressController extends Controller
{
    // POST /user-addresses
    public function store(Request $request) 
    {
        $validated = $request->validate([
            'label' => 'required|string|max:50',
            'recipient_name' => 'required|string|max:100',
            'phone_number' => 'required|string|max:20',
            'full_address' => 'required|string',
            'city' => 'nullable|string',
            'region' => 'nullable|string',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $address = $user->addresses()->create($validated);

        // If it's the first address, make it default
        if ($user->addresses()->count() === 1) {
            $address->update(['is_default' => true]);
        }

        return redirect()->back()->with('success', 'Address added.');
    }

    // PATCH /user-addresses/{address}/set-default
    public function setDefault($id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $address = $user->addresses()->findOrFail($id);
        
        // Remove default from others
        $user->addresses()->update(['is_default' => false]);
        
        // Set new default
        $address->update(['is_default' => true]);

        return redirect()->back();
    }

    // DELETE /user-addresses/{address}
    public function destroy($id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $address = $user->addresses()->findOrFail($id);
        $address->delete();

        // If we deleted the default, set another one as default?
        // Logic: if user has other addresses, pick the last one
        $lastAddress = $user->addresses()->latest()->first();
        if ($lastAddress) {
            $lastAddress->update(['is_default' => true]);
        }

        return redirect()->back()->with('success', 'Address deleted.');
    }
}

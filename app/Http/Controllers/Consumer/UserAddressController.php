<?php

namespace App\Http\Controllers;

use App\Support\StructuredAddress;
use Illuminate\Http\Request;
use App\Models\UserAddress;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class UserAddressController extends Controller
{
    // POST /user-addresses
    public function store(Request $request) 
    {
        $validated = $this->validateAddress($request);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $validated = $this->normalizeAddressPayload($validated);
        $address = $user->addresses()->create($validated);

        // If it's the first address, make it default
        if ($user->addresses()->count() === 1) {
            $address->update(['is_default' => true]);
        }

        return redirect()->back()->with('success', 'Address added.');
    }

    // PATCH /user-addresses/{address}
    public function update(Request $request, $id)
    {
        $validated = $this->validateAddress($request);

        /** @var \App\Models\User $user */
        $user = Auth::user();
        $address = $user->addresses()->findOrFail($id);

        $address->update($this->normalizeAddressPayload($validated));

        return redirect()->back()->with('success', 'Address updated.');
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

    /**
     * @return array<string, mixed>
     */
    private function validateAddress(Request $request): array
    {
        return $request->validate([
            'label' => 'required|string|max:50',
            'address_type' => 'required|string|in:home,office,other',
            'recipient_name' => 'required|string|max:100',
            'phone_number' => 'required|string|max:20',
            'street_address' => 'nullable|string|max:255',
            'barangay' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'region' => 'nullable|string|max:255',
            'postal_code' => 'nullable|string|max:20',
            'full_address' => 'nullable|string',
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function normalizeAddressPayload(array $validated): array
    {
        $validated['label'] = trim((string) ($validated['label'] ?? '')) !== ''
            ? $validated['label']
            : ucfirst((string) ($validated['address_type'] ?? 'home'));

        $streetAddress = StructuredAddress::clean($validated['street_address'] ?? null);
        $barangay = StructuredAddress::clean($validated['barangay'] ?? null);
        $city = StructuredAddress::clean($validated['city'] ?? null);
        $region = StructuredAddress::clean($validated['region'] ?? null);
        $postalCode = StructuredAddress::clean($validated['postal_code'] ?? null);
        $legacyFullAddress = trim((string) ($validated['full_address'] ?? ''));

        $structuredAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $streetAddress,
            'barangay' => $barangay,
            'city' => $city,
            'region' => $region,
            'postal_code' => $postalCode,
        ]);

        if ($streetAddress === null && $legacyFullAddress !== '') {
            $structuredAddress = $legacyFullAddress;
        }

        if ($structuredAddress === '') {
            $structuredAddress = $legacyFullAddress;
        }

        if ($structuredAddress === '') {
            throw ValidationException::withMessages([
                'street_address' => 'A complete address is required.',
            ]);
        }

        $validated['street_address'] = $streetAddress;
        $validated['barangay'] = $barangay;
        $validated['city'] = $city;
        $validated['region'] = $region;
        $validated['postal_code'] = $postalCode;
        $validated['full_address'] = $structuredAddress;

        return $validated;
    }
}

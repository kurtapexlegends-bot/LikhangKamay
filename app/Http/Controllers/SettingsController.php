<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SettingsController extends Controller
{
    /**
     * Update the user's enabled modules.
     */
    public function updateModules(Request $request)
    {
        $request->validate([
            'hr' => 'boolean',
            'accounting' => 'boolean',
            'procurement' => 'boolean',
        ]);

        /** @var \App\Models\User $user */
        $user = Auth::user();

        $modules = [
            'hr' => $request->boolean('hr'),
            'accounting' => $request->boolean('accounting'),
            'procurement' => true, // LOCKED: Cannot be disabled as Inventory relies on it
        ];

        // Merge with existing logic if needed, but here simple replacement is fine
        $user->modules_enabled = $modules;
        $user->save();

        return redirect()->back()->with('success', 'Module settings updated.');
    }
}

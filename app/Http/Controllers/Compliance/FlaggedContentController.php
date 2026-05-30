<?php

namespace App\Http\Controllers\Compliance;

use App\Http\Controllers\Controller;

use App\Models\FlaggedContent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class FlaggedContentController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'reportable_type' => 'required|string|in:App\Models\Product,App\Models\Review,App\Models\User',
            'reportable_id' => 'required|integer',
            'reason' => 'required|string|max:1000',
        ]);

        $validated['reporter_id'] = Auth::id();

        // Prevent duplicate pending reports from the same user for the same content
        $exists = FlaggedContent::where('reporter_id', $validated['reporter_id'])
            ->where('reportable_type', $validated['reportable_type'])
            ->where('reportable_id', $validated['reportable_id'])
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return back()->with('error', 'You have already reported this content.');
        }

        FlaggedContent::create($validated);

        \App\Models\PlatformActivity::create([
            'user_id' => Auth::id(),
            'action' => 'content_flagged',
            'description' => 'User flagged ' . strtolower(class_basename($validated['reportable_type'])) . ' ID ' . $validated['reportable_id'] . ' for moderation.',
            'metadata' => ['reportable_type' => $validated['reportable_type'], 'reportable_id' => $validated['reportable_id']]
        ]);

        return back()->with('success', 'Thank you. The content has been reported for review.');
    }
}
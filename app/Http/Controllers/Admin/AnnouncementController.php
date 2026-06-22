<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\SystemAnnouncement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class AnnouncementController extends Controller
{
    /**
     * System Announcements List
     */
    public function index()
    {
        Gate::authorize('admin-action');

        return Inertia::render('Admin/Layout/Announcements', [
            'announcements' => SystemAnnouncement::with('creator:id,name')->latest()->get(),
        ]);
    }

    /**
     * Store a new announcement
     */
    public function store(Request $request)
    {
        Gate::authorize('admin-action');

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,danger,success,custom',
            'target_audience' => 'required|in:all,artisans,buyers',
            'is_active' => 'boolean',
        ]);

        $validated['title'] = strip_tags($validated['title']);
        $validated['message'] = strip_tags($validated['message']);

        if ($request->boolean('is_active')) {
            SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
            $validated['starts_at'] = now();
            $validated['broadcast_version'] = 1;
        }

        $validated['created_by'] = Auth::id();
        SystemAnnouncement::create($validated);

        if ($request->boolean('is_active')) {
            $this->clearAnnouncementCache();
        }

        return back()->with('success', 'Announcement created.');
    }

    /**
     * Update an announcement
     */
    public function update(Request $request, int|string $id)
    {
        Gate::authorize('admin-action');

        $announcement = SystemAnnouncement::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,danger,success,custom',
            'target_audience' => 'required|in:all,artisans,buyers',
            'is_active' => 'boolean',
        ]);

        $validated['title'] = strip_tags($validated['title']);
        $validated['message'] = strip_tags($validated['message']);

        if ($request->boolean('is_active') && !$announcement->is_active) {
            SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
            $validated['starts_at'] = now();
            $validated['broadcast_version'] = ($announcement->broadcast_version ?? 0) + 1;
        }

        $announcement->update($validated);
        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement updated.');
    }

    /**
     * Broadcast an announcement
     */
    public function broadcast(int|string $id)
    {
        Gate::authorize('admin-action');

        $announcement = SystemAnnouncement::findOrFail($id);
        
        // EXCLUSIVE BROADCAST: Deactivate all currently active announcements 
        // to prevent overlapping or clashing global states.
        SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
        
        $announcement->update([
            'is_active' => true,
            'broadcast_version' => ($announcement->broadcast_version ?? 0) + 1,
            'starts_at' => now(),
        ]);

        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement broadcasted successfully! All other active announcements have been paused.');
    }

    /**
     * Stop an announcement
     */
    public function stop(int|string $id)
    {
        Gate::authorize('admin-action');

        $announcement = SystemAnnouncement::findOrFail($id);
        $announcement->update(['is_active' => false]);
        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement stopped.');
    }

    /**
     * Destroy an announcement
     */
    public function destroy(int|string $id)
    {
        Gate::authorize('admin-action');

        $announcement = SystemAnnouncement::findOrFail($id);
        $announcement->delete();
        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement deleted.');
    }

    /**
     * Clear announcements cache
     */
    private function clearAnnouncementCache()
    {
        foreach (['guest', 'artisan', 'staff', 'buyer', 'super_admin'] as $role) {
            Cache::forget('global_announcement_' . $role);
        }
    }
}

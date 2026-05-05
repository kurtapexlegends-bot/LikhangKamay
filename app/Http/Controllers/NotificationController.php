<?php

namespace App\Http\Controllers;

use App\Support\NotificationPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        $notifications = $user->notifications()->take(30)->get()->map(
            fn ($notification) => \App\Support\NotificationPresenter::present($notification, $user)
        );
        $unreadCount = $user->unreadNotifications()->count();

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'notifications' => $notifications,
                'unread_count' => $unreadCount,
            ]);
        }

        return \Inertia\Inertia::render('Buyer/Notifications', [
            'notifications' => $notifications,
            'unreadNotificationCount' => $unreadCount,
        ]);
    }

    /**
     * Mark a specific notification as read.
     */
    public function markAsRead(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $notification = $user->notifications()->find($id);
        
        if ($notification) {
            $notification->markAsRead();
        }

        return back();
    }

    /**
     * Mark all notifications as read.
     */
    public function markAllAsRead()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->unreadNotifications->markAsRead();

        return back();
    }

    public function markAsUnread(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $notification = $user->notifications()->find($id);
        
        if ($notification) {
            $notification->markAsUnread();
        }

        return back();
    }

    public function destroy(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $notification = $user->notifications()->find($id);
        
        if ($notification) {
            $notification->delete();
        }

        return back();
    }

    public function destroyAll()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->notifications()->delete();

        return back();
    }
}

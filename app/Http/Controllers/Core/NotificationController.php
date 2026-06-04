<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;

use App\Support\NotificationPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class NotificationController extends Controller
{
    /**
     * Get all notifications for the authenticated user.
     */
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        $notifications = $user->getNotificationsQuery()->latest()->take(30)->get()->map(
            fn ($notification) => NotificationPresenter::present($notification, $user)
        );
        $unreadCount = $user->getUnreadNotificationsQuery()->count();

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'notifications' => $notifications,
                'unread_count' => $unreadCount,
            ]);
        }

        return Inertia::render('Consumer/Buyer/Notifications', [
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
        $notification = $user->getNotificationsQuery()->find($id);
        
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
        $user->getUnreadNotificationsQuery()->update(['read_at' => now()]);

        return back();
    }

    public function markAsUnread(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $notification = $user->getNotificationsQuery()->find($id);
        
        if ($notification) {
            $notification->markAsUnread();
        }

        return back();
    }

    public function destroy(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $notification = $user->getNotificationsQuery()->find($id);
        
        if ($notification) {
            $notification->delete();
        }

        return back();
    }

    public function destroyAll()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->getNotificationsQuery()->delete();

        return back();
    }
}

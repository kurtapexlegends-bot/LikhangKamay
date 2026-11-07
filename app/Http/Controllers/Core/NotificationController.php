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
        
        $offset = max(0, (int) $request->input('offset', 0));
        $limit = min(30, max(1, (int) $request->input('limit', 10)));
        
        $totalCount = $user->getNotificationsQuery()->count();
        $unreadCount = $user->getUnreadNotificationsQuery()->count();

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            $items = $user->getNotificationsQuery()
                ->latest()
                ->skip($offset)
                ->take($limit)
                ->get();

            $notifications = NotificationPresenter::presentCollection($items, $user);
            $hasMore = $totalCount > ($offset + count($notifications));

            return response()->json([
                'notifications' => $notifications,
                'has_more' => $hasMore,
                'total_count' => $totalCount,
                'unread_count' => $unreadCount,
            ]);
        }

        // For direct Inertia visits (e.g. mobile full page or direct URL visit), load top 30 items
        $initialItems = $user->getNotificationsQuery()->latest()->take(30)->get();
        return Inertia::render('Consumer/Buyer/Notifications', [
            'notifications' => NotificationPresenter::presentCollection($initialItems, $user),
            'unreadNotificationCount' => $unreadCount,
        ]);
    }

    /**
     * Mark a specific notification as read for the current user account.
     */
    public function markAsRead(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->markWorkspaceNotificationAsRead($id);

        return back();
    }

    /**
     * Mark all notifications as read for the current user account.
     */
    public function markAllAsRead()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->markAllWorkspaceNotificationsAsRead();

        return back();
    }

    public function markAsUnread(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->markWorkspaceNotificationAsUnread($id);

        return back();
    }

    public function destroy(string $id)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->deleteWorkspaceNotification($id);

        return back();
    }

    public function destroyAll()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        $user->deleteAllWorkspaceNotifications();

        return back();
    }
}

<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.{userId}', function ($user, $userId) {
    if ((int) $user->id === (int) $userId) {
        return true;
    }
    $sellerOwnerId = $user->seller_owner_id ?? $user->seller_id;
    return (bool) ($sellerOwnerId && (int) $sellerOwnerId === (int) $userId);
});

Broadcast::channel('team-chat.{userId}', function ($user, $userId) {
    if ((int) $user->id === (int) $userId) {
        return true;
    }
    $sellerOwnerId = $user->seller_owner_id ?? $user->seller_id;
    return (bool) ($sellerOwnerId && (int) $sellerOwnerId === (int) $userId);
});

Broadcast::channel('team-channel.{channelId}', function ($user, $channelId) {
    return \App\Models\TeamChannelMember::where('team_channel_id', (int) $channelId)
        ->where('user_id', $user->id)
        ->exists();
});


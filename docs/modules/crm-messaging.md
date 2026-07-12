# CRM: Messaging & Templates

This document details the communication topology, internal chat channels, customer support templates, and real-time state mappings for LikhangKamay.

---

## 1. Domain Models

*   **Team Channel**: [TeamChannel.php](file:///c:/laragon/www/LikhangKamay/app/Models/TeamChannel.php)
    *   Represents a grouped workspace chat for employees and artisans under a single seller shop.
    *   Fields: `seller_owner_id`, `name`, `description`, `created_by_user_id`.
*   **Team Channel Member**: [TeamChannelMember.php](file:///c:/laragon/www/LikhangKamay/app/Models/TeamChannelMember.php)
    *   Resolves channel memberships.
    *   Fields: `team_channel_id`, `user_id`.
*   **Team Message**: [TeamMessage.php](file:///c:/laragon/www/LikhangKamay/app/Models/TeamMessage.php)
    *   Represents a single message sent within a channel or as a direct message (DM) between staff.
    *   Fields: `team_channel_id`, `sender_id`, `receiver_id`, `body`, `attachment_path`, `parent_message_id` (enables thread nesting).
*   **Direct Message**: [Message.php](file:///c:/laragon/www/LikhangKamay/app/Models/Message.php)
    *   Represents a customer-to-artisan direct message.
    *   Fields: `sender_id`, `receiver_id`, `message`, `attachment_path`.
*   **Team Message Reaction**: [TeamMessageReaction.php](file:///c:/laragon/www/LikhangKamay/app/Models/TeamMessageReaction.php)
    *   Stores message emoji reactions.
    *   Fields: `team_message_id`, `user_id`, `reaction_type`.
*   **Chat Message Template**: [ChatMessageTemplate.php](file:///c:/laragon/www/LikhangKamay/app/Models/ChatMessageTemplate.php)
    *   Stores quick-replies for customer support interactions.
    *   Fields: `user_id`, `shortcut`, `message`.

---

## 2. Organization Scoping & Access Guard

Security checks are managed in [TeamMessageController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/TeamMessageController.php):

*   **Scope Isolation**:
    > [!IMPORTANT]
    > Internal messaging is strictly hard-scoped to the active seller organization. A user (artisan or staff) can only query contacts and channels belonging to their same `seller_owner_id`. Cross-shop messaging is blocked.
*   **Access Check**:
    The system maps conversations and messages using:
    `eligibleContacts($actor, $sellerOwnerId)` and checking `team_channel_id` memberships.

---

## 3. Real-Time Interaction Flows

*   **Seen/Unread States**:
    Managed by `chat.seen` and `team-messages.seen` routes. A webhook/ajax request clears unread counts by writing `read_at` timestamps on target messages.
*   **Typing Indicators**:
    Websocket pings (`chat.signal-typing` and `team-messages.signal-typing`) trigger typing state events on the frontend client workspace.
*   **Threaded Replies**:
    To support conversations on specific tasks or alerts:
    *   Messages are linked via `parent_message_id`.
    *   The system returns threads in a nested structure handled by `GetTeamMessageThread`.

### Core Business Actions
*   [ResolveCurrentOrderContext.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Chat/ResolveCurrentOrderContext.php): Automatically resolves which active order context applies to the current chat workspace stream.
*   [CreateTeamChannel.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/CreateTeamChannel.php), [GetTeamMessageThread.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/GetTeamMessageThread.php), [StoreTeamMessage.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/StoreTeamMessage.php), [ToggleTeamMessageReaction.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/ToggleTeamMessageReaction.php): Modifies channels, threads, and reaction payloads within team workspaces.

### Messaging Controllers
*   [ChatController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Chat/ChatController.php), [TeamMessageController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/TeamMessageController.php): Manages message routing, scope isolation, and websocket broadcasting endpoints.

### Real-Time WebSocket Events
The real-time interface is driven by dedicated broadcasting events:
*   [MessageSent.php](file:///c:/laragon/www/LikhangKamay/app/Events/MessageSent.php) | [MessageSeen.php](file:///c:/laragon/www/LikhangKamay/app/Events/MessageSeen.php): Broadcasts customer-to-artisan chat message states.
*   [TeamMessageSent.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamMessageSent.php) | [TeamMessageSeen.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamMessageSeen.php): Broadcasts internal workplace messaging states.
*   [TeamUserTyping.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamUserTyping.php) | [UserTyping.php](file:///c:/laragon/www/LikhangKamay/app/Events/UserTyping.php): Triggers temporary typing indicators across channel screens.
*   [TeamMessageReactionUpdated.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamMessageReactionUpdated.php): Dispatches reaction emoji updates in real-time.

### Messaging Domain Services
*   [DirectMessageService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Chat/DirectMessageService.php): Handles customer messaging threads, replies, and templates.
*   [TeamMessageQueryService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Chat/TeamMessageQueryService.php): Handles loading team channel message histories.

### Chat Notifications
*   [NewMessageNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewMessageNotification.php): Dispatches push alerts on receiving a message.
*   [NewTeamChannelMessageNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewTeamChannelMessageNotification.php) | [NewTeamMessageNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewTeamMessageNotification.php): Broadcasts alerts for staff workspace mentions.
*   [TeamMessageMentionedNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/TeamMessageMentionedNotification.php): Triggers an alert when a user is specifically `@mentioned` in chat.

### WebSocket Broadcast Channels
Real-time client listener channels are defined and authorized within [channels.php](file:///c:/laragon/www/LikhangKamay/routes/channels.php):
*   `App.Models.User.{id}`: Restricts database system notifications to the target user.
*   `chat.{userId}`: Enforces private customer-to-artisan chat scopes.
*   `team-chat.{userId}`: Restricts internal DMs to the target staff members.
*   `team-channel.{channelId}`: Limits team channel messages to validated channel members based on `TeamChannelMember` queries.

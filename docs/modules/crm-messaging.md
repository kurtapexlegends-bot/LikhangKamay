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
    *   Stores quick-reply templates for artisan customer support interactions with inline slash-command (`/keyword`) autocomplete triggers.
    *   Fields: `user_id`, `title`, `shortcut`, `content`.
*   **Custom Commission**: [CustomCommission.php](file:///c:/laragon/www/LikhangKamay/app/Models/CustomCommission.php)
    *   Tracks bespoke artisan crafting milestones, downpayments, and final balance fulfillment.
    *   Fields: `artisan_id`, `buyer_id`, `order_id`, `commission_number`, `title`, `description`, `total_amount`, `deposit_amount`, `balance_amount`, `deposit_percentage`, `status`, `deposit_payment_method`, `deposit_payment_id`, `deposit_paid_at`, `balance_payment_method`, `balance_payment_id`, `balance_paid_at`, `paymongo_deposit_session_id`, `paymongo_balance_session_id`, `cancelled_at`, `cancellation_reason`.
    *   Statuses: `awaiting_deposit`, `in_progress`, `ready_for_balance`, `completed`, `cancelled`.

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
    *   [TeamMessages.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Seller/Chat/TeamMessages.jsx) and [ThreadSidebar.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Seller/Chat/ThreadSidebar.jsx) manage frontend slide-over thread rendering with defensive error notices and manual retry controls on network drops.

### Core Business Actions
*   [ResolveCurrentOrderContext.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Chat/ResolveCurrentOrderContext.php): Automatically resolves which active order context applies to the current chat workspace stream.
*   [SendOrderCompletionAutoReply.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/SendOrderCompletionAutoReply.php): Dispatches auto-reply messages upon order completion.
*   [CreateTeamChannel.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/CreateTeamChannel.php), [GetTeamMessageThread.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/GetTeamMessageThread.php), [StoreTeamMessage.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/StoreTeamMessage.php), [ToggleTeamMessageReaction.php](file:///c:/laragon/www/LikhangKamay/app/Actions/Seller/Chat/ToggleTeamMessageReaction.php): Modifies channels, threads, and reaction payloads within team workspaces.

### Messaging Controllers
*   [ChatController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Chat/ChatController.php), [TeamMessageController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Seller/TeamMessageController.php): Manages message routing, scope isolation, and websocket broadcasting endpoints.
*   [CustomCommissionController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Chat/CustomCommissionController.php): Manages custom commission proposals, two-phase PayMongo downpayment and final balance checkout sessions, craft completion notifications, and cancellations.

### Real-Time WebSocket Events
The real-time interface is driven by dedicated broadcasting events:
*   [MessageSent.php](file:///c:/laragon/www/LikhangKamay/app/Events/MessageSent.php) | [MessageSeen.php](file:///c:/laragon/www/LikhangKamay/app/Events/MessageSeen.php): Broadcasts customer-to-artisan chat message states.
*   [TeamMessageSent.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamMessageSent.php) | [TeamMessageSeen.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamMessageSeen.php): Broadcasts internal workplace messaging states.
*   [TeamUserTyping.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamUserTyping.php) | [UserTyping.php](file:///c:/laragon/www/LikhangKamay/app/Events/UserTyping.php): Triggers temporary typing indicators across channel screens.
*   [TeamMessageReactionUpdated.php](file:///c:/laragon/www/LikhangKamay/app/Events/TeamMessageReactionUpdated.php): Dispatches reaction emoji updates in real-time.

### Messaging Domain Services
*   [DirectMessageService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Chat/DirectMessageService.php): Handles customer messaging threads, replies, and templates.
*   [CustomCommissionService.php](file:///c:/laragon/www/LikhangKamay/app/Services/CustomCommissionService.php): Handles bespoke commission milestone state transitions, PayMongo checkout sessions, optimistic concurrency locking with `lockForUpdate()`, and automated fulfillment `Order` generation upon final balance receipt.
*   [TeamMessageQueryService.php](file:///c:/laragon/www/LikhangKamay/app/Services/Chat/TeamMessageQueryService.php): Handles loading team channel message histories.

### Form Requests
*   [StoreCommissionRequest.php](file:///c:/laragon/www/LikhangKamay/app/Http/Requests/Commission/StoreCommissionRequest.php): Validates bespoke custom commission requests, strictly enforcing ₱20 minimum transaction bounds for both downpayment and balance phases.

### Chat Notifications
*   [NewMessageNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewMessageNotification.php): Dispatches push alerts on receiving a message.
*   [NewTeamChannelMessageNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewTeamChannelMessageNotification.php) | [NewTeamMessageNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/NewTeamMessageNotification.php): Broadcasts alerts for staff workspace mentions.
*   [TeamMessageMentionedNotification.php](file:///c:/laragon/www/LikhangKamay/app/Notifications/TeamMessageMentionedNotification.php): Triggers an alert when a user is specifically `@mentioned` in chat.

### Notifications Architecture & Dropdown Navigation
*   **Dual-Layer Facebook-Style Dropdown Pagination**: Managed by [NotificationDropdown.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/NotificationDropdown.jsx) and [HandleInertiaRequests.php](file:///c:/laragon/www/LikhangKamay/app/Http/Middleware/HandleInertiaRequests.php):
    *   Initial popover load renders a compact list capped at 10 items.
    *   When additional notifications exist (`hasMoreNotifications = true`), an in-dropdown `"See previous notifications"` action button dynamically loads previous historical alerts in chunks via `router.reload` or cursor fetching, eliminating unnecessary navigation away from the active screen.
    *   Mobile viewports retain direct full-screen routing to `/notifications` with touch-friendly cards.
    *   Interactive filter pills categorize notifications into `All`, `Unread`, `Orders`, and `Messages` (or role-specific categories like `Attention` for Super Admin).
*   **Cross-Portal Buyer Navigation**: In [BuyerUserMenu.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Buyer/BuyerUserMenu.jsx), buyers can directly navigate to their profile modal (`[Profile]` with User icon) or reviews management desk (`[My Reviews]` with Star icon) alongside a dynamic email verification security indicator pill (`Security: Verified` in emerald or `Unverified` in amber).

### Help Center, FAQ Hub & Support Contact Escalation (`/help`)
*   **Persona Isolation**: Served by [HelpCenterController.php](file:///c:/laragon/www/LikhangKamay/app/Http/Controllers/Core/HelpCenterController.php) at `/help` (`help.index`). Strictly scopes visible content by user role (`allowedPersona = 'buyer' | 'artisan' | 'all'`):
    *   **Buyers** receive Buyer Guide FAQs (Cavite delivery, fragile warranty, return window, biometrics, BIR VAT invoices) and direct purchase escalation shortcuts (`Message Artisan`, `Track Orders & Deliveries`). The cross-persona tab switcher is hidden to keep the experience focused.
    *   **Artisans** receive Studio Help Center FAQs (workshop verification, POS sales & voids, payouts & BIR 2307, wholesale supply) and studio fulfillment shortcuts (`Studio Orders & Fulfillment` routing to `orders.index`, `Workshop Settings`).
    *   **Super Admins** receive full dual-persona access (`allowedPersona = 'all'`) with live tab switching.
    *   **Guests** default to Buyer Guide with the option to view Artisan Guide via `?tab=artisan`.
*   **Domain Directory**: Categorized FAQs and metadata are centralized in [HelpCenterDirectory.php](file:///c:/laragon/www/LikhangKamay/app/Support/HelpCenterDirectory.php).
*   **Frontend UI & Accordion Controls**: Managed by [HelpCenter.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Pages/Consumer/Help/HelpCenter.jsx) with mobile horizontal category pill scroller and single-click "Expand All / Collapse All" toggle.
*   **Gmail Web Support Escalation**: [SupportContactModal.jsx](file:///c:/laragon/www/LikhangKamay/resources/js/Components/Consumer/Help/SupportContactModal.jsx) replaces raw `mailto:` links with direct Gmail Web compose URLs (`https://mail.google.com/mail/?view=cm&fs=1&to=likhangkamay.co@gmail.com...`) and a one-click clipboard copy action, eliminating intrusive OS desktop mail client popups (e.g. Outlook on Windows).

### WebSocket Broadcast Channels
Real-time client listener channels are defined and authorized within [channels.php](file:///c:/laragon/www/LikhangKamay/routes/channels.php):
*   `App.Models.User.{id}`: Restricts database system notifications to the target user.
*   `chat.{userId}`: Enforces private customer-to-artisan chat scopes.
*   `team-chat.{userId}`: Restricts internal DMs to the target staff members.
*   `team-channel.{channelId}`: Limits team channel messages to validated channel members based on `TeamChannelMember` queries.

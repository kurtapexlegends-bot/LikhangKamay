<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\EmailTemplate;
use App\Models\User;
use App\Models\PlatformActivity;
use App\Mail\CustomDynamicMail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class EmailStudioController extends Controller
{
    /**
     * Get all email templates and user suggestions.
     */
    public function index(Request $request): JsonResponse
    {
        Gate::authorize('admin-action');

        $templates = EmailTemplate::orderBy('category', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        $search = $request->query('query');
        $users = [];
        if ($search) {
            $users = User::query()
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
                ->orWhere('shop_name', 'like', "%{$search}%")
                ->limit(10)
                ->get(['id', 'name', 'email', 'shop_name', 'role', 'avatar']);
        }

        return response()->json([
            'templates' => $templates,
            'users' => $users,
        ]);
    }

    /**
     * Create or update a custom email template.
     */
    public function store(Request $request)
    {
        Gate::authorize('admin-action');

        $validated = $request->validate([
            'id' => ['nullable', 'integer', 'exists:email_templates,id'],
            'name' => ['required', 'string', 'max:255'],
            'subject' => ['required', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'button_label' => ['nullable', 'string', 'max:100'],
            'button_url' => ['nullable', 'string', 'max:500'],
            'category' => ['required', 'string', 'in:system,custom'],
        ]);

        $slug = isset($validated['id']) 
            ? EmailTemplate::where('id', $validated['id'])->value('slug')
            : Str::slug($validated['name']) . '-' . Str::random(4);

        $template = EmailTemplate::updateOrCreate(
            ['id' => $validated['id'] ?? null],
            [
                'slug' => $slug,
                'name' => $validated['name'],
                'subject' => $validated['subject'],
                'headline' => $validated['headline'] ?? null,
                'body' => $validated['body'],
                'button_label' => $validated['button_label'] ?? null,
                'button_url' => $validated['button_url'] ?? null,
                'category' => $validated['category'],
                'created_by_user_id' => Auth::id(),
            ]
        );

        PlatformActivity::log(
            'EMAIL_TEMPLATE_SAVED',
            "Saved email template: {$template->name} ({$template->slug})"
        );

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => "Email template \"{$template->name}\" saved successfully.",
                'template' => $template,
            ]);
        }

        return back()->with('success', "Email template \"{$template->name}\" saved successfully.");
    }

    /**
     * Delete a custom email template.
     */
    public function destroy(Request $request, EmailTemplate $template)
    {
        Gate::authorize('admin-action');

        if ($template->category === 'system') {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Default system templates cannot be deleted.',
                ], 422);
            }
            return back()->with('error', 'Default system templates cannot be deleted.');
        }

        $name = $template->name;
        $template->delete();

        PlatformActivity::log(
            'EMAIL_TEMPLATE_DELETED',
            "Deleted custom email template: {$name}"
        );

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => "Template \"{$name}\" deleted successfully.",
            ]);
        }

        return back()->with('success', "Template \"{$name}\" deleted successfully.");
    }

    /**
     * Dispatch an email template or custom message to target audience.
     */
    public function dispatch(Request $request): JsonResponse
    {
        Gate::authorize('admin-action');

        $validated = $request->validate([
            'target_type' => ['required', 'string', 'in:user,role,email'],
            'target_user_id' => ['nullable', 'integer', 'exists:users,id'],
            'target_role' => ['nullable', 'string', 'in:all_artisans,approved_artisans,all_buyers,elite_sellers,premium_sellers'],
            'target_email' => ['nullable', 'email'],
            'subject' => ['required', 'string', 'max:255'],
            'headline' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'button_label' => ['nullable', 'string', 'max:100'],
            'button_url' => ['nullable', 'string', 'max:500'],
            'is_test' => ['nullable', 'boolean'],
        ]);

        $recipients = [];
        $recipientLabel = '';

        if ($validated['target_type'] === 'user') {
            $user = User::findOrFail($validated['target_user_id']);
            $recipients[] = [
                'email' => $user->email,
                'name' => $user->name,
                'shop_name' => $user->shop_name ?? 'N/A',
            ];
            $recipientLabel = "User {$user->name} ({$user->email})";
        } elseif ($validated['target_type'] === 'email') {
            $recipients[] = [
                'email' => $validated['target_email'],
                'name' => 'Recipient',
                'shop_name' => 'N/A',
            ];
            $recipientLabel = $validated['target_email'];
        } elseif ($validated['target_type'] === 'role') {
            $query = User::query();
            switch ($validated['target_role']) {
                case 'all_artisans':
                    $query->where('role', 'artisan');
                    $recipientLabel = 'All Artisans';
                    break;
                case 'approved_artisans':
                    $query->where('role', 'artisan')->where('artisan_status', 'approved');
                    $recipientLabel = 'All Approved Artisans';
                    break;
                case 'all_buyers':
                    $query->where('role', 'buyer');
                    $recipientLabel = 'All Buyers';
                    break;
                case 'elite_sellers':
                    $query->where('role', 'artisan')->where('premium_tier', 'super_premium');
                    $recipientLabel = 'Elite Sellers';
                    break;
                case 'premium_sellers':
                    $query->where('role', 'artisan')->where('premium_tier', 'premium');
                    $recipientLabel = 'Premium Sellers';
                    break;
            }
            $recipients = $query->limit(200)->get(['email', 'name', 'shop_name'])->map(fn($u) => [
                'email' => $u->email,
                'name' => $u->name,
                'shop_name' => $u->shop_name ?? 'N/A',
            ])->toArray();
        }

        if (empty($recipients)) {
            return response()->json([
                'success' => false,
                'message' => 'No valid target recipients found for the selected criteria.',
            ], 422);
        }

        $startTime = microtime(true);
        $dispatchedCount = 0;

        try {
            foreach ($recipients as $recipient) {
                $replacements = [
                    '{user_name}' => $recipient['name'],
                    '{shop_name}' => $recipient['shop_name'],
                    '{site_name}' => 'LikhangKamay',
                    '{action_url}' => $validated['button_url'] ?? url('/'),
                ];

                Mail::to($recipient['email'])->send(new CustomDynamicMail(
                    subjectText: $validated['subject'],
                    headlineText: $validated['headline'] ?? null,
                    bodyText: $validated['body'],
                    buttonLabel: $validated['button_label'] ?? null,
                    buttonUrl: $validated['button_url'] ?? null,
                    replacements: $replacements
                ));

                $dispatchedCount++;
            }

            $latency = round((microtime(true) - $startTime) * 1000);
            $activeDriver = config('mail.default', 'smtp');

            PlatformActivity::log(
                'EMAIL_DISPATCH',
                "Dispatched template email \"{$validated['subject']}\" to {$dispatchedCount} recipient(s) ({$recipientLabel})"
            );

            return response()->json([
                'success' => true,
                'message' => "Successfully dispatched email to {$dispatchedCount} recipient(s) [Target: {$recipientLabel}].",
                'dispatched_count' => $dispatchedCount,
                'latency_ms' => $latency,
                'driver' => $activeDriver,
                'timestamp' => now()->format('Y-m-d H:i:s'),
            ]);
        } catch (\Throwable $e) {
            Log::error("Email Studio dispatch failed: " . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Email dispatch failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}

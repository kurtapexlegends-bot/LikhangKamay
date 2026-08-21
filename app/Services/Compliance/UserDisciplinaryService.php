<?php

namespace App\Services\Compliance;

use App\Models\PlatformActivity;
use App\Models\User;
use App\Models\UserDisciplinaryLog;
use App\Notifications\UserDisciplinaryNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UserDisciplinaryService
{
    /**
     * Issue a formal warning to a user (Strike 1).
     */
    public function issueWarning(User $admin, User $target, string $reason): UserDisciplinaryLog
    {
        return DB::transaction(function () use ($admin, $target, $reason) {
            $newWarningCount = ($target->warning_count ?? 0) + 1;

            $target->update([
                'warning_count' => $newWarningCount,
                'warning_reason' => $reason,
                'warned_at' => now(),
            ]);

            $log = UserDisciplinaryLog::create([
                'user_id' => $target->id,
                'admin_id' => $admin->id,
                'action_type' => 'warning',
                'reason' => $reason,
                'duration_days' => null,
                'suspended_until' => null,
                'created_at' => now(),
            ]);

            PlatformActivity::log(
                'USER_DISCIPLINARY_WARNING',
                "Issued formal warning (#{$newWarningCount}) to {$target->name} ({$target->email}): {$reason}",
                ['target_user_id' => $target->id, 'email' => $target->email]
            );

            $this->notifyUser($target, 'warning', $reason);

            return $log;
        });
    }

    /**
     * Apply a temporary suspension to a user for X days (Strike 2).
     */
    public function applySuspension(User $admin, User $target, int $days, string $reason): UserDisciplinaryLog
    {
        return DB::transaction(function () use ($admin, $target, $days, $reason) {
            $suspendedUntil = now()->addDays(max(1, $days));

            $target->update([
                'suspended_until' => $suspendedUntil,
                'suspension_reason' => $reason,
                'suspended_at' => now(),
            ]);

            $log = UserDisciplinaryLog::create([
                'user_id' => $target->id,
                'admin_id' => $admin->id,
                'action_type' => 'suspension',
                'reason' => $reason,
                'duration_days' => $days,
                'suspended_until' => $suspendedUntil,
                'created_at' => now(),
            ]);

            PlatformActivity::log(
                'USER_DISCIPLINARY_SUSPENSION',
                "Suspended {$target->name} ({$target->email}) for {$days} day(s) until {$suspendedUntil->format('M d, Y')}: {$reason}",
                ['target_user_id' => $target->id, 'email' => $target->email, 'duration_days' => $days]
            );

            $this->notifyUser($target, 'suspension', $reason, $days, $suspendedUntil);

            return $log;
        });
    }

    /**
     * Apply a permanent ban to a user (Strike 3 / Zero-Tolerance).
     */
    public function applyBan(User $admin, User $target, string $reason): UserDisciplinaryLog
    {
        return DB::transaction(function () use ($admin, $target, $reason) {
            $target->update([
                'banned_at' => now(),
                'ban_reason' => $reason,
                'current_session_id' => null,
            ]);

            $log = UserDisciplinaryLog::create([
                'user_id' => $target->id,
                'admin_id' => $admin->id,
                'action_type' => 'ban',
                'reason' => $reason,
                'duration_days' => null,
                'suspended_until' => null,
                'created_at' => now(),
            ]);

            PlatformActivity::log(
                'USER_DISCIPLINARY_BAN',
                "Permanently banned {$target->name} ({$target->email}): {$reason}",
                ['target_user_id' => $target->id, 'email' => $target->email]
            );

            $this->notifyUser($target, 'ban', $reason);

            return $log;
        });
    }

    /**
     * Lift an active temporary suspension.
     */
    public function liftSuspension(User $admin, User $target, ?string $note = null): UserDisciplinaryLog
    {
        return DB::transaction(function () use ($admin, $target, $note) {
            $target->update([
                'suspended_until' => null,
                'suspension_reason' => null,
                'suspended_at' => null,
            ]);

            $reasonText = $note ?: 'Suspension lifted by administrator.';

            $log = UserDisciplinaryLog::create([
                'user_id' => $target->id,
                'admin_id' => $admin->id,
                'action_type' => 'lift_suspension',
                'reason' => $reasonText,
                'duration_days' => null,
                'suspended_until' => null,
                'created_at' => now(),
            ]);

            PlatformActivity::log(
                'USER_DISCIPLINARY_LIFT_SUSPENSION',
                "Lifted suspension for {$target->name} ({$target->email})",
                ['target_user_id' => $target->id, 'email' => $target->email]
            );

            $this->notifyUser($target, 'lift_suspension', $reasonText);

            return $log;
        });
    }

    /**
     * Unban a permanently banned account.
     */
    public function liftBan(User $admin, User $target, ?string $note = null): UserDisciplinaryLog
    {
        return DB::transaction(function () use ($admin, $target, $note) {
            $target->update([
                'banned_at' => null,
                'ban_reason' => null,
            ]);

            $reasonText = $note ?: 'Ban lifted by administrator.';

            $log = UserDisciplinaryLog::create([
                'user_id' => $target->id,
                'admin_id' => $admin->id,
                'action_type' => 'unban',
                'reason' => $reasonText,
                'duration_days' => null,
                'suspended_until' => null,
                'created_at' => now(),
            ]);

            PlatformActivity::log(
                'USER_DISCIPLINARY_UNBAN',
                "Unbanned account for {$target->name} ({$target->email})",
                ['target_user_id' => $target->id, 'email' => $target->email]
            );

            $this->notifyUser($target, 'unban', $reasonText);

            return $log;
        });
    }

    /**
     * Send email / in-app notification securely.
     */
    protected function notifyUser(User $target, string $actionType, string $reason, ?int $days = null, ?\DateTimeInterface $until = null): void
    {
        try {
            $target->notify(new UserDisciplinaryNotification($actionType, $reason, $days, $until));
        } catch (\Throwable $e) {
            Log::error("Failed to send disciplinary notification to user #{$target->id}: " . $e->getMessage());
        }
    }
}

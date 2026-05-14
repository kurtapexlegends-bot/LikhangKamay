<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Models\Product;
use App\Models\Order;
use App\Models\ReviewDispute;
use App\Models\SponsorshipRequest;
use App\Models\ArtisanStatusLog;
use App\Models\UserTierLog;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Collection;

class AdminMetricsService
{
    /**
     * Helper to calculate count and percentage growth
     */
    public function getMetric(string $model, array $conditions = [], string $dateColumn = 'created_at'): array
    {
        $query = $model::query();

        foreach ($conditions as $field => $value) {
            if ($value === null) {
                $query->whereNull($field);
            } else {
                $query->where($field, $value);
            }
        }

        $currentCount = $query->count();

        // Calculate total count as of 30 days ago
        $previousQuery = $model::query();
        foreach ($conditions as $field => $value) {
            if ($value === null) {
                $previousQuery->whereNull($field);
            } else {
                $previousQuery->where($field, $value);
            }
        }
        $previousCount = $previousQuery->where($dateColumn, '<=', now()->subDays(30))->count();

        $growth = 0;
        if ($previousCount > 0) {
            $growth = (($currentCount - $previousCount) / $previousCount) * 100;
        } elseif ($currentCount > 0) {
            $growth = 100;
        }

        return [
            'value' => $currentCount,
            'growth' => round($growth, 1),
            'trend' => $growth > 0 ? 'up' : ($growth < 0 ? 'down' : 'neutral')
        ];
    }

    public function getHistoricalStatusCount(string $status, int $daysAgo = 30): int
    {
        $targetDate = now()->subDays($daysAgo);

        // 1. Current count
        $currentCount = User::where('role', 'artisan')->where('artisan_status', $status)->count();

        // 2. Calculate net change since target date using aggregates
        $arrivals = ArtisanStatusLog::where('created_at', '>', $targetDate)
            ->where('new_status', $status)
            ->count();
            
        $departures = ArtisanStatusLog::where('created_at', '>', $targetDate)
            ->where('previous_status', $status)
            ->count();

        return max(0, $currentCount - ($arrivals - $departures));
    }

    public function getHistoricalTierCount(string $tier, int $daysAgo = 30): int
    {
        $targetDate = now()->subDays($daysAgo);

        $currentCount = User::where('role', 'artisan')->where('premium_tier', $tier)->count();
        
        $arrivals = UserTierLog::where('created_at', '>', $targetDate)
            ->where('new_tier', $tier)
            ->count();
            
        $departures = UserTierLog::where('created_at', '>', $targetDate)
            ->where('previous_tier', $tier)
            ->count();

        return max(0, $currentCount - ($arrivals - $departures));
    }

    public function getHistoricalTierSnapshot(\Carbon\CarbonInterface|string $targetDate): array
    {
        $date = is_string($targetDate) ? \Carbon\Carbon::parse($targetDate) : $targetDate;
        
        // Base counts (approximate using logs)
        $standard = User::where('role', 'artisan')->where('premium_tier', 'standard')->count();
        $premium = User::where('role', 'artisan')->where('premium_tier', 'premium')->count();
        $elite = User::where('role', 'artisan')->where('premium_tier', 'super_premium')->count();

        $changesSince = UserTierLog::where('created_at', '>', $date)->get();

        foreach ($changesSince as $log) {
            // Revert new tier
            if ($log->new_tier === 'standard') $standard--;
            if ($log->new_tier === 'premium') $premium--;
            if ($log->new_tier === 'super_premium') $elite--;

            // Restore old tier
            if ($log->previous_tier === 'standard') $standard++;
            if ($log->previous_tier === 'premium') $premium++;
            if ($log->previous_tier === 'super_premium') $elite++;
        }

        return [
            'date' => $date->format('Y-m-d'),
            'standard' => max(0, $standard),
            'premium' => max(0, $premium),
            'elite' => max(0, $elite),
        ];
    }

    public function getHistoricalTierSnapshots(array $targetDates): array
    {
        $maxDate = collect($targetDates)->max();
        $cacheKey = 'historical_tier_snapshots_' . $maxDate->format('Y-m-d_H');

        return Cache::remember($cacheKey, 3600, function () use ($targetDates, $maxDate) {
            $snapshots = [];
            
            // Fetch all logs that could possibly affect the tiers for the given dates
            $allLogs = UserTierLog::query()
                ->whereIn('user_id', User::where('role', 'artisan')->pluck('id'))
                ->where('created_at', '<=', $maxDate)
                ->orderBy('user_id')
                ->orderByDesc('created_at')
                ->get()
                ->groupBy('user_id');

            foreach ($targetDates as $date) {
                $premiumCount = 0;
                $eliteCount = 0;

                foreach ($allLogs as $userId => $logs) {
                    // Find the latest log before or on the target date
                    /** @var \App\Models\UserTierLog|null $latestLog */
                    $latestLog = $logs->first(fn(UserTierLog $log) => $log->created_at <= $date);
                    
                    if ($latestLog) {
                        if ($latestLog->new_tier === 'premium') {
                            $premiumCount++;
                        } elseif ($latestLog->new_tier === 'super_premium') {
                            $eliteCount++;
                        }
                    }
                }

                $snapshots[$date->format('M Y')] = [
                    'premium' => $premiumCount,
                    'super_premium' => $eliteCount,
                ];
            }

            return $snapshots;
        });
    }
}

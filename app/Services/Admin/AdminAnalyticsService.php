<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Models\ReviewDispute;
use App\Models\SponsorshipRequest;
use Illuminate\Support\Facades\Cache;

class AdminAnalyticsService
{
    public function getSLAMetrics(): array
    {
        return Cache::remember('admin_sla_metrics', 1800, function () {
            // 1. Artisan Approval SLA (Goal: 24h)
            $avgApprovalTime = User::where('role', 'artisan')
                ->whereNotNull('approved_at')
                ->whereNotNull('setup_completed_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, setup_completed_at, approved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            // 2. Dispute Resolution SLA (Goal: 48h)
            $avgDisputeTime = ReviewDispute::where('status', 'resolved')
                ->whereNotNull('resolved_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            // 3. Sponsorship SLA (Goal: 24h)
            $avgSponsorshipTime = SponsorshipRequest::where('status', 'approved')
                ->whereNotNull('approved_at')
                ->whereNotNull('requested_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, approved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            return [
                'avgArtisanApprovalHours' => round($avgApprovalTime, 1),
                'avgDisputeResolutionHours' => round($avgDisputeTime, 1),
                'avgSponsorshipApprovalHours' => round($avgSponsorshipTime, 1),
                'artisanSLACompliance' => $avgApprovalTime <= 24 ? 100 : max(0, round(100 - (($avgApprovalTime - 24) * 2), 1)),
                'disputeSLACompliance' => $avgDisputeTime <= 48 ? 100 : max(0, round(100 - (($avgDisputeTime - 48) * 1.5), 1)),
            ];
        });
    }

    public function getInsightsData(): array
    {
        // This would involve the complex trend analysis and platform health checks
        // For now, we'll encapsulate the existing logic structure
        return [];
    }
}

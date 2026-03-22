<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\SponsorshipAnalyticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SponsorshipAnalyticsServiceCompatibilityTest extends TestCase
{
    use RefreshDatabase;

    public function test_seller_analytics_reports_unavailable_when_sponsorship_tracking_schema_is_missing(): void
    {
        Schema::partialMock()
            ->shouldReceive('hasTable')
            ->andReturnUsing(function (string $table) {
                if ($table === 'sponsorship_events') {
                    return false;
                }

                return true;
            });

        Schema::partialMock()
            ->shouldReceive('hasColumn')
            ->andReturnUsing(function (string $table, string $column) {
                if ($table === 'order_items' && $column === 'was_sponsored') {
                    return false;
                }

                return true;
            });

        $seller = User::factory()->artisanApproved()->create();
        $analytics = app(SponsorshipAnalyticsService::class)->getSellerAnalytics($seller->id);

        $this->assertFalse($analytics['availability']['is_available']);
        $this->assertSame('unavailable', $analytics['availability']['state']);
        $this->assertFalse($analytics['availability']['has_activity']);
        $this->assertFalse($analytics['availability']['has_events_table']);
        $this->assertFalse($analytics['availability']['has_order_snapshots']);
        $this->assertSame('Tracking data is unavailable until the sponsorship analytics tables are installed.', $analytics['availability']['message']);
        $this->assertNull($analytics['summary']);
        $this->assertSame([], $analytics['chartData']['daily']);
        $this->assertSame([], $analytics['chartData']['monthly']);
    }
}

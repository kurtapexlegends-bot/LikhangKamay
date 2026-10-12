<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Jobs\BookLalamoveDeliveryJob;
use App\Jobs\SyncOrderDeliveryJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use PHPUnit\Framework\TestCase;

class QueuedJobsResilienceTest extends TestCase
{
    public function test_book_lalamove_delivery_job_declares_strict_retry_and_timeout_boundaries(): void
    {
        $reflection = new \ReflectionClass(BookLalamoveDeliveryJob::class);

        $this->assertTrue(
            $reflection->implementsInterface(ShouldQueue::class),
            'BookLalamoveDeliveryJob must implement ShouldQueue.'
        );

        $defaultProps = $reflection->getDefaultProperties();

        $this->assertArrayHasKey('tries', $defaultProps);
        $this->assertSame(3, $defaultProps['tries']);

        $this->assertArrayHasKey('timeout', $defaultProps);
        $this->assertSame(60, $defaultProps['timeout']);

        $this->assertArrayHasKey('backoff', $defaultProps);
        $this->assertSame(10, $defaultProps['backoff']);
    }

    public function test_sync_order_delivery_job_declares_strict_retry_and_timeout_boundaries(): void
    {
        $reflection = new \ReflectionClass(SyncOrderDeliveryJob::class);

        $this->assertTrue(
            $reflection->implementsInterface(ShouldQueue::class),
            'SyncOrderDeliveryJob must implement ShouldQueue.'
        );

        $defaultProps = $reflection->getDefaultProperties();

        $this->assertArrayHasKey('tries', $defaultProps);
        $this->assertSame(3, $defaultProps['tries']);

        $this->assertArrayHasKey('timeout', $defaultProps);
        $this->assertSame(60, $defaultProps['timeout']);

        $this->assertArrayHasKey('backoff', $defaultProps);
        $this->assertSame(10, $defaultProps['backoff']);
    }
}

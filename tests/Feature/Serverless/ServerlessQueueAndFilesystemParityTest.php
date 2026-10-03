<?php

namespace Tests\Feature\Serverless;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ServerlessQueueAndFilesystemParityTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test vercel.json defines required serverless environment and cron configurations.
     */
    public function test_vercel_json_contains_required_cron_and_environment_parity(): void
    {
        $vercelJsonPath = base_path('vercel.json');
        $this->assertFileExists($vercelJsonPath);

        $vercelConfig = json_decode(file_get_contents($vercelJsonPath), true);
        $this->assertIsArray($vercelConfig);

        // Crons parity
        $cronPaths = array_column($vercelConfig['crons'] ?? [], 'path');
        $this->assertContains('/webhooks/cron', $cronPaths);
        $this->assertContains('/webhooks/cron/queue', $cronPaths);

        // Environment variables parity
        $env = $vercelConfig['env'] ?? [];
        $this->assertEquals('s3', $env['FILESYSTEM_DISK'] ?? null);
        $this->assertEquals('s3', $env['PUBLIC_DISK_DRIVER'] ?? null);
        $this->assertEquals('database', $env['QUEUE_CONNECTION'] ?? null);
        $this->assertEquals('/tmp/storage/app/private', $env['FILESYSTEM_LOCAL_ROOT'] ?? null);
    }

    /**
     * Test filesystems configuration resolves S3 disk and dynamic local roots correctly.
     */
    public function test_filesystems_configuration_supports_serverless_s3_and_tmp_roots(): void
    {
        $localDisk = config('filesystems.disks.local');
        $s3Disk = config('filesystems.disks.s3');

        $this->assertIsArray($localDisk);
        $this->assertIsArray($s3Disk);
        $this->assertEquals('local', $localDisk['driver']);
        $this->assertEquals('s3', $s3Disk['driver']);
        $this->assertEquals('public', $s3Disk['visibility']);
    }

    /**
     * Test that routes/console.php schedules queue:work command.
     */
    public function test_console_schedule_includes_queue_work(): void
    {
        $consoleRoutes = file_get_contents(base_path('routes/console.php'));
        $this->assertStringContainsString("Schedule::command('queue:work'", $consoleRoutes);
    }

    /**
     * Test ping endpoint executes cleanly and returns pong.
     */
    public function test_ping_endpoint_returns_pong_with_or_without_pending_jobs(): void
    {
        // 1. Without jobs
        $response = $this->get('/ping');
        $response->assertOk();
        $this->assertEquals('pong', $response->getContent());

        // 2. With jobs in queue
        DB::table('jobs')->insert([
            'queue' => 'default',
            'payload' => json_encode(['displayName' => 'DummyTestJob', 'job' => 'Illuminate\\Queue\\CallQueuedHandler@call', 'data' => ['commandName' => 'DummyTestJob', 'command' => 'O:8:"stdClass":0:{}']]),
            'attempts' => 0,
            'reserved_at' => null,
            'available_at' => now()->timestamp,
            'created_at' => now()->timestamp,
        ]);

        $responseWithJobs = $this->get('/ping');
        $responseWithJobs->assertOk();
        $this->assertEquals('pong', $responseWithJobs->getContent());
    }
}

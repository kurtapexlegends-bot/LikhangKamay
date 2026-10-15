<?php

namespace Tests\Feature\Security;

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;
use Tests\TestCase;

class SecurityHeadersCspTest extends TestCase
{
    public function test_production_environment_sets_permissive_worker_and_blob_csp_headers(): void
    {
        App::detectEnvironment(fn () => 'production');

        $middleware = new SecurityHeaders();
        $request = Request::create('/', 'GET');

        $response = $middleware->handle($request, function () {
            return new Response('OK');
        });

        $this->assertTrue($response->headers->has('Content-Security-Policy'));
        $csp = $response->headers->get('Content-Security-Policy');

        // Verify worker-src allows self and blob: for Three.js / Draco / KTX2 / Face-API workers
        $this->assertStringContainsString("worker-src 'self' blob:;", $csp);
        
        // Verify child-src fallback for older browsers
        $this->assertStringContainsString("child-src 'self' blob:;", $csp);

        // Verify script-src permits blob: and decoders
        $this->assertStringContainsString("blob:", $csp);
        $this->assertStringContainsString("https://*.gstatic.com", $csp);
        $this->assertStringContainsString("https://cdn.jsdelivr.net", $csp);

        // Verify connect-src includes WebSockets and local decoders
        $this->assertStringContainsString("connect-src 'self' blob: data:", $csp);
    }
}

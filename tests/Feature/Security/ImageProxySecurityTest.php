<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

class ImageProxySecurityTest extends TestCase
{
    public function test_rejects_missing_src_parameter(): void
    {
        $response = $this->get('/img/proxy');
        $response->assertStatus(400);
    }

    public function test_rejects_external_url_schemes(): void
    {
        $response = $this->get('/img/proxy?src=https://evil.com/phish.jpg');
        $response->assertStatus(400);

        $responseProto = $this->get('/img/proxy?src=//evil.com/phish.jpg');
        $responseProto->assertStatus(400);

        $responseHttp = $this->get('/img/proxy?src=http://evil.com/phish.jpg');
        $responseHttp->assertStatus(400);
    }

    public function test_rejects_path_traversal_attempts(): void
    {
        $response = $this->get('/img/proxy?src=../../.env');
        $response->assertStatus(400);

        $responseNested = $this->get('/img/proxy?src=avatars/../../storage/app/secret.txt');
        $responseNested->assertStatus(400);
    }

    public function test_non_existent_image_returns_404_not_redirect(): void
    {
        $response = $this->get('/img/proxy?src=non_existent_image_12345.jpg');
        $response->assertStatus(404);
    }
}

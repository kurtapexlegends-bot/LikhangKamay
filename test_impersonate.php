<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$admin = \App\Models\User::where('role', 'super_admin')->first();
auth()->login($admin);

$request = Illuminate\Http\Request::create('/admin/users/4/impersonate', 'POST');
$request->setSession(app('session')->driver());
$request->session()->start();
$request->session()->put('_token', 'test_token');
$request->headers->set('X-CSRF-TOKEN', 'test_token');
$request->headers->set('X-Inertia', 'true');

$app->instance('middleware.disable', true);

$response = $app->handle($request);

echo "Status Code: " . $response->getStatusCode() . "\n";
echo "Location: " . $response->headers->get('Location') . "\n";
if ($response->getStatusCode() >= 400) {
    echo "Error Content: \n" . substr(strip_tags($response->getContent()), 0, 1000) . "\n";
}

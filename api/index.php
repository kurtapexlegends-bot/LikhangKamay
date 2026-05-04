<?php

/**
 * Vercel Bridge for Laravel
 * This file forwards requests to the Laravel public/index.php
 */

// Ensure the request URI is correctly set for Laravel routing
$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH)
);

// This allows us to emulate Apache's "mod_rewrite" functionality from the
// built-in PHP web server. This provides a convenient way to test a Laravel
// application without having installed a "real" web server software here.
if ($uri !== '/' && file_exists(__DIR__ . '/../public' . $uri)) {
    return false;
}

require __DIR__ . '/../public/index.php';


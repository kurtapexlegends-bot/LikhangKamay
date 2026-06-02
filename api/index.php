<?php

/**
 * Vercel Bridge for Laravel
 */

// Normalise the path for Laravel
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/../public/index.php';

// Fix URI for routing
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Handle static files if they somehow slip through
if ($uri !== '/' && file_exists(__DIR__ . '/../public' . $uri)) {
    return false;
}

// Early boot diagnostic wrapper
try {
    require __DIR__ . '/../vendor/autoload.php';
    $app = require_once __DIR__ . '/../bootstrap/app.php';
    
    // Manually execute the Laravel bootstrapping sequence to intercept early failures
    $app->bootstrapWith([
        \Illuminate\Foundation\Bootstrap\LoadEnvironmentVariables::class,
        \Illuminate\Foundation\Bootstrap\LoadConfiguration::class,
        \Illuminate\Foundation\Bootstrap\HandleExceptions::class,
        \Illuminate\Foundation\Bootstrap\RegisterFacades::class,
        \Illuminate\Foundation\Bootstrap\RegisterProviders::class,
        \Illuminate\Foundation\Bootstrap\BootProviders::class,
    ]);
    
    // If bootstrapping succeeds, proceed to standard public/index.php
    require __DIR__ . '/../public/index.php';
} catch (\Throwable $e) {
    header("HTTP/1.1 500 Internal Server Error");
    header("Content-Type: text/plain; charset=UTF-8");
    echo "LikhangKamay Early Boot Exception Caught!\n\n";
    echo "Message: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    if ($e->getPrevious()) {
        echo "Previous: " . $e->getPrevious()->getMessage() . " in " . $e->getPrevious()->getFile() . ":" . $e->getPrevious()->getLine() . "\n";
    }
    echo "\nTrace:\n" . $e->getTraceAsString() . "\n";
    exit(1);
}

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

try {
    require __DIR__ . '/../public/index.php';
} catch (\Throwable $e) {
    error_log("ENTRY_POINT_CRASH: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    if ($e->getPrevious()) {
        error_log("ENTRY_POINT_PREVIOUS: " . $e->getPrevious()->getMessage() . " in " . $e->getPrevious()->getFile() . ":" . $e->getPrevious()->getLine());
    }
    throw $e;
}

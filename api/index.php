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
    $msg = "ENTRY_POINT_CRASH: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine();
    error_log($msg);
    if ($e->getPrevious()) {
        $prevMsg = "ENTRY_POINT_PREVIOUS: " . $e->getPrevious()->getMessage() . " in " . $e->getPrevious()->getFile() . ":" . $e->getPrevious()->getLine();
        error_log($prevMsg);
    }
    
    header("HTTP/1.1 500 Internal Server Error");
    header("Content-Type: text/html; charset=UTF-8");
    echo "<h1>LikhangKamay Deployment Diagnostics</h1>";
    echo "<p><strong>Message:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
    echo "<p><strong>File:</strong> " . htmlspecialchars($e->getFile()) . ":" . $e->getLine() . "</p>";
    if ($e->getPrevious()) {
        echo "<p><strong>Previous Exception:</strong> " . htmlspecialchars($e->getPrevious()->getMessage()) . " in " . htmlspecialchars($e->getPrevious()->getFile()) . ":" . $e->getPrevious()->getLine() . "</p>";
    }
    exit(1);
}

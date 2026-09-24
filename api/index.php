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

// Ensure writable storage directories exist in /tmp before booting on serverless
foreach (['views', 'cache/data', 'sessions'] as $sub) {
    $dir = '/tmp/storage/framework/' . $sub;
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

try {
    require __DIR__ . '/../public/index.php';
} catch (\Throwable $e) {
    error_log("Unhandled Application Exception: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine() . "\n" . $e->getTraceAsString());
    header("HTTP/1.1 500 Internal Server Error");
    header("Content-Type: text/html; charset=UTF-8");

    $appEnv = strtolower((string) (getenv('APP_ENV') ?: ($_ENV['APP_ENV'] ?? 'production')));
    $appDebug = filter_var(getenv('APP_DEBUG') ?: ($_ENV['APP_DEBUG'] ?? false), FILTER_VALIDATE_BOOLEAN);
    $showDiagnostics = $appDebug && !in_array($appEnv, ['production', 'prod'], true);

    if ($showDiagnostics) {
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LikhangKamay - Local Diagnostics</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg: #fdfbf7;
                    --text: #2f2723;
                    --primary: #8b5a2b;
                    --card-bg: #ffffff;
                    --border: #e8e2d9;
                    --code-bg: #1e1e1e;
                    --code-text: #d4d4d4;
                }
                body {
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: var(--bg);
                    color: var(--text);
                    margin: 0;
                    padding: 40px 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    box-sizing: border-box;
                }
                .container {
                    max-width: 800px;
                    width: 100%;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(47, 39, 35, 0.05);
                    padding: 40px;
                    box-sizing: border-box;
                }
                h1 {
                    font-size: 28px;
                    font-weight: 700;
                    color: var(--primary);
                    margin-top: 0;
                    margin-bottom: 24px;
                    border-bottom: 2px solid var(--border);
                    padding-bottom: 12px;
                }
                .section { margin-bottom: 24px; }
                .label {
                    font-weight: 600;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: #8b807a;
                    margin-bottom: 6px;
                }
                .value { font-size: 16px; line-height: 1.6; }
                .highlight {
                    background: #fdf4eb;
                    border-left: 4px solid var(--primary);
                    padding: 12px 16px;
                    border-radius: 0 8px 8px 0;
                    font-weight: 500;
                }
                pre {
                    background-color: var(--code-bg);
                    color: var(--code-text);
                    padding: 20px;
                    border-radius: 8px;
                    overflow-x: auto;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 14px;
                    line-height: 1.5;
                    margin-top: 8px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>LikhangKamay Diagnostics</h1>
                <div class="section">
                    <div class="label">Exception Message</div>
                    <div class="value highlight"><?= htmlspecialchars($e->getMessage()) ?></div>
                </div>
                <div class="section">
                    <div class="label">Triggered In File</div>
                    <div class="value"><code><?= htmlspecialchars($e->getFile()) ?></code> at line <strong><?= $e->getLine() ?></strong></div>
                </div>
                <?php if ($e->getPrevious()): ?>
                <div class="section">
                    <div class="label">Previous Exception</div>
                    <div class="value highlight"><?= htmlspecialchars($e->getPrevious()->getMessage()) ?></div>
                </div>
                <?php endif; ?>
                <div class="section">
                    <div class="label">Stack Trace</div>
                    <pre><?= htmlspecialchars($e->getTraceAsString()) ?></pre>
                </div>
            </div>
        </body>
        </html>
        <?php
    } else {
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>LikhangKamay - Service Unavailable</title>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg: #fdfbf7;
                    --text: #2f2723;
                    --primary: #8b5a2b;
                    --card-bg: #ffffff;
                    --border: #e8e2d9;
                    --muted: #78716c;
                }
                body {
                    font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: var(--bg);
                    color: var(--text);
                    margin: 0;
                    padding: 40px 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    box-sizing: border-box;
                }
                .container {
                    max-width: 520px;
                    width: 100%;
                    background: var(--card-bg);
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(47, 39, 35, 0.05);
                    padding: 40px 32px;
                    text-align: center;
                    box-sizing: border-box;
                }
                h1 {
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--primary);
                    margin: 0 0 12px;
                }
                p {
                    font-size: 15px;
                    line-height: 1.6;
                    color: var(--muted);
                    margin: 0 0 24px;
                }
                .btn {
                    display: inline-block;
                    background-color: var(--primary);
                    color: #ffffff;
                    text-decoration: none;
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    transition: opacity 0.15s ease;
                }
                .btn:hover {
                    opacity: 0.9;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Service Temporarily Unavailable</h1>
                <p>We are experiencing a temporary service interruption. Our engineering team has been notified and is working to resolve this. Please refresh or try again in a few moments.</p>
                <a href="/" class="btn">Return to Home</a>
            </div>
        </body>
        </html>
        <?php
    }
    exit(1);
}

<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'facebook' => [
        'client_id' => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect' => env('FACEBOOK_REDIRECT_URI'),
    ],

    'paymongo' => [
        'public_key' => env('PAYMONGO_PUBLIC_KEY'),
        'secret_key' => env('PAYMONGO_SECRET_KEY'),
    ],

    'lalamove' => [
        'api_key' => env('LALAMOVE_API_KEY'),
        'api_secret' => env('LALAMOVE_API_SECRET'),
        'environment' => env('LALAMOVE_ENV', 'sandbox'),
        'market' => env('LALAMOVE_MARKET', 'PH'),
        'service_type' => env('LALAMOVE_SERVICE_TYPE', 'MOTORCYCLE'),
        'webhook_secret' => env('LALAMOVE_WEBHOOK_SECRET'),
    ],

    'nominatim' => [
        'base_url' => env('NOMINATIM_BASE_URL', 'https://nominatim.openstreetmap.org'),
    ],

    'artisan_applications' => [
        'notification_email' => env('ARTISAN_APPLICATION_NOTIFICATION_EMAIL'),
    ],

    'checkout_shipping' => [
        'fallback_flat_fee' => env('CHECKOUT_SHIPPING_FALLBACK_FLAT_FEE', 69),
        'fallback_base_fee' => env('CHECKOUT_SHIPPING_FALLBACK_BASE_FEE', 69),
        'fallback_included_km' => env('CHECKOUT_SHIPPING_FALLBACK_INCLUDED_KM', 3),
        'fallback_per_km' => env('CHECKOUT_SHIPPING_FALLBACK_PER_KM', 10),
    ],

];

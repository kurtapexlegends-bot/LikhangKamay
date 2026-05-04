#!/bin/bash

# Clear any accidentally pushed local caches
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan clear-compiled

# Force delete any cache files in bootstrap/cache
rm -rf bootstrap/cache/*.php

# Run the standard frontend build
npm run build

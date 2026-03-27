#!/bin/sh
set -eu

echo "Starting Laravel queue worker..."

exec php artisan queue:work --verbose --tries=1 --timeout=120

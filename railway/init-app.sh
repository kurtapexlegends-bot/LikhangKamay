#!/bin/sh
set -eu

echo "Running Railway pre-deploy tasks..."

mkdir -p storage/app/public
mkdir -p storage/framework/cache
mkdir -p storage/framework/sessions
mkdir -p storage/framework/views
mkdir -p storage/logs
mkdir -p bootstrap/cache

php artisan storage:link || true
php artisan migrate --force

echo "Railway pre-deploy tasks completed."

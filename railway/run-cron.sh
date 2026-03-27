#!/bin/sh
set -eu

echo "Starting Laravel scheduler loop..."

while true
do
  php artisan schedule:run --verbose --no-interaction
  sleep 60
done

# Railway Deployment Guide

This project is a good fit for Railway as a single Laravel + Inertia application.

## Recommended Railway layout

Create these services in one Railway project:

1. `app` service
2. `worker` service
3. `cron` service
4. `mysql` service

For this repo, use Railway `MySQL`, not PostgreSQL.

## Why MySQL

The codebase and project guidance are MySQL-oriented, and a few SQL expressions are safest on MySQL.

## Before you deploy

Make sure your GitHub repo includes these helper scripts:

- `railway/init-app.sh`
- `railway/run-worker.sh`
- `railway/run-cron.sh`

## App service settings

Source:

- Connect your GitHub repository

Build:

- Custom Build Command: `npm run build`

Deploy:

- Pre-Deploy Command: `chmod +x ./railway/init-app.sh && sh ./railway/init-app.sh`

Networking:

- Generate a Railway domain after the first successful deploy

## Worker service settings

Source:

- Connect the same GitHub repository

Deploy:

- Custom Start Command: `chmod +x ./railway/run-worker.sh && sh ./railway/run-worker.sh`

## Cron service settings

Source:

- Connect the same GitHub repository

Deploy:

- Custom Start Command: `chmod +x ./railway/run-cron.sh && sh ./railway/run-cron.sh`

## MySQL service

Create a Railway MySQL service on the project canvas.

Railway exposes these useful variables from the MySQL service:

- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`
- `MYSQL_URL`

## App environment variables

Set these on the `app` service:

```env
APP_NAME=LikhangKamay
APP_ENV=production
APP_DEBUG=false
APP_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
APP_KEY=YOUR_GENERATED_APP_KEY

LOG_CHANNEL=stderr
LOG_STDERR_FORMATTER=\Monolog\Formatter\JsonFormatter
LOG_LEVEL=info

DB_CONNECTION=mysql
DB_URL=${{MySQL.MYSQL_URL}}

SESSION_DRIVER=database
QUEUE_CONNECTION=database
CACHE_STORE=database

MAIL_MAILER=log

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=
FACEBOOK_REDIRECT_URI=

PAYMONGO_PUBLIC_KEY=
PAYMONGO_SECRET_KEY=
```

Notes:

- You can keep `MAIL_MAILER=log` for the first deploy, then switch to SMTP later.
- `APP_KEY` should come from `php artisan key:generate --show`.
- After Railway gives you a public domain, update OAuth callback URLs in Google/Facebook and set the matching env vars.

## Worker and cron environment variables

Copy the same env vars from the `app` service to:

- `worker`
- `cron`

They should point to the same MySQL service.

## File uploads and persistent storage

This app stores uploaded files locally on Laravel's `public` disk, so you need persistence.

Attach a Railway Volume to the `app` service with this mount path:

```txt
/app/storage/app/public
```

Why this path:

- Railway puts app files under `/app`
- Laravel's `public` disk points to `storage/app/public`

This preserves:

- product images
- 3D files
- review photos
- chat attachments
- legal documents
- proofs of delivery and returns

Important:

- A service with a volume has a small downtime during redeploys on Railway
- The `worker` and `cron` services do not need this volume for your current code paths

## First deployment flow

1. Push these Railway helper files to GitHub.
2. In Railway, create a new project.
3. Add a `MySQL` service.
4. Add the `app` service from your GitHub repo.
5. Add the environment variables to `app`.
6. Attach the volume to `app` at `/app/storage/app/public`.
7. Deploy `app`.
8. Generate the public domain for `app`.
9. Add `worker` and `cron` services from the same repo.
10. Copy the env vars to them and deploy.

## After deployment

If GitHub autodeploy is enabled:

- every push to the connected branch creates a new deployment
- bugfixes and improvements go live through the next deploy
- your database persists across deploys
- uploaded files persist if the volume remains attached

Be careful with:

- destructive migrations
- changing OAuth callback URLs
- changing storage strategy after users already uploaded files

## Useful commands

Login locally:

```powershell
railway.cmd login
```

Check who you are logged in as:

```powershell
railway.cmd whoami
```

Deploy from CLI after linking:

```powershell
railway.cmd up
```

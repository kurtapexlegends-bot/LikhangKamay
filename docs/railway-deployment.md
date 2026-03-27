# Railway Deployment Guide

This project is a good fit for Railway, but it should be deployed as a Laravel monolith with supporting services.

## Recommended Railway layout

Create these services inside one Railway project:

1. `App` service
2. `MySQL` service
3. `Cron` service
4. `Worker` service

If you want the simplest first deployment, you can temporarily skip the `Worker` service and set `QUEUE_CONNECTION=sync`.

## Why MySQL instead of PostgreSQL

The repo guidance identifies MySQL as the intended backend, and some app queries currently lean MySQL-style.

## Before you start

1. Run `railway login` manually on your machine.
2. Keep the database service name as `MySQL` so `.env.railway.example` works as written.
3. In Railway, connect your GitHub repo to the `App`, `Cron`, and `Worker` services.

## App service settings

- Build command: `npm run build`
- Pre-deploy command: `chmod +x ./railway/init-app.sh && sh ./railway/init-app.sh`
- Public domain: generate one in Railway Networking

## Cron service settings

- Start command: `chmod +x ./railway/run-cron.sh && sh ./railway/run-cron.sh`

## Worker service settings

- Start command: `chmod +x ./railway/run-worker.sh && sh ./railway/run-worker.sh`

## Volume setup

This app writes uploaded files to Laravel's `public` disk under `storage/app/public`.

Attach one Railway Volume to the `App` service and mount it to:

`/app/storage/app/public`

Important notes:

- The app explicitly stores many uploads on the `public` disk, so a Volume is the easiest safe starting point.
- Railway only allows one volume per service.
- Services with a volume have a small amount of downtime on redeploys.

## Variables

Use `.env.railway.example` as the starting point in Railway's Raw Editor.

Set these first:

- `APP_KEY`
- `APP_URL`
- `DB_CONNECTION=mysql`
- `DB_URL=${{MySQL.MYSQL_URL}}`
- `LOG_CHANNEL=stderr`

Then fill in the real credentials for:

- Mail SMTP
- Google OAuth
- Facebook OAuth
- PayMongo

## OAuth callback URLs

Set these provider callbacks to your Railway domain:

- `https://your-domain/auth/google/callback`
- `https://your-domain/auth/facebook/callback`

## Deployment order

1. Create the `MySQL` service.
2. Create the `App` service and import `.env.railway.example`.
3. Set `APP_KEY` and the rest of your secrets.
4. Generate the public domain and update `APP_URL`.
5. Deploy the `App` service.
6. Create and deploy the `Cron` service.
7. Create and deploy the `Worker` service.

## Updating after deployment

- Push bug fixes or improvements to GitHub.
- If GitHub autodeploy is enabled, Railway will redeploy automatically.
- Database data remains unless your migrations change or delete it.
- Uploaded files remain only if your Volume is attached and mounted correctly.

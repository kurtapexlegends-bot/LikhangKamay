# LikhangKamay Performance & Infrastructure Rules

## 1. Vercel Hobby Plan Cron Constraints
- Do NOT configure sub-daily or minute crons (e.g., `* * * * *`) in `vercel.json`. This will fail Vercel deployments immediately.
- Define only daily crons in `vercel.json` (e.g., `0 0 * * *`).
- Use external schedulers (like `cron-job.org`) to request webhook routes (like `/webhooks/cron/queue`) for high-frequency background queue tasks.

## 2. Serverless Cold-Start Prevention
- Keep at least one serverless container warm by targeting the `/ping` route via an external uptime monitor (e.g., UptimeRobot) every 5 minutes.

## 3. Database Connection & Eager-Loading
- Eager-load relations (`with()` or `loadMissing()`) for all model lists to reduce query round-trips over remote database connections.
- Ensure database connections use port `6543` (Supabase connection pooler) instead of `5432` in production.
- Keep database columns used for filtering/checks indexed (e.g., `banned_at`, `status`).

## 4. Asynchronous Queue Processing
- Always decouple slow network responses (like Resend emails or shipping API calls) from the main request thread by using queue background jobs (`QUEUE_CONNECTION=database`).

## 5. Direct-to-Storage Client Uploads
- Vercel functions have a hard 4.5MB request payload limit. 
- For heavy files (like GLB 3D models), generate presigned URLs backend-side and upload files directly to S3/Supabase storage from the browser.
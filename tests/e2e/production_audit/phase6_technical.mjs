import { PROD_URL } from './audit_config.mjs';

export async function runPhase6(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 6: Technical Diagnostics & Serverless Edge Cases`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 6 - Technical');

    // 6.1 Serverless Ping Endpoint
    try {
        const res = await page.goto(`${PROD_URL}/ping`, { waitUntil: 'networkidle2', timeout: 20000 });
        const status = res ? res.status() : 500;
        const bodyText = await page.evaluate(() => document.body.innerText || '');
        const passes = status === 200 && bodyText.includes('pong');

        collector.recordResult('Phase 6', '6.1 Serverless Warmup /ping', passes ? 'PASS' : 'FAIL', {
            message: `Status: ${status}, Body: "${bodyText.trim()}"`
        });
        if (!passes) {
            collector.recordBug('HIGH', 'Serverless /ping endpoint not returning 200 pong', `${PROD_URL}/ping`, `Returned ${status}: ${bodyText}`, 'Check ping route exclusion in middleware.');
        }
    } catch (e) {
        collector.recordResult('Phase 6', '6.1 Serverless Warmup /ping', 'FAIL', { message: e.message });
    }

    // 6.2 Presigned Uploads Guard
    try {
        await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle2' });
        const presignStatus = await page.evaluate(async (url) => {
            const csrfMeta = document.querySelector('meta[name="csrf-token"]');
            const token = csrfMeta ? csrfMeta.getAttribute('content') : '';
            const r = await fetch(`${url}/api/uploads/presign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': token
                },
                body: JSON.stringify({
                    file_name: 'test_asset.glb',
                    file_type: 'model/gltf-binary',
                    file_size: 5000000
                })
            }).catch(err => ({ status: 0 }));
            return r.status;
        }, PROD_URL);

        collector.recordResult('Phase 6', '6.2 Presigned Direct Upload Endpoint', (presignStatus === 200 || presignStatus === 401 || presignStatus === 422 || presignStatus === 419) ? 'PASS' : 'WARN', {
            message: `HTTP Status: ${presignStatus}`
        });
    } catch (e) {
        collector.recordResult('Phase 6', '6.2 Presigned Direct Upload', 'WARN', { message: e.message });
    }

    // 6.3 Global Search API Endpoint
    try {
        const searchStatus = await page.evaluate(async (url) => {
            const r = await fetch(`${url}/api/global-search?q=pottery`, {
                headers: { 'Accept': 'application/json' }
            }).catch(() => ({ status: 0 }));
            return r.status;
        }, PROD_URL);

        collector.recordResult('Phase 6', '6.3 Universal Global Search API', (searchStatus === 200 || searchStatus === 401) ? 'PASS' : 'FAIL', {
            message: `Status: ${searchStatus}`
        });
    } catch (e) {
        collector.recordResult('Phase 6', '6.3 Universal Global Search API', 'FAIL', { message: e.message });
    }

    // 6.4 Webhook Authorization Guard
    try {
        const cronRes = await page.goto(`${PROD_URL}/webhooks/cron`, { waitUntil: 'networkidle2', timeout: 20000 });
        const cronStatus = cronRes ? cronRes.status() : 0;
        collector.recordResult('Phase 6', '6.4 Webhook Cron Security Guard', cronStatus === 401 ? 'PASS' : 'WARN', {
            message: `Unauthenticated cron returned HTTP ${cronStatus} (Expected 401)`
        });
    } catch (e) {
        collector.recordResult('Phase 6', '6.4 Webhook Cron Security Guard', 'WARN', { message: e.message });
    }

    console.log(`\n  PHASE 6 COMPLETE.\n`);
}

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outDir = 'C:\\Users\\acost\\.gemini\\antigravity\\brain\\0736364b-906e-4032-9429-02496b0528ad';

async function capture() {
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--hide-scrollbars'],
        defaultViewport: { width: 1440, height: 900 }
    });

    const page = await browser.newPage();

    // 1. Session auth
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=super_admin&redirect=/admin/users-manager?tab=approvals', { waitUntil: 'networkidle2' });

    // 2. Direct route
    await page.goto('http://127.0.0.1:8000/admin/users-manager?tab=approvals', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Click the Filter button
    const filterBtn = await page.waitForSelector('button:has-text("Filter")', { timeout: 5000 }).catch(() => null);
    if (!filterBtn) {
        // Fallback search by text or svg
        const buttons = await page.$$('button');
        for (const b of buttons) {
            const text = await page.evaluate(el => el.textContent, b);
            if (text.includes('Filter')) {
                await b.click();
                break;
            }
        }
    } else {
        await filterBtn.click();
    }

    await new Promise(r => setTimeout(r, 800));

    // 4. Click the Cavite City dropdown to expand it
    const cityButtons = await page.$$('button');
    for (const b of cityButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('All Cavite Locations')) {
            await b.click();
            break;
        }
    }

    await new Promise(r => setTimeout(r, 800));

    const destPath = path.join(outDir, 'preview_artisan_applications_filter_expanded.png');
    await page.screenshot({ path: destPath, fullPage: false });
    console.log(`[Remote Preview] Saved: ${destPath}`);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

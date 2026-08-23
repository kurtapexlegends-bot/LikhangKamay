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

    // 1. Session auth as buyer
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/my-orders', { waitUntil: 'networkidle2' });

    // 2. Direct route
    await page.goto('http://127.0.0.1:8000/my-orders', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Click the Cancel button on the first pending order if available
    const cancelButtons = await page.$$('button');
    for (const b of cancelButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.trim() === 'Cancel' || text.includes('Cancel Order')) {
            await b.click();
            break;
        }
    }

    await new Promise(r => setTimeout(r, 1000));

    const destPath = path.join(outDir, 'preview_buyer_cancel_order_modal.png');
    await page.screenshot({ path: destPath, fullPage: false });
    console.log(`[Remote Preview] Saved: ${destPath}`);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

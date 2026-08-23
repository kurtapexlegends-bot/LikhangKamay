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
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/checkout', { waitUntil: 'networkidle2' });

    // 2. Direct checkout page
    await page.goto('http://127.0.0.1:8000/checkout', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const destPath = path.join(outDir, 'flow_4_checkout_address_selection.png');
    await page.screenshot({ path: destPath, fullPage: false });
    console.log('[Captured] Checkout Screen -> ' + destPath);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

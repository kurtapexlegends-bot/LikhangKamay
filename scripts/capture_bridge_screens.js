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

    // 1. Session auth as artisan & go to /procurement
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=artisan&redirect=/procurement', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const shot1 = path.join(outDir, 'b2b_10_inventory_low_stock_bridge.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('[Captured] Shot 10: Inventory Low Stock Bridge -> ' + shot1);

    // 2. Go to /procurement/stock-requests
    await page.goto('http://127.0.0.1:8000/procurement/stock-requests', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    const shot2 = path.join(outDir, 'b2b_11_stock_requests_supply_hub_bridge.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('[Captured] Shot 11: Stock Requests Supply Hub Bridge -> ' + shot2);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

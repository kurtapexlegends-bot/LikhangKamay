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

    // 1. Session auth as artisan & add item to cart
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=artisan&redirect=/supply-hub', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    await page.evaluate(() => {
        const addBtn = document.querySelector('button[title="Add to Procurement Cart"]');
        if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Navigate to /supply-hub/checkout (Workspace Checkout)
    await page.goto('http://127.0.0.1:8000/supply-hub/checkout', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const shot1 = path.join(outDir, 'b2b_8_workspace_procurement_checkout.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('[Captured] Shot 8: Workspace Procurement Checkout -> ' + shot1);

    // 3. Navigate to /supply-hub/orders (Inbound Orders Tracker)
    await page.goto('http://127.0.0.1:8000/supply-hub/orders', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const shot2 = path.join(outDir, 'b2b_9_workspace_sourcing_orders.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('[Captured] Shot 9: Workspace Inbound Orders -> ' + shot2);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

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

    // 1. Session auth as artisan & navigate to Supply Hub
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=artisan&redirect=/supply-hub', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const shot1 = path.join(outDir, 'flow_b2b_1_supply_hub_catalog.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('[Captured] Shot 1: B2B Sourcing Hub -> ' + shot1);

    // 2. Navigate to My Wholesale Listings
    await page.goto('http://127.0.0.1:8000/supply-hub/my-listings', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Open configure modal on the first product
    await page.evaluate(() => {
        const configBtns = document.querySelectorAll('button');
        for (const btn of configBtns) {
            if (btn.innerText.includes('Configure B2B')) {
                btn.click();
                break;
            }
        }
    });
    await new Promise(r => setTimeout(r, 800));

    const shot2 = path.join(outDir, 'flow_b2b_2_my_wholesale_listings.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('[Captured] Shot 2: My Wholesale Listings & Modal -> ' + shot2);

    // 3. Navigate to Studio Inventory / Procurement
    await page.goto('http://127.0.0.1:8000/procurement', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    const shot3 = path.join(outDir, 'flow_b2b_3_studio_inventory_synced.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('[Captured] Shot 3: Studio Materials Inventory -> ' + shot3);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

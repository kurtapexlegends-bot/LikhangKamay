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

    // 1. Step 1: Supplier Studio Wholesale Listings (/supply-hub/my-listings)
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=artisan&redirect=/supply-hub/my-listings', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const shot1 = path.join(outDir, 'flow_1_wholesale_listings.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('[1/6] Wholesale Listings captured');

    // 2. Step 2: Studio Inventory (/procurement)
    await page.goto('http://127.0.0.1:8000/procurement', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const shot2 = path.join(outDir, 'flow_2_studio_inventory.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log('[2/6] Studio Inventory captured');

    // 3. Step 3: Stock Requests (/procurement/stock-requests)
    await page.goto('http://127.0.0.1:8000/procurement/stock-requests', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const shot3 = path.join(outDir, 'flow_3_stock_requests.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('[3/6] Stock Requests captured');

    // 4. Step 4: Supply Hub Browse Catalog (/supply-hub)
    await page.goto('http://127.0.0.1:8000/supply-hub', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const shot4 = path.join(outDir, 'flow_4_supply_hub_catalog.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log('[4/6] Supply Hub Catalog captured');

    // 5. Step 5: Add item to Cart & Proceed to Workspace Checkout
    await page.evaluate(() => {
        const addBtn = document.querySelector('button[title="Add to Procurement Cart"]');
        if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    await page.goto('http://127.0.0.1:8000/supply-hub/checkout', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const shot5 = path.join(outDir, 'flow_5_procurement_checkout.png');
    await page.screenshot({ path: shot5, fullPage: false });
    console.log('[5/6] Procurement Checkout captured');

    // 6. Step 6: Inbound Sourcing Orders Tracker (/supply-hub/orders)
    await page.goto('http://127.0.0.1:8000/supply-hub/orders', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));
    const shot6 = path.join(outDir, 'flow_6_inbound_sourcing_orders.png');
    await page.screenshot({ path: shot6, fullPage: false });
    console.log('[6/6] Inbound Orders Tracker captured');

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

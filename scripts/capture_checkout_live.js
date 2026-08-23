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
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/checkout?product_id=1', { waitUntil: 'networkidle2' });

    // 2. Direct checkout page with product
    await page.goto('http://127.0.0.1:8000/checkout?product_id=1&quantity=1', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const destPath = path.join(outDir, 'flow_4_checkout_screen_with_address_selection.png');
    await page.screenshot({ path: destPath, fullPage: false });
    console.log('[Captured] Checkout Screen With Address Selector -> ' + destPath);

    // 3. Also capture with the Address Selector dropdown/drawer open if available
    const changeAddressBtns = await page.$$('button');
    for (const b of changeAddressBtns) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('Change') || text.includes('Edit') || text.includes('Select Address')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 1000));

    const destPath5 = path.join(outDir, 'flow_5_checkout_address_selector_drawer.png');
    await page.screenshot({ path: destPath5, fullPage: false });
    console.log('[Captured] Checkout Address Drawer -> ' + destPath5);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

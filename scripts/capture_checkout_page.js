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
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/catalog', { waitUntil: 'networkidle2' });

    // 2. Go to catalog and click the first product
    await page.goto('http://127.0.0.1:8000/catalog', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Find and click the first product card
    const productLinks = await page.$$('a[href*="/products/"]');
    if (productLinks.length > 0) {
        await productLinks[0].click();
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 1500));

        // Click "Buy Now"
        const buttons = await page.$$('button');
        for (const b of buttons) {
            const text = await page.evaluate(el => el.textContent, b);
            if (text.includes('Buy Now')) {
                await b.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
                break;
            }
        }
    }

    await new Promise(r => setTimeout(r, 2000));

    const destPath = path.join(outDir, 'flow_5_checkout_screen_with_address_selection.png');
    await page.screenshot({ path: destPath, fullPage: false });
    console.log('[Captured] Checkout Screen With Address Selector -> ' + destPath);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

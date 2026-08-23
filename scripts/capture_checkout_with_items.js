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

    // 2. Load my-orders
    await page.goto('http://127.0.0.1:8000/my-orders', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click "Cancel" button on first order
    const cancelButtons = await page.$$('button');
    for (const b of cancelButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.trim() === 'Cancel' || text.includes('Cancel Order')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 1000));

    // Click "Proceed to Change Address"
    const proceedButtons = await page.$$('button[type="submit"]');
    for (const b of proceedButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('Proceed to Change Address')) {
            await b.click();
            break;
        }
    }

    // Wait for SPA router to land on /checkout
    await page.waitForFunction(() => window.location.pathname.includes('/checkout'), { timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2500));

    const destPath = path.join(outDir, 'flow_4_checkout_address_selection.png');
    await page.screenshot({ path: destPath, fullPage: false });
    console.log('[Captured] Checkout Screen -> ' + destPath);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

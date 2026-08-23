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
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/checkout?product_id=10', { waitUntil: 'networkidle2' });

    // 2. Direct checkout page with product 10
    await page.goto('http://127.0.0.1:8000/checkout?product_id=10&quantity=1', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    const destPath4 = path.join(outDir, 'flow_4_checkout_screen_with_address_selection.png');
    await page.screenshot({ path: destPath4, fullPage: false });
    console.log('[Captured] Checkout Screen -> ' + destPath4);

    // 3. Open Address Selector Drawer
    await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const changeBtn = btns.find(b => b.textContent.includes('Change') || b.textContent.includes('Edit') || b.textContent.includes('Select'));
        if (changeBtn) changeBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    const destPath5 = path.join(outDir, 'flow_5_checkout_address_selector_drawer.png');
    await page.screenshot({ path: destPath5, fullPage: false });
    console.log('[Captured] Address Drawer -> ' + destPath5);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

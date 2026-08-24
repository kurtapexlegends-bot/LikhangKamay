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
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/checkout?product_id=22', { waitUntil: 'networkidle2' });

    // ----------------------------------------------------
    // SHOT 2: Heavy / Bulk item (qty=25 -> 27.5kg -> Sedan upgrade)
    // ----------------------------------------------------
    await page.goto('http://127.0.0.1:8000/checkout?product_id=22&quantity=25', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click the address card to select address
    await page.evaluate(() => {
        const addressCards = document.querySelectorAll('div[class*="cursor-pointer rounded-xl border"]');
        if (addressCards.length > 0) {
            addressCards[0].click();
        }
    });

    await page.waitForFunction(() => {
        const quoteReady = document.body.innerText.includes('PHP') && !document.querySelector('.animate-pulse');
        return quoteReady;
    }, { timeout: 8000 }).catch(() => {});

    await new Promise(r => setTimeout(r, 1000));

    const path2 = path.join(outDir, 'flow_vehicle_2_sedan_upgraded.png');
    await page.screenshot({ path: path2, fullPage: false });
    console.log('[Captured] Shot 2: Upgraded Sedan (27.5kg) -> ' + path2);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

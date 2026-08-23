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

    // ----------------------------------------------------
    // SHOT 1: My Orders Base Page
    // ----------------------------------------------------
    await page.goto('http://127.0.0.1:8000/my-orders', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));
    const path1 = path.join(outDir, 'flow_1_my_orders_page.png');
    await page.screenshot({ path: path1, fullPage: false });
    console.log('[Captured] Shot 1: My Purchases Overview -> ' + path1);

    // ----------------------------------------------------
    // SHOT 2: Cancel Order Modal with "Need to change delivery address"
    // ----------------------------------------------------
    const cancelButtons = await page.$$('button');
    for (const b of cancelButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.trim() === 'Cancel' || text.includes('Cancel Order')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 1000));
    const path2 = path.join(outDir, 'flow_2_modal_change_address.png');
    await page.screenshot({ path: path2, fullPage: false });
    console.log('[Captured] Shot 2: Modal Change Address -> ' + path2);

    // ----------------------------------------------------
    // SHOT 3: Cancel Order Modal with "Other reason" selected
    // ----------------------------------------------------
    const reasonButtons = await page.$$('button');
    for (const b of reasonButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('Other reason')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 600));
    const path3 = path.join(outDir, 'flow_3_modal_standard_cancellation.png');
    await page.screenshot({ path: path3, fullPage: false });
    console.log('[Captured] Shot 3: Modal Standard Cancellation -> ' + path3);

    // ----------------------------------------------------
    // SHOT 4: Seamless Redirection to Checkout Screen
    // ----------------------------------------------------
    // Select "Need to change delivery address" again and click proceed
    for (const b of reasonButtons) {
        const text = await page.evaluate(el => el.textContent, b);
        if (text.includes('Need to change delivery address')) {
            await b.click();
            break;
        }
    }
    await new Promise(r => setTimeout(r, 500));

    const submitButtons = await page.$$('button[type="submit"]');
    if (submitButtons.length > 0) {
        await submitButtons[0].click();
    }
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
    await new Promise(r => setTimeout(r, 2000));

    const path4 = path.join(outDir, 'flow_4_checkout_address_selection.png');
    await page.screenshot({ path: path4, fullPage: false });
    console.log('[Captured] Shot 4: Checkout Re-Order Screen -> ' + path4);

    await browser.close();
}

capture().catch(err => {
    console.error(err);
    process.exit(1);
});

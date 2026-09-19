import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\acost\\.gemini\\antigravity\\brain\\01bf9993-a418-4bce-a287-32e64ac51933';
const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

function getBrowserExecutable() {
    for (const p of chromePaths) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('No Chrome/Edge executable found on system.');
}

async function runCaptures() {
    const chromePath = getBrowserExecutable();
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--hide-scrollbars'],
        defaultViewport: { width: 1440, height: 1080 }
    });

    const page = await browser.newPage();

    // 1. Log in as buyer Kurt Stanley Talastas
    const authUrl = 'http://127.0.0.1:8000/dev/preview-auth?role=buyer&redirect=/my-orders';
    console.log('Logging in as buyer...');
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Helper to click tab and wait
    async function clickTab(label) {
        await page.evaluate((tabLabel) => {
            const buttons = Array.from(document.querySelectorAll('button, a'));
            const btn = buttons.find(b => b.textContent && b.textContent.includes(tabLabel));
            if (btn) btn.click();
        }, label);
        await new Promise(r => setTimeout(r, 2000));
    }

    // Capture 1: Desktop - All Orders Tab
    console.log('Capturing Desktop - All Orders...');
    await page.screenshot({ path: path.join(outDir, 'desktop_all_orders.png'), fullPage: false });

    // Capture 2: Desktop - Returns Tab (Declined Return, Replacement Offer, Under Review)
    console.log('Capturing Desktop - Returns Tab...');
    await clickTab('Returns');
    await page.screenshot({ path: path.join(outDir, 'desktop_returns_tab.png'), fullPage: false });

    // Capture 3: Desktop - To Receive Tab (In Transit, Courier Tracking, Map)
    console.log('Capturing Desktop - To Receive Tab...');
    await clickTab('To Receive');
    await page.screenshot({ path: path.join(outDir, 'desktop_to_receive_tab.png'), fullPage: false });

    // Capture 4: Desktop - To Ship / Multi-Item Order
    console.log('Capturing Desktop - To Ship Tab (Multi-Item)...');
    await clickTab('To Ship');
    await page.screenshot({ path: path.join(outDir, 'desktop_to_ship_multi_item.png'), fullPage: false });

    // Capture 5: Desktop - Completed Tab (Warranty, Rate, Return, Buy Again)
    console.log('Capturing Desktop - Completed Tab...');
    await clickTab('Completed');
    await page.screenshot({ path: path.join(outDir, 'desktop_completed_tab.png'), fullPage: false });

    // Capture 6: Desktop - To Pay Tab
    console.log('Capturing Desktop - To Pay Tab...');
    await clickTab('To Pay');
    await page.screenshot({ path: path.join(outDir, 'desktop_to_pay_tab.png'), fullPage: false });

    // Mobile Captures (Viewport: 390x844 iPhone 14 / standard mobile)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

    // Capture 7: Mobile - Returns Tab
    console.log('Capturing Mobile - Returns Tab...');
    await clickTab('Returns');
    await page.screenshot({ path: path.join(outDir, 'mobile_returns_tab.png'), fullPage: false });

    // Capture 8: Mobile - To Ship Tab (Multi-Item swipe carousel)
    console.log('Capturing Mobile - To Ship Tab (Carousel)...');
    await clickTab('To Ship');
    await page.screenshot({ path: path.join(outDir, 'mobile_to_ship_carousel.png'), fullPage: false });

    // Capture 9: Mobile - To Receive Tab
    console.log('Capturing Mobile - To Receive Tab...');
    await clickTab('To Receive');
    await page.screenshot({ path: path.join(outDir, 'mobile_to_receive_tab.png'), fullPage: false });

    await browser.close();
    console.log('All captures complete!');
}

runCaptures().catch(err => {
    console.error('Error during capture:', err);
    process.exit(1);
});

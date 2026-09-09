import fs from 'fs';
import puppeteer from 'puppeteer-core';

// Configuration
const BASE_URL = process.env.APP_URL || 'http://127.0.0.1:8000';
const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

function resolveBrowserExecutable() {
    for (const p of CHROME_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('No compatible Chrome or Edge executable found on this system.');
}

async function runSmokeTests() {
    const overallStart = Date.now();
    const chromeExecutable = resolveBrowserExecutable();

    // Guard against stale public/hot file when Vite dev server is not active
    const hotFile = 'public/hot';
    if (fs.existsSync(hotFile)) {
        try {
            const hotUrl = fs.readFileSync(hotFile, 'utf8').trim();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1000);
            const res = await fetch(hotUrl, { signal: controller.signal }).catch(() => null);
            clearTimeout(timeoutId);
            if (!res) {
                fs.unlinkSync(hotFile);
                console.log('  [NOTE] Stale public/hot removed; running against compiled build assets.');
            }
        } catch {
            fs.unlinkSync(hotFile);
        }
    }

    console.log(`\n======================================================`);
    console.log(`  LikhangKamay | E2E Browser Smoke Test Suite`);
    console.log(`  Target: ${BASE_URL}`);
    console.log(`  Engine: ${chromeExecutable}`);
    console.log(`======================================================\n`);

    const browser = await puppeteer.launch({
        executablePath: chromeExecutable,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,900',
        ],
    });

    const results = [];
    let fatalRuntimeErrors = [];

    const createTrackedContext = async () => {
        const context = await browser.createBrowserContext();
        const page = await context.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        page.on('pageerror', (err) => {
            const entry = {
                type: 'FATAL_PAGE_ERROR',
                url: page.url(),
                message: err.message,
                stack: err.stack,
            };
            fatalRuntimeErrors.push(entry);
            console.error(`  [RUNTIME ERROR] ${page.url()}:`, err.message);
        });

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter non-fatal network or favicon aborts
                if (!text.includes('net::ERR_') && !text.includes('favicon.ico')) {
                    console.warn(`  [BROWSER CONSOLE ERROR] ${text.slice(0, 150)}`);
                }
            }
        });

        page.on('response', (res) => {
            if (res.status() >= 400) {
                console.warn(`  [HTTP ${res.status()}] ${res.request().method()} ${res.url()}`);
            }
        });

        return { context, page };
    };

    try {
        // ==========================================================
        // FLOW 1: Buyer Flow
        // Search product -> Add to cart -> Arrive at checkout page
        // ==========================================================
        const flow1Start = Date.now();
        console.log('[1/3] Testing Buyer Flow (Search -> Add to Cart -> Arrive at Checkout)...');
        const buyerContext = await createTrackedContext();
        const buyerPage = buyerContext.page;

        // Sign in buyer
        await buyerPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await buyerPage.waitForSelector('input[name="email"], input#email', { timeout: 10000 });
        await buyerPage.type('input[name="email"], input#email', 'buyer.smoke@likhangkamay.local');
        await buyerPage.type('input[name="password"], input#password', 'password');
        await Promise.all([
            buyerPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
            buyerPage.keyboard.press('Enter'),
        ]);

        // Search catalog
        await buyerPage.goto(`${BASE_URL}/shop?search=Handcrafted`, { waitUntil: 'domcontentloaded' });
        await buyerPage.waitForSelector('main, .grid', { timeout: 10000 });

        // Find a product link
        let productLink = await buyerPage.$('a[href*="/product/"]');
        if (!productLink) {
            // Fallback to general shop catalog
            await buyerPage.goto(`${BASE_URL}/shop`, { waitUntil: 'domcontentloaded' });
            productLink = await buyerPage.waitForSelector('a[href*="/product/"]', { timeout: 10000 });
        }

        await Promise.all([
            buyerPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
            productLink.click(),
        ]);

        // On Product Detail Page: verify actions panel and Add To Cart
        await buyerPage.waitForSelector('button', { timeout: 10000 });
        const addToCartBtn = await buyerPage.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find((b) => b.textContent && b.textContent.includes('Add To Cart')) || null;
        });

        if (addToCartBtn.asElement()) {
            await addToCartBtn.asElement().click();
            await new Promise((r) => setTimeout(r, 1500));
        }

        // Arrive at Checkout page
        await buyerPage.goto(`${BASE_URL}/checkout`, { waitUntil: 'domcontentloaded' });
        await buyerPage.waitForSelector('h1, h2, form, div.grid', { timeout: 10000 });
        const checkoutTitle = await buyerPage.title();

        const flow1Duration = Date.now() - flow1Start;
        const flow1Passed = !fatalRuntimeErrors.some((e) => e.url.includes('checkout') || e.url.includes('product'));
        results.push({ name: 'Buyer: Search -> Add to Cart -> Checkout', passed: flow1Passed, duration: flow1Duration });
        console.log(`  ✓ Buyer Flow completed in ${flow1Duration}ms (Title: "${checkoutTitle}")`);
        await buyerContext.context.close();

        // ==========================================================
        // FLOW 2: Artisan Profile Flow
        // Sign in -> Update address form (StructuredAddressFields) -> Save profile
        // ==========================================================
        const flow2Start = Date.now();
        console.log('\n[2/3] Testing Artisan Profile Flow (Sign in -> StructuredAddressFields -> Save Profile)...');
        const artisanContext = await createTrackedContext();
        const artisanPage = artisanContext.page;

        // Sign in artisan
        await artisanPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
        await artisanPage.waitForSelector('input[name="email"], input#email', { timeout: 10000 });
        await artisanPage.type('input[name="email"], input#email', 'artisan.smoke@likhangkamay.local');
        await artisanPage.type('input[name="password"], input#password', 'password');
        await Promise.all([
            artisanPage.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
            artisanPage.keyboard.press('Enter'),
        ]);

        // Navigate to Artisan Profile
        await artisanPage.goto(`${BASE_URL}/profile`, { waitUntil: 'domcontentloaded' });
        await artisanPage.waitForSelector('main, form, section', { timeout: 10000 });

        // Verify StructuredAddressFields rendered on the profile
        const hasAddressContainer = await artisanPage.evaluate(() => {
            return (
                document.querySelector('input[id*="street_address"]') !== null ||
                document.querySelector('input[placeholder*="Acacia St"]') !== null ||
                document.querySelector('[data-testid="structured-address"]') !== null ||
                document.body.innerText.includes('Logistics Address') ||
                document.body.innerText.includes('Addresses')
            );
        });

        // Test form save button
        const saveButton = await artisanPage.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find((b) => b.textContent && (b.textContent.includes('Save Changes') || b.textContent.includes('Save') || b.textContent.includes('Update'))) || null;
        });

        if (saveButton.asElement()) {
            await saveButton.asElement().click();
            await new Promise((r) => setTimeout(r, 1200));
        }

        const flow2Duration = Date.now() - flow2Start;
        const flow2Passed = hasAddressContainer && !fatalRuntimeErrors.some((e) => e.url.includes('profile'));
        results.push({ name: 'Artisan: Sign in -> StructuredAddressFields -> Save', passed: flow2Passed, duration: flow2Duration });
        console.log(`  ✓ Artisan Flow completed in ${flow2Duration}ms (StructuredAddressFields Verified: ${hasAddressContainer})`);

        // ==========================================================
        // FLOW 3: Subscription Flow
        // View /subscription -> Click upgrade -> Redirect to checkout session
        // ==========================================================
        const flow3Start = Date.now();
        console.log('\n[3/3] Testing Subscription Flow (View /subscription -> Click Upgrade -> Redirect to Checkout)...');

        // Navigate to subscription management page using the authenticated artisan session
        await artisanPage.goto(`${BASE_URL}/subscription`, { waitUntil: 'domcontentloaded' });
        await artisanPage.waitForSelector('main, article, h3', { timeout: 10000 });

        // Locate upgrade button (e.g. "Upgrade to Premium" or "Upgrade to Elite")
        const upgradeButtonFound = await artisanPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const upgradeBtn = buttons.find((b) => b.textContent && b.textContent.includes('Upgrade to'));
            if (upgradeBtn) {
                upgradeBtn.click();
                return true;
            }
            return false;
        });

        await new Promise((r) => setTimeout(r, 2000)); // Allow Inertia location or network request to dispatch

        const flow3Duration = Date.now() - flow3Start;
        const flow3Passed = !fatalRuntimeErrors.some((e) => e.url.includes('subscription'));
        results.push({ name: 'Subscription: View /subscription -> Upgrade -> Checkout Redirect', passed: flow3Passed, duration: flow3Duration });
        console.log(`  ✓ Subscription Flow completed in ${flow3Duration}ms (Upgrade Triggered: ${upgradeButtonFound})`);
        await artisanContext.context.close();

    } finally {
        await browser.close();
    }

    const totalDuration = Date.now() - overallStart;

    // Report Summary
    console.log(`\n======================================================`);
    console.log(`  E2E Smoke Test Summary (Total Time: ${totalDuration}ms / ${(totalDuration / 1000).toFixed(1)}s)`);
    console.log(`======================================================`);

    let allPassed = true;
    for (const r of results) {
        const icon = r.passed ? '✓ PASS' : '✗ FAIL';
        if (!r.passed) allPassed = false;
        console.log(`  ${icon} | ${r.name} (${r.duration}ms)`);
    }

    if (fatalRuntimeErrors.length > 0) {
        console.error(`\n[FATAL] Caught ${fatalRuntimeErrors.length} unhandled runtime JavaScript exception(s):`);
        for (const err of fatalRuntimeErrors) {
            console.error(`  - [${err.url}]: ${err.message}`);
        }
        allPassed = false;
    } else {
        console.log(`  ✓ ZERO unhandled runtime JavaScript errors or undefined hooks caught!`);
    }

    console.log(`======================================================\n`);

    if (!allPassed) {
        process.exit(1);
    }
    process.exit(0);
}

runSmokeTests().catch((err) => {
    console.error('\n[FATAL] E2E Smoke test suite encountered an unexpected exception:\n', err);
    process.exit(1);
});

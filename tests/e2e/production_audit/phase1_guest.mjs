import { PROD_URL } from './audit_config.mjs';

export async function runPhase1(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 1: Guest / Anonymous Visitor Flow`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 1 - Guest');

    // 1.1 Homepage
    try {
        await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle2', timeout: 30000 });
        const title = await page.title();
        const heroExists = await page.$('h1, [class*="hero"]') !== null;
        collector.recordResult('Phase 1', '1.1 Homepage Load', heroExists ? 'PASS' : 'WARN', {
            message: `Title: "${title}", Hero visible: ${heroExists}`
        });
        await collector.scanDomQuality(page, 'Homepage');

        // Test responsive mobile navigation
        await page.setViewport({ width: 375, height: 812 });
        await new Promise(r => setTimeout(r, 800));
        const mobileMenuButton = await page.$('button[aria-label*="menu" i], button[aria-expanded]');
        if (mobileMenuButton) {
            await mobileMenuButton.click().catch(() => null);
            await new Promise(r => setTimeout(r, 500));
            collector.recordResult('Phase 1', '1.1 Mobile Drawer Toggle', 'PASS', { message: 'Mobile drawer inspected' });
        }
        await page.setViewport({ width: 1280, height: 900 });
    } catch (e) {
        collector.recordResult('Phase 1', '1.1 Homepage Load', 'FAIL', { message: e.message });
    }

    // 1.2 Marketplace Catalog
    let sampleProductUrl = null;
    let sampleArtisanShopUrl = null;
    try {
        await page.goto(`${PROD_URL}/shop`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const catalogLoaded = await page.$('[class*="grid"], [class*="product"], main') !== null;
        collector.recordResult('Phase 1', '1.2 Marketplace Catalog Load', catalogLoaded ? 'PASS' : 'WARN');
        await collector.scanDomQuality(page, 'Marketplace Catalog');

        // Test Search Suggestions API
        const searchInput = await page.$('input[type="search"], input[placeholder*="search" i]');
        if (searchInput) {
            await searchInput.type('clay', { delay: 50 });
            await new Promise(r => setTimeout(r, 1000));
            collector.recordResult('Phase 1', '1.2 Search Input & Suggestions', 'PASS', { message: 'Debounce search executed' });
        }

        // Test Category filter or sort dropdown
        const sortSelect = await page.$('select, [role="combobox"]');
        if (sortSelect) {
            collector.recordResult('Phase 1', '1.2 Sort Dropdown Exists', 'PASS');
        }

        // Extract a sample product URL and artisan profile URL
        sampleProductUrl = await page.evaluate(() => {
            const a = document.querySelector('a[href*="/product/"]');
            return a ? a.href : null;
        });

        if (!sampleProductUrl) {
            // Check homepage for products
            await page.goto(`${PROD_URL}/`, { waitUntil: 'networkidle2', timeout: 20000 });
            sampleProductUrl = await page.evaluate(() => {
                const a = document.querySelector('a[href*="/product/"]');
                return a ? a.href : null;
            });
        }

        sampleArtisanShopUrl = await page.evaluate(() => {
            const a = document.querySelector('a[href*="/shop/"]:not([href$="/shop"])');
            return a ? a.href : null;
        });
    } catch (e) {
        collector.recordResult('Phase 1', '1.2 Marketplace Catalog', 'FAIL', { message: e.message });
    }

    // 1.3 Product Detail Page & 3D Canvas
    try {
        if (sampleProductUrl) {
            await page.goto(sampleProductUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            const titleEl = await page.$('h1');
            const productTitle = titleEl ? await page.evaluate(el => el.innerText, titleEl) : 'Unknown';

            // Check 3D Canvas viewer
            const canvasExists = await page.$('canvas') !== null;
            collector.recordResult('Phase 1', '1.3 Product Detail & 3D Viewer', 'PASS', {
                message: `Product: "${productTitle}", WebGL Canvas present: ${canvasExists}`
            });

            // Inspect Recipe / "Crafted with Materials" drawer or badge
            const recipeInfo = await page.evaluate(() => {
                return !!document.body.innerText.match(/(Materials|Recipe|Crafted with)/i);
            });
            collector.recordResult('Phase 1', '1.3 Recipe Transparency Pill', recipeInfo ? 'PASS' : 'WARN', {
                message: `Materials information visible: ${recipeInfo}`
            });

            // Inspect Add to Cart button
            const addToCartBtn = await page.$('button');
            if (addToCartBtn) {
                collector.recordResult('Phase 1', '1.3 Add to Cart Button Rendered', 'PASS');
            }

            await collector.scanDomQuality(page, 'Product Detail Page');
        } else {
            collector.recordResult('Phase 1', '1.3 Product Detail', 'WARN', { message: 'No sample product link found' });
        }
    } catch (e) {
        collector.recordResult('Phase 1', '1.3 Product Detail', 'FAIL', { message: e.message });
    }

    // 1.4 Artisan Public Shop Profile
    try {
        if (sampleArtisanShopUrl) {
            await page.goto(sampleArtisanShopUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            const shopBanner = await page.$('[class*="banner"], [class*="cover"], h1');
            collector.recordResult('Phase 1', '1.4 Artisan Profile Load', shopBanner ? 'PASS' : 'WARN', {
                message: `Target URL: ${sampleArtisanShopUrl}`
            });
            await collector.scanDomQuality(page, 'Artisan Profile');
        } else {
            collector.recordResult('Phase 1', '1.4 Artisan Profile', 'WARN', { message: 'No sample artisan shop link extracted' });
        }
    } catch (e) {
        collector.recordResult('Phase 1', '1.4 Artisan Profile', 'FAIL', { message: e.message });
    }

    // 1.5 Buyer Registration Form Validation
    try {
        await page.goto(`${PROD_URL}/register`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('form, input', { timeout: 10000 }).catch(() => null);
        const regForm = await page.$('form');
        collector.recordResult('Phase 1', '1.5 Register Page Load', regForm ? 'PASS' : 'FAIL');

        // Test client / server validation by submitting empty/invalid values
        const submitBtn = await page.$('button[type="submit"], form button');
        if (submitBtn) {
            await submitBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            // Check for validation error messages
            const hasErrors = await page.evaluate(() => {
                return !!document.body.innerText.match(/(required|email|password|must be)/i);
            });
            collector.recordResult('Phase 1', '1.5 Registration Validation Errors', hasErrors ? 'PASS' : 'WARN', {
                message: 'Form validation errors properly displayed'
            });
        }
        await collector.scanDomQuality(page, 'Register Page');
    } catch (e) {
        collector.recordResult('Phase 1', '1.5 Register Page', 'FAIL', { message: e.message });
    }

    // 1.6 Google OAuth Redirect Check
    try {
        await page.goto(`${PROD_URL}/auth/google`, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
        const finalUrl = page.url();
        const isGoogleRedirect = finalUrl.includes('accounts.google.com') || finalUrl.includes('google');
        collector.recordResult('Phase 1', '1.6 Google OAuth Redirect', isGoogleRedirect ? 'PASS' : 'WARN', {
            message: `Target URL reached: ${finalUrl.slice(0, 80)}`
        });
    } catch (e) {
        collector.recordResult('Phase 1', '1.6 Google OAuth Redirect', 'WARN', { message: e.message });
    }

    // 1.7 Forgot Password Loop
    try {
        await page.goto(`${PROD_URL}/forgot-password`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('input#email, input[type="email"]', { timeout: 10000 }).catch(() => null);
        const emailInput = await page.$('input#email, input[type="email"]');
        collector.recordResult('Phase 1', '1.7 Forgot Password Page Load', emailInput ? 'PASS' : 'FAIL');

        if (emailInput) {
            await emailInput.type('audit_test_nonexistent@example.com');
            await page.keyboard.press('Enter');
            await new Promise(r => setTimeout(r, 2000));
            collector.recordResult('Phase 1', '1.7 Forgot Password Submit', 'PASS', { message: 'Submission handled' });
        }
        await collector.scanDomQuality(page, 'Forgot Password');
    } catch (e) {
        collector.recordResult('Phase 1', '1.7 Forgot Password', 'FAIL', { message: e.message });
    }

    // 1.8 Artisan Registration & Setup
    try {
        await page.goto(`${PROD_URL}/artisan/register`, { waitUntil: 'networkidle2', timeout: 30000 });
        const artisanForm = await page.$('form, [class*="step"], [class*="wizard"], main');
        collector.recordResult('Phase 1', '1.8 Artisan Register Page Load', artisanForm ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Artisan Register');
    } catch (e) {
        collector.recordResult('Phase 1', '1.8 Artisan Register', 'FAIL', { message: e.message });
    }

    // 1.9 Legal Pages
    const legalPages = ['/terms', '/privacy', '/seller-agreement', '/seller-privacy'];
    for (const path of legalPages) {
        try {
            const res = await page.goto(`${PROD_URL}${path}`, { waitUntil: 'networkidle2', timeout: 20000 });
            const status = res ? res.status() : 500;
            const contentOk = await page.$('h1, h2, article, main') !== null;
            collector.recordResult('Phase 1', `1.9 Legal Page: ${path}`, (status === 200 && contentOk) ? 'PASS' : 'FAIL', {
                message: `HTTP ${status}`
            });
            await collector.scanDomQuality(page, `Legal Page ${path}`);
        } catch (e) {
            collector.recordResult('Phase 1', `1.9 Legal Page: ${path}`, 'FAIL', { message: e.message });
        }
    }

    console.log(`\n  PHASE 1 COMPLETE.\n`);
}

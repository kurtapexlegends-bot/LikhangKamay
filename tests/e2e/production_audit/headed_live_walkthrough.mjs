import path from 'path';
import puppeteer from 'puppeteer-core';
import { PROD_URL, ACCOUNTS, resolveBrowserExecutable, loginAs } from './audit_config.mjs';

const SCREENSHOTS_DIR = 'C:\\Users\\acost\\.gemini\\antigravity\\brain\\7751a349-3894-4ceb-833b-ed90ef2c3359\\screenshots';

async function runLiveHeadedWalkthrough() {
    console.log('\n=============================================================');
    console.log('  STARTING LIVE HEADED BROWSER PRODUCTION WALKTHROUGH');
    console.log('  Host: ' + PROD_URL);
    console.log('  Mode: HEADED (Visible Chrome Window will open on desktop)');
    console.log('=============================================================\n');

    const browser = await puppeteer.launch({
        executablePath: resolveBrowserExecutable(),
        headless: false, // VISIBLE BROWSER WINDOW
        defaultViewport: { width: 1366, height: 850 },
        slowMo: 80,
        args: [
            '--start-maximized',
            '--disable-infobars',
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ]
    });

    const capture = async (page, name, delayMs = 1200) => {
        await new Promise(r => setTimeout(r, delayMs));
        const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
        await page.screenshot({ path: filePath, fullPage: false });
        console.log(`  📸 Captured: ${name}.png`);
    };

    try {
        // ========== 1. GUEST FLOWS ==========
        console.log('\n--- 1. Testing Guest Flows ---');
        const guestCtx = await browser.createBrowserContext();
        const guestPage = await guestCtx.newPage();
        await guestPage.setViewport({ width: 1366, height: 850 });

        await guestPage.goto(`${PROD_URL}/`, { waitUntil: 'networkidle2' });
        await capture(guestPage, '01_guest_homepage');

        await guestPage.goto(`${PROD_URL}/shop`, { waitUntil: 'networkidle2' });
        await capture(guestPage, '02_guest_shop_catalog');

        await guestPage.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle2' });
        await capture(guestPage, '03_guest_login_page');
        await guestCtx.close();

        // ========== 2. BUYER FLOWS ==========
        console.log('\n--- 2. Testing Registered Buyer Flows ---');
        const buyerCtx = await browser.createBrowserContext();
        const buyerPage = await buyerCtx.newPage();
        await buyerPage.setViewport({ width: 1366, height: 850 });

        await loginAs(buyerPage, ACCOUNTS.buyer.email, ACCOUNTS.buyer.password);
        await capture(buyerPage, '04_buyer_logged_in');

        await buyerPage.goto(`${PROD_URL}/cart`, { waitUntil: 'networkidle2' });
        await capture(buyerPage, '05_buyer_cart');

        await buyerPage.goto(`${PROD_URL}/my-orders`, { waitUntil: 'networkidle2' });
        await capture(buyerPage, '06_buyer_my_orders');

        await buyerPage.goto(`${PROD_URL}/saved`, { waitUntil: 'networkidle2' });
        await capture(buyerPage, '07_buyer_saved_wishlist');
        await buyerCtx.close();

        // ========== 3. ARTISAN / SELLER ERP ==========
        console.log('\n--- 3. Testing Artisan / Seller ERP Workspace ---');
        const sellerCtx = await browser.createBrowserContext();
        const sellerPage = await sellerCtx.newPage();
        await sellerPage.setViewport({ width: 1366, height: 850 });

        await loginAs(sellerPage, ACCOUNTS.seller.email, ACCOUNTS.seller.password);
        await capture(sellerPage, '08_artisan_dashboard');

        await sellerPage.goto(`${PROD_URL}/products`, { waitUntil: 'networkidle2' });
        await capture(sellerPage, '09_artisan_products_catalog');

        await sellerPage.goto(`${PROD_URL}/3d-manager`, { waitUntil: 'networkidle2' });
        await capture(sellerPage, '10_artisan_3d_asset_manager');

        await sellerPage.goto(`${PROD_URL}/orders`, { waitUntil: 'networkidle2' });
        await capture(sellerPage, '11_artisan_orders_fulfillment');

        await sellerPage.goto(`${PROD_URL}/chat`, { waitUntil: 'networkidle2' });
        await capture(sellerPage, '12_artisan_chat_crm');

        await sellerPage.goto(`${PROD_URL}/subscription`, { waitUntil: 'networkidle2' });
        await capture(sellerPage, '13_artisan_subscription');
        await sellerCtx.close();

        // ========== 4. SUPER ADMIN GOVERNANCE ==========
        console.log('\n--- 4. Testing Super Admin Governance Suite ---');
        const adminCtx = await browser.createBrowserContext();
        const adminPage = await adminCtx.newPage();
        await adminPage.setViewport({ width: 1366, height: 850 });

        await loginAs(adminPage, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
        await capture(adminPage, '14_admin_executive_dashboard');

        await adminPage.goto(`${PROD_URL}/admin/users-manager`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '15_admin_users_manager');

        await adminPage.goto(`${PROD_URL}/admin/users-manager?tab=approvals`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '16_admin_pending_artisans');

        await adminPage.goto(`${PROD_URL}/admin/catalog`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '17_admin_catalog_moderation');

        await adminPage.goto(`${PROD_URL}/admin/disputes`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '18_admin_disputes_arbitration');

        await adminPage.goto(`${PROD_URL}/admin/payouts`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '19_admin_payouts_escrow');

        await adminPage.goto(`${PROD_URL}/admin/operations`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '20_admin_operations_diagnostics');

        await adminPage.goto(`${PROD_URL}/admin/settings`, { waitUntil: 'networkidle2' });
        await capture(adminPage, '21_admin_system_settings');
        await adminCtx.close();

        console.log('\n=============================================================');
        console.log('  LIVE WALKTHROUGH COMPLETE: ALL 21 SCREENSHOTS SAVED!');
        console.log('=============================================================\n');

    } catch (e) {
        console.error('Walkthrough error:', e);
    } finally {
        await browser.close();
    }
}

runLiveHeadedWalkthrough().catch(console.error);

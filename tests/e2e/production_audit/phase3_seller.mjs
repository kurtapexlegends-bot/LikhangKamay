import { PROD_URL, ACCOUNTS, loginAs, findElementByText } from './audit_config.mjs';

export async function runPhase3(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 3: Artisan / Seller ERP Workspace`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 3 - Seller');

    // 3.1 Seller Login
    try {
        const loggedIn = await loginAs(page, ACCOUNTS.seller.email, ACCOUNTS.seller.password);
        collector.recordResult('Phase 3', '3.1 Seller Authentication', loggedIn ? 'PASS' : 'FAIL', {
            message: `Current URL: ${page.url()}`
        });
        if (!loggedIn) {
            collector.recordBug('HIGH', 'Seller Login Failed in Production', `${PROD_URL}/login`, 'Artisan credentials rejected', 'Check seller account status.');
            return;
        }
    } catch (e) {
        collector.recordResult('Phase 3', '3.1 Seller Authentication', 'FAIL', { message: e.message });
        return;
    }

    // 3.2 Seller Dashboard
    try {
        await page.goto(`${PROD_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const metricCards = await page.$$('[class*="grid"] > div, [class*="card"]');
        collector.recordResult('Phase 3', '3.2 Seller Dashboard Load', metricCards.length > 0 ? 'PASS' : 'WARN', {
            message: `Found ${metricCards.length} dashboard metric elements`
        });
        await collector.scanDomQuality(page, 'Seller Dashboard');
    } catch (e) {
        collector.recordResult('Phase 3', '3.2 Seller Dashboard', 'FAIL', { message: e.message });
    }

    // 3.3 Product Catalog Management
    try {
        await page.goto(`${PROD_URL}/products`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const catalogLoaded = await page.$('table, [class*="product"], main') !== null;
        collector.recordResult('Phase 3', '3.3 Product Catalog Load', catalogLoaded ? 'PASS' : 'FAIL');

        // Test "Create Product" button
        const createBtn = await findElementByText(page, 'button, a', 'Add Product|Create Product|New Product');
        collector.recordResult('Phase 3', '3.3 Create Product Action Present', createBtn ? 'PASS' : 'WARN');

        // Test CSV Export Link
        const exportCsv = await page.$('a[href*="export-csv"]');
        collector.recordResult('Phase 3', '3.3 Product CSV Export Available', exportCsv ? 'PASS' : 'WARN');
        await collector.scanDomQuality(page, 'Product Catalog');
    } catch (e) {
        collector.recordResult('Phase 3', '3.3 Product Catalog', 'FAIL', { message: e.message });
    }

    // 3.4 3D Asset Manager
    try {
        await page.goto(`${PROD_URL}/3d-manager`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const threeDLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.4 3D Asset Manager Load', threeDLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, '3D Manager');
    } catch (e) {
        collector.recordResult('Phase 3', '3.4 3D Asset Manager', 'FAIL', { message: e.message });
    }

    // 3.5 Marketing & Discounts
    try {
        await page.goto(`${PROD_URL}/discounts`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const discountsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.5 Marketing Discounts Load', discountsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Discounts Page');
    } catch (e) {
        collector.recordResult('Phase 3', '3.5 Marketing Discounts', 'FAIL', { message: e.message });
    }

    // 3.6 Sponsorships
    try {
        await page.goto(`${PROD_URL}/sponsorships`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const sponsorshipsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.6 Sponsorships Page Load', sponsorshipsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Sponsorships Page');
    } catch (e) {
        collector.recordResult('Phase 3', '3.6 Sponsorships Page', 'FAIL', { message: e.message });
    }

    // 3.7 Orders Fulfillment Center
    try {
        await page.goto(`${PROD_URL}/orders`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const ordersLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.7 Orders Fulfillment Load', ordersLoaded ? 'PASS' : 'FAIL');

        // Test Bulk Labels & Packing Slips presence
        const bulkLabels = await page.$('a[href*="bulk-labels"]');
        collector.recordResult('Phase 3', '3.7 Bulk Labels Action Present', bulkLabels ? 'PASS' : 'WARN');
        await collector.scanDomQuality(page, 'Orders Fulfillment');
    } catch (e) {
        collector.recordResult('Phase 3', '3.7 Orders Fulfillment', 'FAIL', { message: e.message });
    }

    // 3.8 B2B Supply Hub
    try {
        await page.goto(`${PROD_URL}/supply-hub`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const supplyHubLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.8 B2B Supply Hub Load', supplyHubLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'B2B Supply Hub');
    } catch (e) {
        collector.recordResult('Phase 3', '3.8 B2B Supply Hub', 'FAIL', { message: e.message });
    }

    // 3.9 ERP Procurement & Inventory
    try {
        await page.goto(`${PROD_URL}/procurement`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const procLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.9 ERP Procurement Load', procLoaded ? 'PASS' : 'FAIL');

        await page.goto(`${PROD_URL}/procurement/stock-requests`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const stockRequestsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.9 Stock Requests Desk Load', stockRequestsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'ERP Procurement');
    } catch (e) {
        collector.recordResult('Phase 3', '3.9 ERP Procurement', 'FAIL', { message: e.message });
    }

    // 3.10 ERP Accounting & Fund Release
    try {
        await page.goto(`${PROD_URL}/accounting`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const accountingLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.10 ERP Accounting Load', accountingLoaded ? 'PASS' : 'FAIL');

        const hasBalanceCards = await page.evaluate(() => {
            return !!document.body.innerText.match(/(Available Balance|Total Revenue|Base Funds|Accounting)/i);
        });
        collector.recordResult('Phase 3', '3.10 Accounting Balance Cards Rendered', hasBalanceCards ? 'PASS' : 'WARN');
        await collector.scanDomQuality(page, 'ERP Accounting');
    } catch (e) {
        collector.recordResult('Phase 3', '3.10 ERP Accounting', 'FAIL', { message: e.message });
    }

    // 3.11 ERP HR, Attendance & Payroll
    try {
        await page.goto(`${PROD_URL}/hr`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const hrLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.11 ERP HR & Attendance Load', hrLoaded ? 'PASS' : 'FAIL');

        const addEmpBtn = await findElementByText(page, 'button', 'Add Employee|New Employee');
        collector.recordResult('Phase 3', '3.11 Add Employee Action Present', addEmpBtn ? 'PASS' : 'WARN');
        await collector.scanDomQuality(page, 'ERP HR');
    } catch (e) {
        collector.recordResult('Phase 3', '3.11 ERP HR', 'FAIL', { message: e.message });
    }

    // 3.12 Customer CRM & Reviews
    try {
        await page.goto(`${PROD_URL}/chat`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main, #seller-main-content, #app', { timeout: 10000 }).catch(() => null);
        const chatLoaded = await page.$('main, #seller-main-content, #app') !== null;
        collector.recordResult('Phase 3', '3.12 Seller Chat CRM Load', chatLoaded ? 'PASS' : 'FAIL');

        await page.goto(`${PROD_URL}/reviews`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main, #seller-main-content, #app', { timeout: 10000 }).catch(() => null);
        const reviewsLoaded = await page.$('main, #seller-main-content, #app') !== null;
        collector.recordResult('Phase 3', '3.12 Seller Reviews Desk Load', reviewsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Seller Reviews');
    } catch (e) {
        collector.recordResult('Phase 3', '3.12 CRM & Reviews', 'FAIL', { message: e.message });
    }

    // 3.13 Team Messages
    try {
        await page.goto(`${PROD_URL}/team-messages`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const teamMessagesLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.13 Team Messages Load', teamMessagesLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Team Messages');
    } catch (e) {
        collector.recordResult('Phase 3', '3.13 Team Messages', 'FAIL', { message: e.message });
    }

    // 3.14 Subscriptions & Shop Settings
    try {
        await page.goto(`${PROD_URL}/subscription`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const subLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.14 Subscriptions Page Load', subLoaded ? 'PASS' : 'FAIL');

        await page.goto(`${PROD_URL}/shop-settings`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const settingsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.14 Shop Settings Page Load', settingsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Shop Settings');
    } catch (e) {
        collector.recordResult('Phase 3', '3.14 Subscriptions & Settings', 'FAIL', { message: e.message });
    }

    // 3.15 Seller Audit Trail
    try {
        await page.goto(`${PROD_URL}/audit-log`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const auditLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 3', '3.15 Seller Audit Log Load', auditLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Seller Audit Log');
    } catch (e) {
        collector.recordResult('Phase 3', '3.15 Seller Audit Log', 'FAIL', { message: e.message });
    }

    console.log(`\n  PHASE 3 COMPLETE.\n`);
}

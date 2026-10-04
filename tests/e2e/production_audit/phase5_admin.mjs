import { PROD_URL, ACCOUNTS, loginAs } from './audit_config.mjs';

export async function runPhase5(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 5: Super Administrator Governance`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 5 - SuperAdmin');

    // 5.1 Super Admin Login
    try {
        const loggedIn = await loginAs(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
        collector.recordResult('Phase 5', '5.1 SuperAdmin Authentication', loggedIn ? 'PASS' : 'FAIL', {
            message: `URL: ${page.url()}`
        });
        if (!loggedIn) {
            collector.recordBug('HIGH', 'SuperAdmin Login Failed in Production', `${PROD_URL}/login`, 'Admin credentials rejected', 'Check super admin account.');
            return;
        }
    } catch (e) {
        collector.recordResult('Phase 5', '5.1 SuperAdmin Authentication', 'FAIL', { message: e.message });
        return;
    }

    // 5.2 Executive Dashboard
    try {
        await page.goto(`${PROD_URL}/admin/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const adminDashboardLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.2 Executive Dashboard Load', adminDashboardLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Admin Dashboard');
    } catch (e) {
        collector.recordResult('Phase 5', '5.2 Executive Dashboard', 'FAIL', { message: e.message });
    }

    // 5.3 User Management & Directory
    try {
        await page.goto(`${PROD_URL}/admin/users-manager`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const userManagerLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.3 User Directory Load', userManagerLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'User Directory');
    } catch (e) {
        collector.recordResult('Phase 5', '5.3 User Directory', 'FAIL', { message: e.message });
    }

    // 5.4 Artisan Applications Desk
    try {
        await page.goto(`${PROD_URL}/admin/users-manager?tab=approvals`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const approvalsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.4 Pending Artisans Desk Load', approvalsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Pending Artisans');
    } catch (e) {
        collector.recordResult('Phase 5', '5.4 Pending Artisans Desk', 'FAIL', { message: e.message });
    }

    // 5.5 Catalog Moderation & 3D Review
    try {
        await page.goto(`${PROD_URL}/admin/catalog`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const catalogModLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.5 Catalog Moderation Desk Load', catalogModLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Catalog Moderation');
    } catch (e) {
        collector.recordResult('Phase 5', '5.5 Catalog Moderation Desk', 'FAIL', { message: e.message });
    }

    // 5.6 Transaction Disputes Arbitration Desk
    try {
        await page.goto(`${PROD_URL}/admin/disputes`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const disputesLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.6 Disputes Arbitration Desk Load', disputesLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Disputes Desk');
    } catch (e) {
        collector.recordResult('Phase 5', '5.6 Disputes Arbitration Desk', 'FAIL', { message: e.message });
    }

    // 5.7 Review Moderation & Compliance
    try {
        await page.goto(`${PROD_URL}/admin/compliance`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const complianceLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.7 Compliance & Safety Desk Load', complianceLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Compliance Desk');
    } catch (e) {
        collector.recordResult('Phase 5', '5.7 Compliance & Safety Desk', 'FAIL', { message: e.message });
    }

    // 5.8 Payouts Management & Proofs
    try {
        await page.goto(`${PROD_URL}/admin/payouts`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const payoutsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.8 Payouts Manager Load', payoutsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Payouts Manager');
    } catch (e) {
        collector.recordResult('Phase 5', '5.8 Payouts Manager', 'FAIL', { message: e.message });
    }

    // 5.9 Dynamic Email Studio
    try {
        await page.goto(`${PROD_URL}/admin/settings/email-templates`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const emailStudioLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.9 Email Studio Load', emailStudioLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Email Studio');
    } catch (e) {
        collector.recordResult('Phase 5', '5.9 Email Studio', 'FAIL', { message: e.message });
    }

    // 5.10 Platform Operations Control Center
    try {
        await page.goto(`${PROD_URL}/admin/operations`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const operationsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.10 Platform Operations Load', operationsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Platform Operations');
    } catch (e) {
        collector.recordResult('Phase 5', '5.10 Platform Operations', 'FAIL', { message: e.message });
    }

    // 5.11 Monetization & Subscriptions
    try {
        await page.goto(`${PROD_URL}/admin/monetization`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const monetizationLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.11 Monetization Desk Load', monetizationLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Monetization Desk');
    } catch (e) {
        collector.recordResult('Phase 5', '5.11 Monetization Desk', 'FAIL', { message: e.message });
    }

    // 5.12 Global Taxonomy Engine
    try {
        await page.goto(`${PROD_URL}/admin/settings?tab=taxonomy`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const taxonomyLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.12 Taxonomy Engine Load', taxonomyLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Taxonomy Engine');
    } catch (e) {
        collector.recordResult('Phase 5', '5.12 Taxonomy Engine', 'FAIL', { message: e.message });
    }

    // 5.13 System Settings & Maintenance Controls
    try {
        await page.goto(`${PROD_URL}/admin/settings`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const settingsLoaded = await page.$('main') !== null;
        collector.recordResult('Phase 5', '5.13 System Settings Load', settingsLoaded ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'System Settings');
    } catch (e) {
        collector.recordResult('Phase 5', '5.13 System Settings', 'FAIL', { message: e.message });
    }

    console.log(`\n  PHASE 5 COMPLETE.\n`);
}

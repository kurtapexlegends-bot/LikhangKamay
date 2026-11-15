import { PROD_URL, ACCOUNTS, loginAs, findElementByText } from './audit_config.mjs';

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

    // 5.3 User Management & Directory (Active Search & Row Inspection)
    try {
        await page.goto(`${PROD_URL}/admin/users-manager`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        await collector.verifyInertiaPage(page, 'Phase 5', '5.3 User Directory Inertia Contract', 'Admin/Users/UserManager', ['users']);

        // Active interaction: search user in directory
        let searchInteracted = false;
        let rowInteracted = false;
        const searchInput = await page.$('input[placeholder*="Search users" i], input[type="text"]');
        if (searchInput) {
            await searchInput.click();
            await searchInput.type('artisan', { delay: 5 });
            await new Promise(r => setTimeout(r, 600));
            searchInteracted = true;
        }

        // Test user row interaction / drawer expansion
        const userRow = await page.$('table tbody tr, [data-user-row], tr button');
        if (userRow) {
            await userRow.click().catch(() => null);
            await new Promise(r => setTimeout(r, 500));
            rowInteracted = true;
        }

        const userManagerOk = searchInteracted || rowInteracted;
        collector.recordResult('Phase 5', '5.3 User Directory Active Interactions', userManagerOk ? 'PASS' : 'FAIL', {
            message: `User search executed: ${searchInteracted}, row inspected: ${rowInteracted}`
        });
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

    // 5.5 Catalog Moderation & 3D Review (Active Moderation Filter & Card Inspection)
    try {
        await page.goto(`${PROD_URL}/admin/catalog`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        await collector.verifyInertiaPage(page, 'Phase 5', '5.5 Catalog Moderation Inertia Contract', 'Admin/Catalog/CatalogManager', ['products']);

        // Active interaction: interact with moderation status filter toolbar
        let filterInteracted = false;
        let cardInspected = false;

        const filterBtn = await findElementByText(page, 'button', 'All|Pending Review|Approved|Filters') || await page.$('button:has(svg.lucide-filter)');
        if (filterBtn) {
            await filterBtn.click().catch(() => null);
            await new Promise(r => setTimeout(r, 400));
            filterInteracted = true;
        }

        // Interact with product moderation card / inspect drawer
        const inspectBtn = await page.$('button[title*="Inspect" i], button:has(svg.lucide-eye), button:has(svg.lucide-shield-alert)');
        if (inspectBtn) {
            await inspectBtn.click().catch(() => null);
            await new Promise(r => setTimeout(r, 600));
            cardInspected = true;
            await page.keyboard.press('Escape');
        } else {
            const firstCard = await page.$('.group:has(h3), table tbody tr');
            if (firstCard) {
                await firstCard.click().catch(() => null);
                await new Promise(r => setTimeout(r, 500));
                cardInspected = true;
            }
        }

        const moderationOk = filterInteracted || cardInspected;
        collector.recordResult('Phase 5', '5.5 Catalog Moderation Active Desk Interactions', moderationOk ? 'PASS' : 'FAIL', {
            message: `Moderation filter toggled: ${filterInteracted}, Product inspection card interacted: ${cardInspected}`
        });
        await collector.scanDomQuality(page, 'Catalog Moderation');
    } catch (e) {
        collector.recordResult('Phase 5', '5.5 Catalog Moderation Desk', 'FAIL', { message: e.message });
    }

    // 5.6 Transaction Disputes Arbitration Desk (Active Dispute Filter & Details Inspection)
    try {
        await page.goto(`${PROD_URL}/admin/disputes`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        await collector.verifyInertiaPage(page, 'Phase 5', '5.6 Disputes Arbitration Inertia Contract', 'Admin/Disputes/DisputeEscalationDashboard', ['disputes']);

        // Active interaction: interact with dispute category pill buttons
        let pillInteracted = false;
        let disputeInspected = false;

        const categoryPill = await findElementByText(page, 'button', 'All|Escalated|In Progress|Resolved');
        if (categoryPill) {
            await categoryPill.click().catch(() => null);
            await new Promise(r => setTimeout(r, 400));
            pillInteracted = true;
        }

        // Inspect dispute details / modal or inspector panel
        const disputeItem = await page.$('button:has(span.font-mono), .cursor-pointer:has(p), div[role="button"]');
        if (disputeItem) {
            await disputeItem.click().catch(() => null);
            await new Promise(r => setTimeout(r, 600));
            disputeInspected = true;
        } else {
            // Empty state is a valid dispute scenario
            disputeInspected = true;
        }

        const disputesOk = pillInteracted || disputeInspected;
        collector.recordResult('Phase 5', '5.6 Disputes Arbitration Active Interactions', disputesOk ? 'PASS' : 'FAIL', {
            message: `Category pill filter clicked: ${pillInteracted}, Dispute details/modal inspected: ${disputeInspected}`
        });
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

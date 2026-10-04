import { PROD_URL, ACCOUNTS, loginAs, findElementByText } from './audit_config.mjs';

export async function runPhase2(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 2: Registered Buyer Experience`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 2 - Buyer');

    // 2.1 Buyer Login
    try {
        const loggedIn = await loginAs(page, ACCOUNTS.buyer.email, ACCOUNTS.buyer.password);
        collector.recordResult('Phase 2', '2.1 Buyer Authentication', loggedIn ? 'PASS' : 'FAIL', {
            message: `URL: ${page.url()}`
        });
        if (!loggedIn) {
            collector.recordBug('HIGH', 'Buyer Login Failed in Production', `${PROD_URL}/login`, 'Buyer credentials rejected', 'Check buyer account state.');
            return;
        }
    } catch (e) {
        collector.recordResult('Phase 2', '2.1 Buyer Authentication', 'FAIL', { message: e.message });
        return;
    }

    // 2.2 Cart Operations
    try {
        await page.goto(`${PROD_URL}/cart`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const cartContainer = await page.$('main');
        collector.recordResult('Phase 2', '2.2 Cart Page Load', cartContainer ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Cart Page');

        const emptyState = await page.evaluate(() => {
            return !!document.body.innerText.match(/(cart is empty|your cart is empty|no items)/i);
        });
        collector.recordResult('Phase 2', '2.2 Cart State Inspection', 'PASS', {
            message: emptyState ? 'Cart is currently empty' : 'Items present in cart'
        });

        // Quantity manipulation button check
        const qtyButton = await page.$('button[aria-label*="increase" i], button[aria-label*="plus" i]');
        if (qtyButton) {
            collector.recordResult('Phase 2', '2.2 Cart Quantity Adjustment Present', 'PASS');
        }
    } catch (e) {
        collector.recordResult('Phase 2', '2.2 Cart Operations', 'FAIL', { message: e.message });
    }

    // 2.3 Address Book in Profile
    try {
        await page.goto(`${PROD_URL}/profile`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const addressSection = await page.evaluate(() => {
            return !!document.body.innerText.match(/(Address|Delivery Address|Address Book)/i);
        });
        collector.recordResult('Phase 2', '2.3 Profile & Address Book Load', addressSection ? 'PASS' : 'WARN', {
            message: `Address section detected: ${addressSection}`
        });

        const addAddressBtn = await findElementByText(page, 'button', 'Add Address|New Address');
        if (addAddressBtn) {
            collector.recordResult('Phase 2', '2.3 Add Address Action Present', 'PASS');
        }
        await collector.scanDomQuality(page, 'Buyer Profile');
    } catch (e) {
        collector.recordResult('Phase 2', '2.3 Profile & Address Book', 'FAIL', { message: e.message });
    }

    // 2.4 Checkout Navigation Guard
    try {
        await page.goto(`${PROD_URL}/checkout`, { waitUntil: 'networkidle2', timeout: 30000 });
        const currentUrl = page.url();
        const onCheckoutOrRedirect = currentUrl.includes('/checkout') || currentUrl.includes('/cart') || currentUrl.includes('/shop');
        collector.recordResult('Phase 2', '2.4 Checkout Navigation Guard', onCheckoutOrRedirect ? 'PASS' : 'FAIL', {
            message: `Checkout navigated to: ${currentUrl}`
        });
        if (currentUrl.includes('/checkout')) {
            await collector.scanDomQuality(page, 'Checkout Page');
        }
    } catch (e) {
        collector.recordResult('Phase 2', '2.4 Checkout Navigation', 'FAIL', { message: e.message });
    }

    // 2.5 My Orders Management
    try {
        await page.goto(`${PROD_URL}/my-orders`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const ordersTitle = await page.$('h1, h2, main');
        collector.recordResult('Phase 2', '2.5 My Orders Page Load', ordersTitle ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'My Orders');

        const tabs = await page.$$('button[role="tab"], [class*="tab"] button');
        if (tabs.length > 0) {
            collector.recordResult('Phase 2', '2.5 Order Status Tabs Rendered', 'PASS', {
                message: `Found ${tabs.length} filter tabs`
            });
            await tabs[Math.min(1, tabs.length - 1)].click().catch(() => null);
            await new Promise(r => setTimeout(r, 800));
        }

        const receiptLink = await page.$('a[href*="/receipt"]');
        if (receiptLink) {
            collector.recordResult('Phase 2', '2.5 Order Receipt Action Present', 'PASS');
        }
    } catch (e) {
        collector.recordResult('Phase 2', '2.5 My Orders Page', 'FAIL', { message: e.message });
    }

    // 2.6 Saved Wishlist Items
    try {
        await page.goto(`${PROD_URL}/saved`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const savedContainer = await page.$('main');
        collector.recordResult('Phase 2', '2.6 Saved Wishlist Page Load', savedContainer ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Saved Wishlist');
    } catch (e) {
        collector.recordResult('Phase 2', '2.6 Saved Wishlist', 'FAIL', { message: e.message });
    }

    // 2.7 Buyer Reviews Hub
    try {
        await page.goto(`${PROD_URL}/my-reviews`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const reviewsContainer = await page.$('main');
        collector.recordResult('Phase 2', '2.7 Buyer Reviews Page Load', reviewsContainer ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Buyer Reviews');
    } catch (e) {
        collector.recordResult('Phase 2', '2.7 Buyer Reviews', 'FAIL', { message: e.message });
    }

    // 2.8 Buyer Real-Time Chat
    try {
        await page.goto(`${PROD_URL}/buyer/chat`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const chatWindow = await page.$('main');
        collector.recordResult('Phase 2', '2.8 Buyer Chat Window Load', chatWindow ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Buyer Chat');

        const messageInput = await page.$('input[placeholder*="message" i], textarea[placeholder*="message" i]');
        if (messageInput) {
            collector.recordResult('Phase 2', '2.8 Chat Input Field Active', 'PASS');
        }
    } catch (e) {
        collector.recordResult('Phase 2', '2.8 Buyer Chat', 'FAIL', { message: e.message });
    }

    // 2.9 Notifications Center
    try {
        await page.goto(`${PROD_URL}/notifications`, { waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForSelector('main', { timeout: 10000 }).catch(() => null);
        const notifContainer = await page.$('main');
        collector.recordResult('Phase 2', '2.9 Notifications Page Load', notifContainer ? 'PASS' : 'FAIL');
        await collector.scanDomQuality(page, 'Notifications Page');

        const markAllBtn = await findElementByText(page, 'button', 'Mark all as read|Read all');
        if (markAllBtn) {
            collector.recordResult('Phase 2', '2.9 Mark All Read Button Present', 'PASS');
        }
    } catch (e) {
        collector.recordResult('Phase 2', '2.9 Notifications Page', 'FAIL', { message: e.message });
    }

    console.log(`\n  PHASE 2 COMPLETE.\n`);
}

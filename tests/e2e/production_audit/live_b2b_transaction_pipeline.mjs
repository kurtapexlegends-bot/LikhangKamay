import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer-core';
import { PROD_URL, ACCOUNTS, resolveBrowserExecutable, loginAs, getInertiaPage } from './audit_config.mjs';

const MANIFESTS_DIR = path.resolve('tests/e2e/production_audit/manifests');

export async function runLiveB2BTransactionPipeline() {
    console.log(`\n========================================================================`);
    console.log(`  LikhangKamay | Layer 5 B2B Supply Hub Multi-Artisan Transaction Relay`);
    console.log(`  Target Host: ${PROD_URL}`);
    console.log(`  Timestamp:   ${new Date().toISOString()}`);
    console.log(`========================================================================\n`);

    if (!fs.existsSync(MANIFESTS_DIR)) {
        fs.mkdirSync(MANIFESTS_DIR, { recursive: true });
    }

    const isHeaded = process.argv.includes('--headed') || process.env.HEADED === '1';

    const browser = await puppeteer.launch({
        executablePath: resolveBrowserExecutable(),
        headless: isHeaded ? false : 'new',
        slowMo: isHeaded ? 60 : 0,
        defaultViewport: isHeaded ? { width: 1366, height: 850 } : null,
        args: [
            ...(isHeaded ? ['--start-maximized', '--disable-infobars'] : []),
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,900',
        ],
    });

    const pipelineState = {
        runId: `pow-b2b-${crypto.randomUUID()}`,
        startedAt: new Date().toISOString(),
        orderId: null,
        orderNumber: null,
        targetMaterialId: null,
        targetMaterialName: null,
        targetMaterialSku: 'B2B-CLAY-62',
        orderQuantity: 1,
        stockBefore: 0,
        stockAfter: 0,
        stockIncremented: false,
        invoiceUrl: null,
        invoiceSha256: null,
        stages: []
    };

    const logStage = (stageName, status, details = {}) => {
        const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
        console.log(`  ${icon} [${stageName}] ${details.message || ''}`);
        pipelineState.stages.push({ stageName, status, timestamp: new Date().toISOString(), ...details });
    };

    try {
        // ====================================================================
        // STAGE 1: Buyer Artisan Authentication & Studio Inventory Snapshot
        // ====================================================================
        console.log('\n--- Stage 1: Buyer Artisan Authentication & Studio Inventory Snapshot ---');
        const buyerContext = await browser.createBrowserContext();
        const buyerPage = await buyerContext.newPage();
        await buyerPage.setViewport({ width: 1280, height: 900 });

        const buyerLoginOk = await loginAs(
            buyerPage,
            ACCOUNTS.buyerArtisan.email,
            ACCOUNTS.buyerArtisan.password
        );
        if (!buyerLoginOk) {
            throw new Error(`Buyer artisan authentication failed for ${ACCOUNTS.buyerArtisan.email}`);
        }
        logStage('1. Buyer Artisan Auth', 'PASS', { message: `Authenticated as ${ACCOUNTS.buyerArtisan.email}` });

        // Record initial studio inventory stock for the target material on /procurement
        await buyerPage.goto(`${PROD_URL}/procurement`, { waitUntil: 'networkidle2', timeout: 35000 });
        const procurementInertia = await getInertiaPage(buyerPage);
        const existingSupplies = procurementInertia?.props?.supplies || [];
        const existingSupplyItem = existingSupplies.find(s => 
            (s.name && s.name.toLowerCase().includes('terracotta clay')) || 
            (s.sku && s.sku.includes('B2B-CLAY'))
        );
        pipelineState.stockBefore = existingSupplyItem ? Number(existingSupplyItem.quantity || 0) : 0;
        logStage('1. Initial Studio Inventory Probe', 'PASS', {
            message: `Studio supply stock before B2B order: ${pipelineState.stockBefore} units`
        });

        // ====================================================================
        // STAGE 2: Sourcing Hub Catalog Discovery & Cart Operations
        // ====================================================================
        console.log('\n--- Stage 2: Sourcing Hub Catalog Discovery & Cart Operations ---');
        await buyerPage.goto(`${PROD_URL}/supply-hub`, { waitUntil: 'networkidle2', timeout: 35000 });
        let hubInertia = await getInertiaPage(buyerPage);
        let hubSupplies = hubInertia?.props?.supplies?.data || hubInertia?.props?.supplies || [];

        let targetMaterial = hubSupplies.find(p => 
            p.sku === pipelineState.targetMaterialSku || 
            (p.sku && p.sku.includes('B2B-CLAY')) ||
            (p.name && p.name.toLowerCase().includes('terracotta clay')) ||
            p.is_b2b_supply
        );
        if (!targetMaterial) {
            await buyerPage.goto(`${PROD_URL}/supply-hub?search=B2B-CLAY`, { waitUntil: 'networkidle2', timeout: 35000 });
            hubInertia = await getInertiaPage(buyerPage);
            hubSupplies = hubInertia?.props?.supplies?.data || hubInertia?.props?.supplies || [];
            targetMaterial = hubSupplies.find(p => 
                p.sku === pipelineState.targetMaterialSku || 
                (p.sku && p.sku.includes('B2B-CLAY')) ||
                (p.name && p.name.toLowerCase().includes('terracotta clay')) ||
                p.is_b2b_supply
            ) || hubSupplies[0];
        }

        if (!targetMaterial) {
            throw new Error('No available B2B raw material found in peer studio supply hub catalog.');
        }

        pipelineState.targetMaterialId = targetMaterial.id;
        pipelineState.targetMaterialName = targetMaterial.name;
        pipelineState.targetMaterialSku = targetMaterial.sku || pipelineState.targetMaterialSku;
        const moq = Math.max(Number(targetMaterial.moq) || 1, 1);
        pipelineState.orderQuantity = moq;

        logStage('2. Sourcing Catalog Probe', 'PASS', {
            message: `Found material: "${targetMaterial.name}" (ID: ${targetMaterial.id}, Price: ₱${targetMaterial.price}, MOQ: ${moq})`
        });

        // Add raw material to sourcing cart with required MOQ
        const addCartResult = await buyerPage.evaluate(async (url, prodId, qty) => {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            try {
                const res = await fetch(`${url}/cart/add`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify({ product_id: prodId, quantity: qty })
                });
                const data = await res.json().catch(() => ({}));
                return { status: res.status, data };
            } catch (err) {
                return { status: 0, error: err.message };
            }
        }, PROD_URL, targetMaterial.id, pipelineState.orderQuantity);

        if (![200, 302].includes(addCartResult.status)) {
            throw new Error(`Failed to add B2B material to cart with HTTP ${addCartResult.status}: ${JSON.stringify(addCartResult.data || {})}`);
        }

        // Navigate to /supply-hub/cart and verify cart state
        await buyerPage.goto(`${PROD_URL}/supply-hub/cart`, { waitUntil: 'networkidle2', timeout: 35000 });
        const cartInertia = await getInertiaPage(buyerPage);
        const cartObj = cartInertia?.props?.cart || {};
        const hasItemInCart = Object.keys(cartObj).length > 0;
        if (!hasItemInCart) {
            throw new Error('Material sourcing cart is empty after adding item.');
        }
        logStage('2. Sourcing Cart Verified', 'PASS', { message: `Cart contains procurement item(s)` });

        // ====================================================================
        // STAGE 3: Material Procurement Checkout & Order Placement
        // ====================================================================
        console.log('\n--- Stage 3: Material Procurement Checkout & Order Placement ---');
        await buyerPage.goto(`${PROD_URL}/supply-hub/checkout`, { waitUntil: 'networkidle2', timeout: 35000 });
        const checkoutInertia = await getInertiaPage(buyerPage);
        if (!checkoutInertia || checkoutInertia.component !== 'Seller/SupplyHub/ProcurementCheckout') {
            throw new Error(`Expected ProcurementCheckout component, got: ${checkoutInertia?.component}`);
        }

        // Select Cash on Delivery (COD) payment method by clicking its option label
        await buyerPage.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('label'));
            const codLabel = labels.find(l => (l.innerText || '').includes('Cash on Delivery'));
            if (codLabel) {
                codLabel.click();
            }
            const codRadio = document.querySelector('input[value="COD"]');
            if (codRadio) {
                codRadio.click();
                codRadio.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        await new Promise(r => setTimeout(r, 800));

        // Wait for shipping quote to settle and Place Order submit button to be enabled
        await buyerPage.waitForFunction(() => {
            const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
            const text = document.body.innerText || '';
            const isCalculating = text.includes('Calculating...');
            const visibleBtn = buttons.find(b => (b.offsetWidth > 0 || b.offsetHeight > 0 || b.getClientRects().length > 0));
            return visibleBtn && !visibleBtn.disabled && !visibleBtn.textContent.includes('Processing') && !isCalculating;
        }, { timeout: 30000 });

        await new Promise(r => setTimeout(r, 600));

        // Submit B2B procurement order
        const submitButtonHandle = await buyerPage.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
            return buttons.find(b => (b.offsetWidth > 0 || b.offsetHeight > 0 || b.getClientRects().length > 0) && !b.disabled);
        });

        const submitButton = submitButtonHandle.asElement();
        if (!submitButton) {
            throw new Error('Enabled submit button (button[type="submit"]) not found on Procurement Checkout.');
        }

        await submitButton.click();

        // Wait for redirect to /supply-hub/orders
        try {
            await buyerPage.waitForFunction(() => {
                return window.location.pathname.includes('/supply-hub/orders');
            }, { timeout: 30000 });
        } catch (waitErr) {
            const pageText = await buyerPage.evaluate(() => document.body.innerText);
            throw new Error(`Inertia navigation to /supply-hub/orders failed after clicking Place Material Order: ${waitErr.message}. Page snippet: ${pageText.slice(0, 400)}`);
        }

        // Extract newly created B2B procurement order
        await buyerPage.goto(`${PROD_URL}/supply-hub/orders`, { waitUntil: 'networkidle2', timeout: 30000 });
        const ordersInertia = await getInertiaPage(buyerPage);
        const sourcingOrders = ordersInertia?.props?.orders?.data || ordersInertia?.props?.orders || [];
        const placedB2BOrder = sourcingOrders[0];

        if (!placedB2BOrder || !placedB2BOrder.order_number) {
            throw new Error('Newly placed B2B procurement order not found on /supply-hub/orders.');
        }

        pipelineState.orderId = placedB2BOrder.id;
        pipelineState.orderNumber = placedB2BOrder.order_number;

        logStage('3. Procurement Order Placed', 'PASS', {
            message: `Order #${pipelineState.orderNumber} (ID: ${pipelineState.orderId}) created successfully.`
        });

        await buyerContext.close();

        // ====================================================================
        // STAGE 4: Seller Artisan Order Acceptance & Wholesale Dispatch
        // ====================================================================
        console.log('\n--- Stage 4: Seller Artisan Order Acceptance & Wholesale Dispatch ---');
        const sellerContext = await browser.createBrowserContext();
        const sellerPage = await sellerContext.newPage();
        await sellerPage.setViewport({ width: 1280, height: 900 });

        const sellerLoginOk = await loginAs(
            sellerPage,
            ACCOUNTS.seller.email,
            ACCOUNTS.seller.password
        );
        if (!sellerLoginOk) {
            throw new Error(`Seller artisan authentication failed for ${ACCOUNTS.seller.email}`);
        }
        logStage('4. Seller Artisan Auth', 'PASS', { message: `Authenticated as ${ACCOUNTS.seller.email}` });

        // Navigate to /supply-hub/sales
        await sellerPage.goto(`${PROD_URL}/supply-hub/sales`, { waitUntil: 'networkidle2', timeout: 35000 });

        const clickWholesaleCardButton = async (page, ordIdentifier, btnText) => {
            return await page.evaluate((identifier, text) => {
                const allCards = Array.from(document.querySelectorAll('div.group'));
                const card = allCards.find(c => (c.innerText || '').includes(String(identifier)));
                if (!card) return false;
                const buttons = Array.from(card.querySelectorAll('button'));
                const btn = buttons.find(b => (b.innerText || '').trim().includes(text) && !b.disabled);
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }, ordIdentifier, btnText);
        };

        const clickModalButton = async (page, btnText) => {
            return await page.evaluate((text) => {
                const modalContainers = Array.from(document.querySelectorAll('div[role="dialog"], div[aria-modal="true"], div.fixed.inset-0'));
                let buttons = [];
                for (const modal of modalContainers) {
                    buttons.push(...Array.from(modal.querySelectorAll('button')));
                }
                if (buttons.length === 0) {
                    buttons = Array.from(document.querySelectorAll('button'));
                }
                const btn = buttons.find(b => (b.innerText || '').trim().includes(text) && !b.disabled);
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }, btnText);
        };

        // 1. Accept Wholesale Order via DOM button & modal
        let acceptClicked = await clickWholesaleCardButton(sellerPage, pipelineState.orderNumber || pipelineState.orderId, 'Accept');
        let acceptViaDOM = false;
        if (acceptClicked) {
            await new Promise(r => setTimeout(r, 800));
            acceptViaDOM = await clickModalButton(sellerPage, 'Confirm Accepted');
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!acceptViaDOM) {
            const acceptResult = await sellerPage.evaluate(async (url, ordId) => {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const res = await fetch(`${url}/supply-hub/sales/${ordId}/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify({ status: 'Accepted' })
                });
                return { status: res.status };
            }, PROD_URL, pipelineState.orderId);

            if (![200, 302].includes(acceptResult.status)) {
                throw new Error(`Wholesale order acceptance failed with HTTP ${acceptResult.status}`);
            }
        }

        // Reload to refresh order card state
        await sellerPage.goto(`${PROD_URL}/supply-hub/sales`, { waitUntil: 'networkidle2', timeout: 35000 });

        // 2. Mark Wholesale Order as Dispatched via DOM Dispatch Order Modal
        let shipClicked = await clickWholesaleCardButton(sellerPage, pipelineState.orderNumber || pipelineState.orderId, 'Mark Dispatched');
        let shipViaDOM = false;
        if (shipClicked) {
            await new Promise(r => setTimeout(r, 1200));
            // Select driver card in DispatchOrderModal
            await sellerPage.evaluate(() => {
                const driverCards = Array.from(document.querySelectorAll('div[role="button"]'));
                const targetCard = driverCards.find(c => c.innerText?.includes('Logistics Rider') || c.innerText?.includes('Motorcycle'));
                if (targetCard) targetCard.click();
            });
            await new Promise(r => setTimeout(r, 600));
            shipViaDOM = await clickModalButton(sellerPage, 'Confirm Studio Dispatch');
            await new Promise(r => setTimeout(r, 2500));
        }

        if (!shipViaDOM) {
            // Direct in-house dispatch fallback using driver employee ID 4
            const shipResult = await sellerPage.evaluate(async (url, ordNum) => {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const res = await fetch(`${url}/orders/${ordNum}/dispatch-in-house`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify({
                        employee_id: 4,
                        dispatch_notes: 'B2B Wholesale Studio Fleet Delivery'
                    })
                });
                return { status: res.status };
            }, PROD_URL, pipelineState.orderNumber);

            if (![200, 302].includes(shipResult.status)) {
                throw new Error(`Wholesale order dispatch failed with HTTP ${shipResult.status}`);
            }
        }

        // Reload to refresh order card state
        await sellerPage.goto(`${PROD_URL}/supply-hub/sales`, { waitUntil: 'networkidle2', timeout: 35000 });

        // 3. Mark Wholesale Order as Delivered via DOM button & modal
        let deliverClicked = await clickWholesaleCardButton(sellerPage, pipelineState.orderNumber || pipelineState.orderId, 'Mark Delivered');
        let deliverViaDOM = false;
        if (deliverClicked) {
            await new Promise(r => setTimeout(r, 800));
            deliverViaDOM = await clickModalButton(sellerPage, 'Confirm Delivered');
            await new Promise(r => setTimeout(r, 2000));
        }

        if (!deliverViaDOM) {
            const deliverResult = await sellerPage.evaluate(async (url, ordId) => {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const res = await fetch(`${url}/supply-hub/sales/${ordId}/status`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    },
                    body: JSON.stringify({
                        status: 'Delivered',
                        tracking_number: 'B2B-EXP-001',
                        shipping_notes: 'Direct workshop delivery completed.'
                    })
                });
                return { status: res.status };
            }, PROD_URL, pipelineState.orderNumber || pipelineState.orderId);

            if (![200, 302].includes(deliverResult.status)) {
                throw new Error(`Wholesale order deliver failed with HTTP ${deliverResult.status}`);
            }
        }

        logStage('4. Wholesale Order Dispatched', 'PASS', {
            message: `Order #${pipelineState.orderNumber} accepted, shipped, and marked Delivered by seller. [DOM Interactive: ${deliverViaDOM ? 'YES' : 'API Fallback'}]`
        });

        await sellerContext.close();

        // ====================================================================
        // STAGE 5: Buyer Delivery Confirmation & Raw Material Stock Restock
        // ====================================================================
        console.log('\n--- Stage 5: Buyer Delivery Confirmation & Studio Inventory Restock ---');
        const buyerVerifyContext = await browser.createBrowserContext();
        const buyerVerifyPage = await buyerVerifyContext.newPage();
        await buyerVerifyPage.setViewport({ width: 1280, height: 900 });

        await loginAs(
            buyerVerifyPage,
            ACCOUNTS.buyerArtisan.email,
            ACCOUNTS.buyerArtisan.password
        );

        // Navigate to /supply-hub/orders
        await buyerVerifyPage.goto(`${PROD_URL}/supply-hub/orders`, { waitUntil: 'networkidle2', timeout: 35000 });

        // Click Confirm Delivery via DOM button & modal
        let buyerConfirmClicked = await clickWholesaleCardButton(buyerVerifyPage, pipelineState.orderNumber || pipelineState.orderId, 'Confirm Delivery');
        let buyerConfirmViaDOM = false;
        if (buyerConfirmClicked) {
            await new Promise(r => setTimeout(r, 800));
            buyerConfirmViaDOM = await clickModalButton(buyerVerifyPage, 'Confirm & Restock Studio');
            
            // Wait for Inertia request to settle and status to transition to Completed
            try {
                await buyerVerifyPage.waitForFunction((ordNum) => {
                    const text = document.body.innerText || '';
                    return text.includes(ordNum) && (text.includes('Synced to Inventory') || text.includes('Completed'));
                }, { timeout: 15000 }, pipelineState.orderNumber);
            } catch {
                // If toast/live DOM update didn't trigger within 15s, reload once
                await buyerVerifyPage.goto(`${PROD_URL}/supply-hub/orders`, { waitUntil: 'networkidle2', timeout: 35000 });
            }
        }

        if (!buyerConfirmViaDOM) {
            const confirmResult = await buyerVerifyPage.evaluate(async (url, ordId) => {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const res = await fetch(`${url}/supply-hub/orders/${ordId}/confirm-delivery`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || ''
                    }
                });
                return { status: res.status };
            }, PROD_URL, pipelineState.orderId);

            if (![200, 302].includes(confirmResult.status)) {
                throw new Error(`Confirm Delivery failed with HTTP ${confirmResult.status}`);
            }
            await new Promise(r => setTimeout(r, 3000));
        }

        // Reload /supply-hub/orders to verify status is Completed
        await buyerVerifyPage.goto(`${PROD_URL}/supply-hub/orders`, { waitUntil: 'networkidle2', timeout: 35000 });
        const finalOrdersInertia = await getInertiaPage(buyerVerifyPage);
        const finalOrders = finalOrdersInertia?.props?.orders?.data || finalOrdersInertia?.props?.orders || [];
        const verifiedOrder = finalOrders.find(o => o.order_number === pipelineState.orderNumber || o.id === pipelineState.orderId);

        if (!verifiedOrder || verifiedOrder.status !== 'Completed') {
            throw new Error(`Order #${pipelineState.orderNumber} status is '${verifiedOrder?.status}', expected 'Completed'.`);
        }

        // Verify Studio Raw Material Inventory Stock Increment on /procurement
        await buyerVerifyPage.goto(`${PROD_URL}/procurement`, { waitUntil: 'networkidle2', timeout: 35000 });
        const finalProcurementInertia = await getInertiaPage(buyerVerifyPage);
        const finalSupplies = finalProcurementInertia?.props?.supplies || [];
        const restockedSupply = finalSupplies.find(s => 
            (s.name && s.name.toLowerCase().includes('terracotta clay')) || 
            (s.sku && s.sku.includes('B2B-CLAY'))
        );

        pipelineState.stockAfter = restockedSupply ? Number(restockedSupply.quantity || 0) : 0;
        pipelineState.stockIncremented = (pipelineState.stockAfter - pipelineState.stockBefore === pipelineState.orderQuantity);

        if (!pipelineState.stockIncremented) {
            throw new Error(`Studio supply stock increment verification failed: Before=${pipelineState.stockBefore}, After=${pipelineState.stockAfter}, Expected Increment=${pipelineState.orderQuantity}`);
        }

        // Fetch printable B2B Wholesale Purchase Order / Invoice
        const invoiceResult = await buyerVerifyPage.evaluate(async (url, ordId) => {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            try {
                const res = await fetch(`${url}/supply-hub/orders/${ordId}/invoice`, {
                    headers: { 'Accept': 'text/html,application/xhtml+xml', 'X-CSRF-TOKEN': csrfToken || '' }
                });
                const html = await res.text();
                return {
                    status: res.status,
                    hasInvoice: html.toUpperCase().includes('INVOICE') || html.toUpperCase().includes('RECEIPT'),
                    length: html.length,
                    html
                };
            } catch (err) {
                return { status: 0, error: err.message, html: '' };
            }
        }, PROD_URL, pipelineState.orderId);

        if (invoiceResult.status !== 200 || !invoiceResult.hasInvoice) {
            throw new Error(`B2B Invoice download failed with HTTP ${invoiceResult.status}`);
        }

        const invoiceHash = crypto.createHash('sha256').update(invoiceResult.html).digest('hex');
        pipelineState.invoiceUrl = `${PROD_URL}/supply-hub/orders/${pipelineState.orderId}/invoice`;
        pipelineState.invoiceSha256 = invoiceHash;

        logStage('5. Delivery Confirmed & Supply Stock Incremented', 'PASS', {
            message: `Order Completed. Studio Supply Stock: ${pipelineState.stockBefore} -> ${pipelineState.stockAfter} (+${pipelineState.orderQuantity} verified). B2B Invoice SHA-256: ${invoiceHash}`
        });

        await buyerVerifyContext.close();

    } finally {
        await browser.close();
    }

    // ====================================================================
    // STAGE 6: Layer 5 B2B Cryptographic Proof-of-Work Run Manifest Assembly
    // ====================================================================
    console.log('\n--- Stage 6: B2B Cryptographic Proof-of-Work Manifest Generation ---');
    const b2bManifest = {
        manifest_version: '5.0.0-PROD-B2B-POW',
        run_id: pipelineState.runId,
        timestamp: new Date().toISOString(),
        host: PROD_URL,
        protocol: 'Layer 5 Proof-of-Work Multi-Artisan B2B Supply Hub Relay',
        actors: {
            buyer_artisan: {
                email: ACCOUNTS.buyerArtisan.email,
                role: 'artisan',
                shop: 'Silang Terracotta Works',
                is_test: true,
                address: 'Bypass Road, Brgy. San Vicente 2, Silang, Cavite 4118'
            },
            seller_artisan: {
                email: ACCOUNTS.seller.email,
                role: 'artisan',
                shop: 'Cavite Test Craft Workshop',
                is_test: true
            }
        },
        transaction: {
            order_id: pipelineState.orderId,
            order_number: pipelineState.orderNumber,
            material_sku: pipelineState.targetMaterialSku,
            material_name: pipelineState.targetMaterialName,
            is_b2b_supply: true,
            is_test_flag: true,
            raw_material_stock_audit: {
                stock_before: pipelineState.stockBefore,
                stock_after: pipelineState.stockAfter,
                delta: pipelineState.orderQuantity,
                stock_increment_verified: pipelineState.stockIncremented
            }
        },
        final_state: {
            order_status: 'Completed',
            restock_synced: true,
            b2b_commercial_invoice: {
                url: pipelineState.invoiceUrl,
                sha256_hash: pipelineState.invoiceSha256
            }
        }
    };

    const manifestJsonString = JSON.stringify(b2bManifest, null, 2);
    const powSignature = crypto.createHash('sha256').update(manifestJsonString).digest('hex');
    b2bManifest.proof_of_work_signature = powSignature;

    const manifestFilename = `pow_b2b_${Date.now()}.json`;
    const manifestPath = path.join(MANIFESTS_DIR, manifestFilename);
    fs.writeFileSync(manifestPath, JSON.stringify(b2bManifest, null, 2));

    console.log(`\n========================================================================`);
    console.log(`  LAYER 5 B2B PROOF-OF-WORK RUN MANIFEST GENERATED`);
    console.log(`  File:      ${manifestPath}`);
    console.log(`  Signature: ${powSignature}`);
    console.log(`========================================================================\n`);

    return b2bManifest;
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('live_b2b_transaction_pipeline.mjs')) {
    runLiveB2BTransactionPipeline()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error('\n❌ Live B2B Transaction Pipeline Execution Failed:', err);
            process.exit(1);
        });
}

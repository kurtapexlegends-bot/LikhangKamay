import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const defaultArtifactsDir = 'C:\\Users\\acost\\.gemini\\antigravity\\brain\\12ddd79e-71a2-4840-a7a1-349765705189';

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

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = {
        routes: ['/admin/overview'],
        outDir: defaultArtifactsDir,
        role: 'super_admin',
        width: 1440,
        height: 900,
        clickText: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        let key = arg;
        let value = '';

        if (arg.includes('=')) {
            const splitIndex = arg.indexOf('=');
            key = arg.substring(0, splitIndex);
            value = arg.substring(splitIndex + 1);
        } else if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
            value = args[++i];
        }

        if (key === '--route' && value) {
            parsed.routes = [value];
        } else if (key === '--routes' && value) {
            parsed.routes = value.split(',');
        } else if (key === '--outDir' && value) {
            parsed.outDir = value;
        } else if (key === '--role' && value) {
            parsed.role = value;
        } else if (key === '--width' && value) {
            parsed.width = parseInt(value, 10);
        } else if (key === '--height' && value) {
            parsed.height = parseInt(value, 10);
        } else if (key === '--clickSelector' && value) {
            parsed.clickSelector = value;
        } else if (key === '--clickText' && value) {
            parsed.clickText = value;
        } else if (key === '--fillSelector' && value) {
            parsed.fillSelector = value;
        } else if (key === '--fillValue' && value) {
            parsed.fillValue = value;
        } else if (key === '--filename' && value) {
            parsed.filename = value;
        }
    }
    return parsed;
}

async function capture() {
    const { routes, outDir, role, width, height, clickSelector, clickText, fillSelector, fillValue, filename: customFilename } = parseArgs();
    const chromePath = getBrowserExecutable();

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--hide-scrollbars'],
        defaultViewport: { width, height }
    });

    const page = await browser.newPage();
    page.on('console', msg => console.log(`[PAGE LOG ${msg.type()}]:`, msg.text()));
    page.on('pageerror', err => console.log('[PAGE ERROR]:', err.message));

    const results = [];

    for (const targetRoute of routes) {
        const cleanName = targetRoute.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'home';
        const filename = customFilename || `preview_${cleanName}.png`;
        const destPath = path.join(outDir, filename);

        const authUrl = `http://127.0.0.1:8000/dev/preview-auth?role=${encodeURIComponent(role)}&redirect=${encodeURIComponent(targetRoute)}`;
        console.log(`[Remote Preview] Establishing session as ${role}...`);
        await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });
        console.log('[Remote Preview] Current URL:', page.url());
        console.log('[Remote Preview] Page Title:', await page.title());

        console.log(`[Remote Preview] Waiting for content on ${targetRoute}...`);
        try {
            await page.waitForSelector('#app, .header, .receipt-title', { timeout: 10000 });
        } catch {
            console.log('[Remote Preview] selector wait timed out');
        }
        await new Promise(r => setTimeout(r, 2000));

        if (fillSelector && fillValue) {
            try {
                await page.waitForSelector(fillSelector, { timeout: 5000 });
                await page.type(fillSelector, fillValue, { delay: 10 });
                await new Promise(r => setTimeout(r, 500));
            } catch (e) {
                console.log('[Remote Preview] fill notice:', e.message);
            }
        }

        if (clickText) {
            const texts = clickText.split('||');
            for (const t of texts) {
                const targetText = t.trim();
                if (!targetText) continue;
                try {
                    await page.evaluate((txt) => {
                        const buttons = Array.from(document.querySelectorAll('button, a'));
                        const targetBtn = buttons.find(b => b.textContent && b.textContent.toLowerCase().includes(txt.toLowerCase()));
                        if (targetBtn) {
                            targetBtn.click();
                        } else {
                            const allEls = Array.from(document.querySelectorAll('*'));
                            const leafEl = allEls.find(el => el.children.length === 0 && el.textContent && el.textContent.toLowerCase().includes(txt.toLowerCase()));
                            if (leafEl) (leafEl.closest('button, a') || leafEl).click();
                        }
                    }, targetText);
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    console.log(`[Remote Preview] clickText (${targetText}) notice:`, e.message);
                }
            }
        } else if (!clickSelector && (targetRoute === '/my-orders' || targetRoute.startsWith('/my-orders?'))) {
            try {
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const toReceiveBtn = buttons.find(b => b.textContent && b.textContent.includes('To Receive'));
                    if (toReceiveBtn) {
                        toReceiveBtn.click();
                    }
                });
                await new Promise(r => setTimeout(r, 2500));
            } catch (e) {
                console.log('[Remote Preview] Tab click notice:', e.message);
            }
        }

        if (clickSelector) {
            const selectors = clickSelector.split('||');
            for (const sel of selectors) {
                const s = sel.trim();
                if (!s) continue;
                try {
                    await page.waitForSelector(s, { timeout: 5000 });
                    await page.evaluate((selector) => {
                        const els = Array.from(document.querySelectorAll(selector));
                        const visible = els.find(el => el.offsetParent !== null) || els[0];
                        if (visible) {
                            visible.click();
                        }
                    }, s);
                    await new Promise(r => setTimeout(r, 1500));
                } catch (e) {
                    console.log(`[Remote Preview] clickSelector (${s}) notice:`, e.message);
                }
            }
        }

        if (targetRoute.includes('/cart')) {
            try {
                await page.evaluate(() => {
                    localStorage.setItem('lk_cart_backup', JSON.stringify({
                        items: [
                            {
                                id: 'backup-item-1',
                                product_id: 1,
                                name: 'Handmade Terracotta Planter',
                                price: 450,
                                quantity: 2,
                                variant: 'Standard Natural',
                                image: '/images/products/planter.jpg'
                            }
                        ],
                        savedAt: Date.now()
                    }));
                });
                await page.reload({ waitUntil: 'networkidle2' });
                await new Promise(r => setTimeout(r, 1500));
            } catch (e) {
                console.log('[Remote Preview] Cart backup simulation notice:', e.message);
            }
        }

        await page.screenshot({ path: destPath, fullPage: false });
        console.log(`[Remote Preview] Saved: ${destPath}`);
        results.push({ route: targetRoute, file: destPath, filename });
    }

    await browser.close();
    console.log(JSON.stringify({ success: true, count: results.length, captures: results }));
}

capture().catch(err => {
    console.error('[Remote Preview Error]:', err.message);
    process.exit(1);
});

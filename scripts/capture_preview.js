import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const defaultArtifactsDir = 'C:\\Users\\acost\\.gemini\\antigravity\\brain\\0736364b-906e-4032-9429-02496b0528ad';

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
        height: 900
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
        }
    }
    return parsed;
}

async function capture() {
    const { routes, outDir, role, width, height } = parseArgs();
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
    const results = [];

    for (const targetRoute of routes) {
        const cleanName = targetRoute.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'home';
        const filename = `preview_${cleanName}.png`;
        const destPath = path.join(outDir, filename);

        const authUrl = `http://127.0.0.1:8000/dev/preview-auth?role=${encodeURIComponent(role)}&redirect=${encodeURIComponent(targetRoute)}`;
        console.log(`[Remote Preview] Establishing session as ${role}...`);
        await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        const fullTarget = targetRoute.startsWith('http') ? targetRoute : `http://127.0.0.1:8000${targetRoute}`;
        console.log(`[Remote Preview] Navigating directly to ${fullTarget}...`);
        await page.goto(fullTarget, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 2500));

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

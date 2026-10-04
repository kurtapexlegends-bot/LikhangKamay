import puppeteer from 'puppeteer-core';
import { resolveBrowserExecutable, PROD_URL, ACCOUNTS, loginAs } from './audit_config.mjs';

async function checkMigrate() {
    const browser = await puppeteer.launch({
        executablePath: resolveBrowserExecutable(),
        headless: 'new',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    console.log('Logging in as super admin...');
    const loggedIn = await loginAs(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    console.log('Logged in:', loggedIn);
    
    if (loggedIn) {
        console.log('Navigating to /webhooks/migrate as super admin...');
        await page.goto(`${PROD_URL}/webhooks/migrate`, { waitUntil: 'networkidle2' });
        const text = await page.evaluate(() => document.body.innerText);
        console.log('Migration endpoint response:', text);
    }
    await browser.close();
}

checkMigrate().catch(console.error);

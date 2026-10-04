import puppeteer from 'puppeteer-core';
import { resolveBrowserExecutable, PROD_URL, ACCOUNTS } from './audit_config.mjs';

async function test() {
    const browser = await puppeteer.launch({
        executablePath: resolveBrowserExecutable(),
        headless: 'new',
        args: ['--no-sandbox']
    });
    const page = await browser.newPage();
    console.log('Navigating to', `${PROD_URL}/login`);
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle2' });
    console.log('Waiting for selector input#email...');
    await page.waitForSelector('input#email', { timeout: 10000 });
    
    // Type credentials
    await page.type('input#email', ACCOUNTS.seller.email);
    await page.type('input#password', ACCOUNTS.seller.password);
    console.log('Credentials typed, pressing Enter on password field...');
    await page.keyboard.press('Enter');
    
    console.log('Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    console.log('URL after login:', page.url());
    
    await browser.close();
}

test().catch(console.error);

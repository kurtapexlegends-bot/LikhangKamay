import puppeteer from 'puppeteer-core';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
    const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('response', response => {
        if (response.status() >= 300 && response.status() <= 399) {
            console.log(`REDIRECT ${response.status()} from ${response.url()} to ${response.headers()['location']}`);
        }
    });

    console.log('1. Hitting dev auth...');
    await page.goto('http://127.0.0.1:8000/dev/preview-auth?role=super_admin&redirect=/admin/users-manager?tab=approvals', { waitUntil: 'networkidle2' });
    console.log('Current URL after step 1:', page.url());

    const cookies = await page.cookies();
    console.log('Cookies in page:', cookies.map(c => c.name));

    console.log('2. Direct navigation to target...');
    await page.goto('http://127.0.0.1:8000/admin/users-manager?tab=approvals', { waitUntil: 'networkidle2' });
    console.log('Current URL after step 2:', page.url());

    await page.screenshot({ path: 'C:\\Users\\acost\\.gemini\\antigravity\\brain\\0736364b-906e-4032-9429-02496b0528ad\\debug_screen.png' });
    await browser.close();
}

test().catch(console.error);

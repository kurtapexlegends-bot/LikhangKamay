import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';

export const PROD_URL = 'https://www.likhangkamay.app';

export const ACCOUNTS = {
    seller: {
        email: process.env.E2E_SELLER_EMAIL || 'kurtapexlegends@gmail.com',
        password: process.env.E2E_SELLER_PASSWORD || 'password',
        role: 'artisan'
    },
    buyer: {
        email: process.env.E2E_BUYER_EMAIL || 'kurtstanleytalastas@gmail.com',
        password: process.env.E2E_BUYER_PASSWORD || 'password',
        role: 'buyer'
    },
    admin: {
        email: process.env.E2E_ADMIN_EMAIL || 'likhangkamaybusiness@gmail.com',
        password: process.env.E2E_ADMIN_PASSWORD || 'password',
        role: 'super_admin'
    }
};

const CHROME_PATHS = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

export function resolveBrowserExecutable() {
    for (const p of CHROME_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error('No compatible Chrome or Edge executable found.');
}

export async function loginAs(page, email, password, expectedPath = '') {
    await page.goto(`${PROD_URL}/login`, { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('input#email', { timeout: 15000 });
    await page.type('input#email', email);
    await page.type('input#password', password);
    await page.keyboard.press('Enter');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 25000 }).catch(() => null);
    await new Promise(r => setTimeout(r, 2000));
    const currentUrl = page.url();
    return !currentUrl.includes('/login');
}

export async function findElementByText(page, selector, textRegex) {
    try {
        const handle = await page.evaluateHandle((sel, pattern) => {
            const regex = new RegExp(pattern, 'i');
            const items = Array.from(document.querySelectorAll(sel));
            return items.find(el => regex.test(el.innerText || '')) || null;
        }, selector, textRegex);
        const element = handle.asElement();
        return element;
    } catch {
        return null;
    }
}

export class AuditCollector {
    constructor() {
        this.results = [];
        this.pageErrors = [];
        this.consoleErrors = [];
        this.httpErrors = [];
        this.panelistCritiques = [];
        this.bugs = [];
        this.startTime = Date.now();
    }

    recordResult(phase, testName, status, details = {}) {
        const item = {
            phase,
            testName,
            status, // 'PASS' | 'FAIL' | 'WARN'
            timestamp: new Date().toISOString(),
            ...details
        };
        this.results.push(item);
        const icon = status === 'PASS' ? '[PASS]' : status === 'FAIL' ? '[FAIL]' : '[WARN]';
        console.log(`  ${icon} [${phase}] ${testName} ${details.message ? '— ' + details.message : ''}`);
    }

    recordBug(severity, title, url, description, recommendation) {
        const bug = {
            id: `BUG-${this.bugs.length + 1}`,
            severity, // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
            title,
            url,
            description,
            recommendation,
            timestamp: new Date().toISOString()
        };
        this.bugs.push(bug);
        console.error(`  [BUG FOUND - ${severity}] ${title} (${url})`);
    }

    recordCritique(category, grade, critique, suggestion) {
        this.panelistCritiques.push({
            category,
            grade, // 'A' | 'B' | 'C' | 'D' | 'F'
            critique,
            suggestion
        });
    }

    attachListeners(page, phaseName) {
        page.on('pageerror', (err) => {
            const entry = {
                phase: phaseName,
                url: page.url(),
                message: err.message,
                stack: err.stack
            };
            this.pageErrors.push(entry);
            this.recordBug(
                'CRITICAL',
                `Unhandled React/Inertia Runtime Exception: ${err.message.slice(0, 80)}`,
                page.url(),
                `Page error thrown: ${err.message}\nStack: ${err.stack}`,
                'Inspect component state and ensure safe optional chaining on props.'
            );
        });

        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                const text = msg.text();
                // Filter benign network / analytics noise
                if (!text.includes('net::ERR_') && !text.includes('favicon.ico') && !text.includes('chrome-extension')) {
                    this.consoleErrors.push({
                        phase: phaseName,
                        url: page.url(),
                        text
                    });
                    if (text.includes('Cannot read properties') || text.includes('Uncaught') || text.includes('Invariant Violation')) {
                        this.recordBug(
                            'HIGH',
                            `Console React Crash: ${text.slice(0, 80)}`,
                            page.url(),
                            text,
                            'Fix React prop lifecycle or missing dependency.'
                        );
                    }
                }
            }
        });

        page.on('response', (res) => {
            const status = res.status();
            const url = res.url();
            // Don't flag intended 401s on unauth checks or 404s on optional assets
            if (status >= 400 && !url.includes('favicon.ico')) {
                const isInternal = url.includes('likhangkamay.app');
                if (isInternal) {
                    this.httpErrors.push({
                        phase: phaseName,
                        status,
                        method: res.request().method(),
                        url
                    });
                    if (status >= 500) {
                        this.recordBug(
                            'CRITICAL',
                            `Server Error HTTP ${status}: ${url}`,
                            url,
                            `Endpoint failed with HTTP ${status}`,
                            'Check Laravel server runtime logs and Postgres query constraints.'
                        );
                    }
                }
            }
        });
    }

    async scanDomQuality(page, pageName) {
        try {
            const qualityScan = await page.evaluate(() => {
                const textContent = document.body ? document.body.innerText : '';
                
                // Banned technical jargon patterns
                const jargonRegex = /(Geofence|Biometric 3D Liveness Calibration|OTP Code Fallback|Bill of Materials|Rollup Analytics|Arbitration Ruling Panel|NotAllowedError)/gi;
                const jargonMatches = textContent.match(jargonRegex) || [];

                // Decorative emoji regex (flags emojis in headings, buttons, alerts)
                const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
                const emojiMatches = [];
                const interactiveElements = document.querySelectorAll('button, a, h1, h2, h3, h4, th, .badge, .toast');
                interactiveElements.forEach((el) => {
                    const txt = el.innerText || '';
                    const m = txt.match(emojiRegex);
                    if (m) {
                        emojiMatches.push({ tag: el.tagName, text: txt.trim().slice(0, 50), emoji: m[0] });
                    }
                });

                // Anti-AI slop gradient check: scan cards and modals for rainbow/gradient borders
                const cards = document.querySelectorAll('.card, [class*="rounded-"], [class*="shadow-"], modal, [role="dialog"]');
                const gradientBorderElements = [];
                cards.forEach((el) => {
                    const style = window.getComputedStyle(el);
                    const bg = style.backgroundImage || '';
                    if (bg.includes('gradient') && (bg.includes('rainbow') || (bg.includes('255,') && bg.includes('rgb(')))) {
                        gradientBorderElements.push(el.className);
                    }
                });

                return {
                    jargonMatches: Array.from(new Set(jargonMatches)),
                    emojiMatches: emojiMatches.slice(0, 5),
                    gradientBorderElements: gradientBorderElements.slice(0, 5)
                };
            });

            if (qualityScan.jargonMatches.length > 0) {
                this.recordBug(
                    'MEDIUM',
                    `Engineering Jargon Detected on ${pageName}`,
                    page.url(),
                    `Found banned jargon: ${qualityScan.jargonMatches.join(', ')}`,
                    'Replace with plain-language standard equivalent.'
                );
            }

            if (qualityScan.emojiMatches.length > 0) {
                this.recordBug(
                    'LOW',
                    `Decorative Emojis Detected on ${pageName}`,
                    page.url(),
                    `Found ${qualityScan.emojiMatches.length} decorative emojis in UI elements: ${JSON.stringify(qualityScan.emojiMatches)}`,
                    'Replace decorative emojis with vector Lucide/Phosphor SVGs.'
                );
            }

            if (qualityScan.gradientBorderElements.length > 0) {
                this.recordBug(
                    'MEDIUM',
                    `Anti-AI Slop: Multi-color Gradient Borders on ${pageName}`,
                    page.url(),
                    `Detected gradient borders on cards/modals: ${qualityScan.gradientBorderElements.join(' | ')}`,
                    'Enforce solid earthy clay/stone design tokens.'
                );
            }
        } catch (e) {
            // Non-critical scan failure
        }
    }
}

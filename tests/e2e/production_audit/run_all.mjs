import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer-core';
import { resolveBrowserExecutable, AuditCollector, PROD_URL } from './audit_config.mjs';
import { runPhase1 } from './phase1_guest.mjs';
import { runPhase2 } from './phase2_buyer.mjs';
import { runPhase3 } from './phase3_seller.mjs';
import { runPhase4 } from './phase4_staff.mjs';
import { runPhase5 } from './phase5_admin.mjs';
import { runPhase6 } from './phase6_technical.mjs';

async function main() {
    console.log(`\n======================================================`);
    console.log(`  LikhangKamay | Production Master E2E Audit Suite`);
    console.log(`  Target: ${PROD_URL}`);
    console.log(`======================================================\n`);

    const collector = new AuditCollector();
    const chromeExecutable = resolveBrowserExecutable();
    console.log(`  Browser Engine: ${chromeExecutable}`);

    const browser = await puppeteer.launch({
        executablePath: chromeExecutable,
        headless: 'new',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,900',
        ],
    });

    try {
        // --- PHASE 1: Guest / Visitor ---
        {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await runPhase1(page, collector);
            await context.close();
        }

        // --- PHASE 2: Buyer ---
        {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await runPhase2(page, collector);
            await context.close();
        }

        // --- PHASE 3: Seller ---
        {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await runPhase3(page, collector);
            await context.close();
        }

        // --- PHASE 4: Staff ---
        {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await runPhase4(page, collector);
            await context.close();
        }

        // --- PHASE 5: Admin ---
        {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await runPhase5(page, collector);
            await context.close();
        }

        // --- PHASE 6: Technical Diagnostics ---
        {
            const context = await browser.createBrowserContext();
            const page = await context.newPage();
            await page.setViewport({ width: 1280, height: 900 });
            await runPhase6(page, collector);
            await context.close();
        }
    } finally {
        await browser.close();
    }

    const duration = ((Date.now() - collector.startTime) / 1000).toFixed(1);
    console.log(`\n======================================================`);
    console.log(`  AUDIT SUITE COMPLETE in ${duration}s`);
    console.log(`  Total Checks: ${collector.results.length}`);
    console.log(`  Passed: ${collector.results.filter(r => r.status === 'PASS').length}`);
    console.log(`  Warnings: ${collector.results.filter(r => r.status === 'WARN').length}`);
    console.log(`  Failed: ${collector.results.filter(r => r.status === 'FAIL').length}`);
    console.log(`  Bugs Logged: ${collector.bugs.length}`);
    console.log(`======================================================\n`);

    // Output JSON result file
    const outputData = {
        meta: {
            target: PROD_URL,
            timestamp: new Date().toISOString(),
            durationSeconds: parseFloat(duration),
            summary: {
                total: collector.results.length,
                passed: collector.results.filter(r => r.status === 'PASS').length,
                warnings: collector.results.filter(r => r.status === 'WARN').length,
                failed: collector.results.filter(r => r.status === 'FAIL').length,
                bugsCount: collector.bugs.length
            }
        },
        results: collector.results,
        bugs: collector.bugs,
        pageErrors: collector.pageErrors,
        consoleErrors: collector.consoleErrors,
        httpErrors: collector.httpErrors
    };

    const outPath = path.resolve('tests/e2e/production_audit/audit_results.json');
    fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2));
    console.log(`  Results saved to: ${outPath}`);

    // Generate Obsidian documentation report
    const mdLines = [
        '# Production End-to-End Audit & Verification Matrix',
        '',
        `> **Target:** \`${PROD_URL}\`  `,
        `> **Execution Date:** \`${new Date().toISOString()}\`  `,
        `> **Duration:** \`${duration}s\`  `,
        `> **Status:** **${collector.bugs.length === 0 && collector.results.filter(r => r.status === 'FAIL').length === 0 ? 'PASS (100% HEALTHY)' : 'ATTENTION REQUIRED'}**`,
        '',
        '## 1. Executive Summary',
        '',
        '| Metric | Value |',
        '| :--- | :--- |',
        `| **Total Scenarios Evaluated** | ${collector.results.length} |`,
        `| **Passed Checks** | ${collector.results.filter(r => r.status === 'PASS').length} |`,
        `| **Warnings** | ${collector.results.filter(r => r.status === 'WARN').length} |`,
        `| **Failed Checks** | ${collector.results.filter(r => r.status === 'FAIL').length} |`,
        `| **Active Bugs Logged** | ${collector.bugs.length} |`,
        '',
        '## 2. Bug & Failure Log',
        ''
    ];

    if (collector.bugs.length === 0 && collector.results.filter(r => r.status === 'FAIL').length === 0) {
        mdLines.push('Zero critical bugs or runtime failures detected across all user journeys.');
    } else {
        collector.bugs.forEach((b, i) => {
            mdLines.push(`### Bug ${i + 1}: [${b.severity}] ${b.title}`);
            mdLines.push(`- **Location:** ${b.url}`);
            mdLines.push(`- **Description:** ${b.description}`);
            mdLines.push(`- **Remediation:** ${b.recommendation || b.remediation || 'Inspect and resolve finding.'}`);
            mdLines.push('');
        });
    }

    mdLines.push('', '## 3. Detailed Results Matrix', '', '| Phase | Check Description | Status | Details |', '| :--- | :--- | :---: | :--- |');
    collector.results.forEach(r => {
        mdLines.push(`| ${r.phase} | ${r.testName || r.name} | **${r.status}** | ${r.message || r.details?.message || '-'} |`);
    });

    const docPath = path.resolve('docs/architecture/e2e-production-audit.md');
    fs.writeFileSync(docPath, mdLines.join('\n'));
    console.log(`  Obsidian Documentation synced to: ${docPath}`);

    const failedChecks = collector.results.filter(r => r.status === 'FAIL').length;
    const hasFailures = failedChecks > 0 || collector.bugs.length > 0;

    if (hasFailures) {
        console.error(`\n[MASTER AUDIT FAILURE] Audit suite finished with ${failedChecks} failed checks and ${collector.bugs.length} bugs logged.`);
        console.error(`  Exiting with terminal exit code 1 to prevent false passes.\n`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal crash in master audit runner:', err);
    process.exit(1);
});

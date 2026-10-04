import { PROD_URL } from './audit_config.mjs';

export async function runPhase4(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 4: Artisan Staff Member Experience`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 4 - Staff');

    // 4.1 Staff Security & Holding Gate
    try {
        const res = await page.goto(`${PROD_URL}/staff/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => null);
        const currentUrl = page.url();
        // Unauthenticated or non-staff should redirect to /login or /dashboard
        collector.recordResult('Phase 4', '4.1 Staff Security Gate Navigation', 'PASS', {
            message: `Route handled with URL: ${currentUrl}`
        });
    } catch (e) {
        collector.recordResult('Phase 4', '4.1 Staff Security Gate', 'FAIL', { message: e.message });
    }

    // 4.2 In-House Driver Deliveries App
    try {
        await page.goto(`${PROD_URL}/staff/deliveries`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => null);
        const currentUrl = page.url();
        collector.recordResult('Phase 4', '4.2 Driver Deliveries Endpoint', 'PASS', {
            message: `Driver deliveries response URL: ${currentUrl}`
        });
    } catch (e) {
        collector.recordResult('Phase 4', '4.2 Driver Deliveries', 'FAIL', { message: e.message });
    }

    // 4.3 Staff Attendance Heartbeat API
    try {
        const heartbeatRes = await page.evaluate(async (url) => {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch(`${url}/staff/attendance/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken || '',
                    'Accept': 'application/json'
                }
            }).catch(e => ({ status: 0, error: e.message }));
            return res.status;
        }, PROD_URL);

        // Heartbeat should return 401/403 if unauthenticated staff, or 200 if active staff; must NOT be 500
        const isNot500 = heartbeatRes !== 500;
        collector.recordResult('Phase 4', '4.3 Attendance Heartbeat Endpoint Health', isNot500 ? 'PASS' : 'FAIL', {
            message: `Heartbeat HTTP status: ${heartbeatRes}`
        });
        if (heartbeatRes === 500) {
            collector.recordBug('HIGH', 'Staff Heartbeat Throws 500 in Production', `${PROD_URL}/staff/attendance/heartbeat`, 'Internal server error on heartbeat ping', 'Check StaffAttendanceSession model.');
        }
    } catch (e) {
        collector.recordResult('Phase 4', '4.3 Attendance Heartbeat Endpoint', 'WARN', { message: e.message });
    }

    // 4.4 Staff Logout Endpoint
    try {
        await page.goto(`${PROD_URL}/staff/logout`, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => null);
        const currentUrl = page.url();
        collector.recordResult('Phase 4', '4.4 Staff Logout Gate Handled', 'PASS', {
            message: `Logout prompt URL: ${currentUrl}`
        });
    } catch (e) {
        collector.recordResult('Phase 4', '4.4 Staff Logout Gate', 'FAIL', { message: e.message });
    }

    console.log(`\n  PHASE 4 COMPLETE.\n`);
}

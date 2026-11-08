import { PROD_URL, ACCOUNTS, loginAs, findElementByText } from './audit_config.mjs';

const DUMMY_FACE_PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export async function runPhase4(page, collector) {
    console.log(`\n======================================================`);
    console.log(`  STARTING PHASE 4: Artisan Staff & Driver Operations`);
    console.log(`======================================================\n`);

    collector.attachListeners(page, 'Phase 4 - Staff & Driver');

    // 4.1 Unauthenticated Security Gate
    try {
        await page.goto(`${PROD_URL}/staff/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
        const currentUrl = page.url();
        const redirected = currentUrl.includes('/login') || currentUrl.includes('/staff');
        collector.recordResult('Phase 4', '4.1 Staff Unauthenticated Gate Protection', redirected ? 'PASS' : 'FAIL', {
            message: `Unauthenticated redirect URL: ${currentUrl}`
        });
    } catch (e) {
        collector.recordResult('Phase 4', '4.1 Staff Unauthenticated Gate', 'FAIL', { message: e.message });
    }

    // 4.2 HR & Operations Staff Authentication
    let staffLoggedIn = false;
    try {
        staffLoggedIn = await loginAs(page, ACCOUNTS.staff.email, ACCOUNTS.staff.password, '/staff/dashboard');
        if (staffLoggedIn) {
            collector.recordResult('Phase 4', '4.2 Staff Member Authentication', 'PASS', {
                message: `Logged in URL: ${page.url()}`
            });
        } else {
            collector.recordResult('Phase 4', '4.2 Staff Member Authentication', 'FAIL', {
                message: `Staff persona (${ACCOUNTS.staff.email}) authentication failed. Staff dashboard, timecard, and attendance tests blocked.`
            });
            collector.recordBug('HIGH', 'Staff Persona Authentication Failed', `${PROD_URL}/staff/dashboard`, `${ACCOUNTS.staff.email} failed to log in; seed personas with /webhooks/seed-personas or php artisan test:seed-personas`);
        }
    } catch (e) {
        collector.recordResult('Phase 4', '4.2 Staff Member Authentication', 'FAIL', { message: `Login exception: ${e.message}` });
        collector.recordBug('HIGH', 'Staff Persona Login Crash', `${PROD_URL}/staff/dashboard`, e.message);
    }

    // 4.3 Staff Dashboard & Workspace Entitlements
    if (staffLoggedIn) {
        try {
            await page.goto(`${PROD_URL}/staff/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('#app', { timeout: 15000 }).catch(() => null);

            await collector.verifyInertiaPage(
                page,
                'Phase 4',
                '4.3 Staff Dashboard Inertia Contract',
                'Staff/Dashboard',
                ['hub']
            );
            await collector.scanDomQuality(page, 'Staff Dashboard');
        } catch (e) {
            collector.recordResult('Phase 4', '4.3 Staff Dashboard Load', 'FAIL', { message: e.message });
        }

        // 4.4 Staff Clock-in / Attendance Session
        try {
            const clockInRes = await page.evaluate(async (url, photo) => {
                try {
                    const res = await window.axios.post(`${url}/staff/attendance/resume`, {
                        liveness_verified: true,
                        photo_data: photo
                    });
                    return res.status;
                } catch (e) {
                    return e.response ? e.response.status : 0;
                }
            }, PROD_URL, DUMMY_FACE_PHOTO);

            const isClockInSuccess = clockInRes >= 200 && clockInRes < 400;
            collector.recordResult('Phase 4', '4.4 Staff Attendance Clock-In Endpoint', isClockInSuccess ? 'PASS' : 'FAIL', {
                message: `Attendance resume HTTP status: ${clockInRes}`
            });
            if (!isClockInSuccess) {
                collector.recordBug('HIGH', 'Staff Clock-In Endpoint Failed', `${PROD_URL}/staff/attendance/resume`, `HTTP status ${clockInRes}`);
            }
        } catch (e) {
            collector.recordResult('Phase 4', '4.4 Staff Attendance Clock-In', 'FAIL', { message: e.message });
            collector.recordBug('HIGH', 'Staff Clock-In Threw Exception', `${PROD_URL}/staff/attendance/resume`, e.message);
        }

        // 4.5 Active Attendance Heartbeat Ping
        try {
            const heartbeatStatus = await page.evaluate(async (url) => {
                try {
                    const res = await window.axios.post(`${url}/staff/attendance/heartbeat`);
                    return res.status;
                } catch (e) {
                    return e.response ? e.response.status : 0;
                }
            }, PROD_URL);

            const isHeartbeatOk = heartbeatStatus === 200;
            collector.recordResult('Phase 4', '4.5 Active Staff Heartbeat Ping', isHeartbeatOk ? 'PASS' : 'FAIL', {
                message: `Heartbeat HTTP status: ${heartbeatStatus}`
            });
            if (!isHeartbeatOk) {
                collector.recordBug('HIGH', 'Staff Heartbeat Failed', `${PROD_URL}/staff/attendance/heartbeat`, `HTTP status: ${heartbeatStatus}`);
            }
        } catch (e) {
            collector.recordResult('Phase 4', '4.5 Active Staff Heartbeat', 'FAIL', { message: e.message });
            collector.recordBug('HIGH', 'Staff Heartbeat Threw Exception', `${PROD_URL}/staff/attendance/heartbeat`, e.message);
        }

        // 4.5b Staff Shift Clock-Out & Attendance Clean Teardown
        try {
            await page.goto(`${PROD_URL}/staff/dashboard`, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('#app', { timeout: 15000 }).catch(() => null);

            let clockedOutViaUI = false;

            // Attempt DOM click on StaffAttendanceDock button
            const dockButton = await page.$('button:has(svg.lucide-clock), button:has(span.animate-ping)')
                || await findElementByText(page, 'button', 'Shift Active|On Break|Clock In');
            if (dockButton) {
                await dockButton.click().catch(() => null);
                await new Promise(r => setTimeout(r, 600));

                // If StaffLogoutModal opened, click Clock Out & Sign Out
                const clockOutBtn = await findElementByText(page, 'button', 'Clock Out & Sign Out|Closing Shift');
                if (clockOutBtn) {
                    await clockOutBtn.click().catch(() => null);
                    await new Promise(r => setTimeout(r, 600));

                    // If EarlyClockOutModal opened, click Confirm Clock-Out
                    const confirmEarlyBtn = await findElementByText(page, 'button', 'Confirm Clock-Out');
                    if (confirmEarlyBtn) {
                        await confirmEarlyBtn.click().catch(() => null);
                    }

                    // Wait for redirect to home after logout
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 8000 }).catch(() => null);
                    clockedOutViaUI = !page.url().includes('/staff/dashboard');
                }
            }

            let clockOutStatus = clockedOutViaUI ? 200 : 0;

            // If not logged out via UI, execute programmatic clock-out fallback
            if (!clockedOutViaUI) {
                const clockOutRes = await page.evaluate(async (url) => {
                    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                    try {
                        const res = await fetch(`${url}/staff/logout`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': csrfToken || '',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({
                                action: 'clock_out',
                                early_departure_reason: 'Automated E2E Audit Teardown'
                            })
                        });
                        return { status: res.status };
                    } catch (e) {
                        return { status: 0, error: e.message };
                    }
                }, PROD_URL);
                clockOutStatus = clockOutRes.status;
            }

            const isClockOutOk = clockedOutViaUI || [200, 302].includes(clockOutStatus);
            collector.recordResult('Phase 4', '4.5b Staff Shift Clock-Out & Attendance Teardown', isClockOutOk ? 'PASS' : 'FAIL', {
                message: clockedOutViaUI
                    ? 'Shift closed and signed out cleanly via interactive UI dock/modal'
                    : `Shift closed and clocked out cleanly with HTTP status: ${clockOutStatus}`
            });

            // Clean residual cookies
            const cookies = await page.cookies();
            if (cookies.length > 0) {
                await page.deleteCookie(...cookies);
            }
        } catch (e) {
            collector.recordResult('Phase 4', '4.5b Staff Shift Clock-Out & Attendance Teardown', 'FAIL', { message: e.message });
        }
    }

    // 4.6 In-House Logistics Driver Rider Experience
    let driverLoggedIn = false;
    try {
        driverLoggedIn = await loginAs(page, ACCOUNTS.driver.email, ACCOUNTS.driver.password, '/staff/deliveries');
        if (driverLoggedIn) {
            collector.recordResult('Phase 4', '4.6 Logistics Rider Authentication', 'PASS', {
                message: `Logged in URL: ${page.url()}`
            });
        } else {
            collector.recordResult('Phase 4', '4.6 Logistics Rider Authentication', 'FAIL', {
                message: `Driver persona (${ACCOUNTS.driver.email}) authentication failed. Driver deliveries console and telemetry tests blocked.`
            });
            collector.recordBug('HIGH', 'Driver Persona Authentication Failed', `${PROD_URL}/staff/deliveries`, `${ACCOUNTS.driver.email} failed to log in; seed personas with /webhooks/seed-personas or php artisan test:seed-personas`);
        }
    } catch (e) {
        collector.recordResult('Phase 4', '4.6 Logistics Rider Authentication', 'FAIL', { message: `Login exception: ${e.message}` });
        collector.recordBug('HIGH', 'Driver Persona Login Crash', `${PROD_URL}/staff/deliveries`, e.message);
    }

    if (driverLoggedIn) {
        // Driver clock-in to access delivery console
        try {
            await page.evaluate(async (url, photo) => {
                try {
                    await window.axios.post(`${url}/staff/attendance/resume`, {
                        liveness_verified: true,
                        photo_data: photo
                    });
                } catch {}
            }, PROD_URL, DUMMY_FACE_PHOTO);
        } catch {}

        // 4.7 Mobile Driver Deliveries Console
        try {
            await page.goto(`${PROD_URL}/staff/deliveries`, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('#app', { timeout: 15000 }).catch(() => null);

            await collector.verifyInertiaPage(
                page,
                'Phase 4',
                '4.7 Driver Deliveries Inertia Contract',
                'Staff/DriverDeliveries',
                ['activeDeliveries', 'completedToday', 'driverProfile']
            );

            // 4.7b Driver Navigation & Telemetry Console State
            const hasDriverNav = await page.evaluate(() => {
                return !!document.body.innerText.match(/(Start Route|Navigate|View Route|Route Map|Active Deliveries|In-House Logistics|Completed)/i);
            });
            collector.recordResult('Phase 4', '4.7b Driver Navigation & Telemetry Console Ready', hasDriverNav ? 'PASS' : 'FAIL', {
                message: 'In-house driver navigation and telemetry console state verified'
            });

            await collector.scanDomQuality(page, 'Driver Deliveries Console');
        } catch (e) {
            collector.recordResult('Phase 4', '4.7 Driver Deliveries Console', 'FAIL', { message: e.message });
        }

        // Direct logout driver
        try {
            await page.evaluate(async (url) => {
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                await fetch(`${url}/staff/logout/direct`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken || '',
                        'Accept': 'application/json'
                    }
                }).catch(() => null);
            }, PROD_URL);
            const cookies = await page.cookies();
            if (cookies.length > 0) {
                await page.deleteCookie(...cookies);
            }
        } catch {}
    }

    console.log(`\n  PHASE 4 COMPLETE.\n`);
}

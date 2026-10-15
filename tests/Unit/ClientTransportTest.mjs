import assert from 'node:assert/strict';
import axios from 'axios';

console.log('[LikhangKamay] Running Batch 4 Client Transport & Retry Verification Suite...');

// Mock browser globals for Node runtime
global.window = {
    location: { hostname: 'localhost' },
    dispatchEvent: (evt) => {
        global.lastDispatchedEvent = evt?.type;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
};
try {
    Object.defineProperty(globalThis, 'navigator', {
        value: {
            onLine: true,
            connection: {
                saveData: false,
                effectiveType: '4g',
                addEventListener: () => {},
                removeEventListener: () => {},
            },
        },
        configurable: true,
        writable: true,
    });
} catch {
    // If navigator cannot be redefined, mutate existing properties
    if (globalThis.navigator) {
        globalThis.navigator.connection = {
            saveData: false,
            effectiveType: '4g',
            addEventListener: () => {},
            removeEventListener: () => {},
        };
    }
}

// Import bootstrap.js to register window.axios defaults and interceptors
await import('../../resources/js/bootstrap.js');

// 1. Verify default timeout is 12000ms
assert.equal(window.axios.defaults.timeout, 12000, 'Axios timeout must be 12,000ms (12s)');
console.log('  ✓ Axios default timeout is 12000ms');

// 2. Test Idempotent GET retry on transient 503 error
let getAttempts = 0;
window.axios.defaults.adapter = async (config) => {
    getAttempts++;
    if (getAttempts < 3) {
        const err = new Error('Service Unavailable');
        err.config = config;
        err.response = { status: 503, data: 'Transient Overload' };
        throw err;
    }
    return { status: 200, data: { recovered: true }, config };
};

const res = await window.axios.get('/test-transient-503');
assert.equal(res.status, 200);
assert.equal(res.data.recovered, true);
assert.equal(getAttempts, 3, 'GET request should retry 2 times (total 3 attempts)');
assert.equal(global.lastDispatchedEvent, 'network-degraded', 'network-degraded event should be dispatched');
console.log('  ✓ Idempotent GET retries on 503 and recovers after 2 retries');

// 3. Test: Mutating POST is NEVER retried
let postAttempts = 0;
window.axios.defaults.adapter = async (config) => {
    postAttempts++;
    const err = new Error('Gateway Timeout');
    err.config = config;
    err.response = { status: 504, data: 'Timeout' };
    throw err;
};

await assert.rejects(
    async () => {
        await window.axios.post('/test-mutating-post', { amount: 500 });
    },
    (err) => {
        assert.equal(err.response?.status, 504);
        assert.equal(postAttempts, 1, 'Mutating POST must NEVER be retried automatically');
        return true;
    }
);
console.log('  ✓ Mutating POST requests strictly reject without retry (idempotency preserved)');

// 4. Test: Mutating DELETE is NEVER retried
let deleteAttempts = 0;
window.axios.defaults.adapter = async (config) => {
    deleteAttempts++;
    const err = new Error('Bad Gateway');
    err.config = config;
    err.response = { status: 502, data: 'Bad Gateway' };
    throw err;
};

await assert.rejects(
    async () => {
        await window.axios.delete('/test-mutating-delete');
    },
    (err) => {
        assert.equal(err.response?.status, 502);
        assert.equal(deleteAttempts, 1, 'Mutating DELETE must NEVER be retried');
        return true;
    }
);
console.log('  ✓ Mutating DELETE requests strictly reject without retry');

// 5. Test: Aborted requests are NEVER retried
let abortAttempts = 0;
window.axios.defaults.adapter = async (config) => {
    abortAttempts++;
    const err = new axios.CanceledError('User navigated away');
    err.config = config;
    throw err;
};

await assert.rejects(
    async () => {
        await window.axios.get('/test-abort');
    },
    (err) => {
        assert.equal(abortAttempts, 1, 'Aborted requests must NEVER be retried');
        return true;
    }
);
console.log('  ✓ Aborted requests strictly reject without retry');

// 6. Test: Client 4xx errors are NOT retried
let clientErrorAttempts = 0;
window.axios.defaults.adapter = async (config) => {
    clientErrorAttempts++;
    const err = new Error('Not Found');
    err.config = config;
    err.response = { status: 404 };
    throw err;
};

await assert.rejects(
    async () => {
        await window.axios.get('/test-404');
    },
    (err) => {
        assert.equal(clientErrorAttempts, 1, 'Client 4xx errors must NEVER be retried');
        return true;
    }
);
console.log('  ✓ Client 4xx errors reject immediately without retry');

// 7. Test: Exhausted retries reject with the final error
let exhaustAttempts = 0;
window.axios.defaults.adapter = async (config) => {
    exhaustAttempts++;
    const err = new Error('Gateway Timeout');
    err.config = config;
    err.response = { status: 504, data: 'Still failing' };
    throw err;
};

await assert.rejects(
    async () => {
        await window.axios.get('/test-exhaust');
    },
    (err) => {
        assert.equal(exhaustAttempts, 3, 'Max 2 retries (total 3 attempts) before final rejection');
        assert.equal(err.response?.status, 504);
        return true;
    }
);
console.log('  ✓ Max retry limit strictly respected and rejections propagate properly');

console.log('\n[PASS] ALL BATCH 4 CLIENT TRANSPORT TESTS PASSED DETERMINISTICALLY!\n');

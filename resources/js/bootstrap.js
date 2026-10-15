import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Set a safe request timeout (12s) comfortably below Vercel's 15s execution limit
window.axios.defaults.timeout = 12000;

// Maximum retry attempts for transient network failures on idempotent GET requests
const MAX_IDEMPOTENT_RETRIES = 2;

// Axios interceptor for automated recovery and transient error backoff on idempotent GET requests
window.axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

        // Never retry if request was cancelled/aborted by the caller (e.g. AbortController, search debouncing)
        if (axios.isCancel(error) || config?.signal?.aborted) {
            return Promise.reject(error);
        }

        // Never retry if request config is missing or explicitly opted out
        if (!config || config._noRetry || config.retry === false) {
            return Promise.reject(error);
        }

        // STRICT IDEMPOTENCY GUARD: Only retry idempotent GET requests.
        // Never retry mutating POST, PUT, PATCH, or DELETE requests to avoid duplicate orders, payments, or records.
        const method = (config.method || 'get').toLowerCase();
        if (method !== 'get') {
            return Promise.reject(error);
        }

        // Initialize or increment retry counter
        config.__retryCount = config.__retryCount || 0;

        // Identify transient network/gateway errors:
        // 1. ECONNABORTED (Axios timeout reaching the 12s limit)
        // 2. ERR_NETWORK or no response (socket drop, DNS blip, cellular packet drop)
        // 3. Transient server gateway statuses: 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
        const isTimeout = error.code === 'ECONNABORTED' || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'));
        const isNetworkDrop = error.code === 'ERR_NETWORK' || (!response && Boolean(error.request));
        const isGatewayError = response && [502, 503, 504].includes(response.status);

        const isTransientFailure = isTimeout || isNetworkDrop || isGatewayError;

        if (isTransientFailure) {
            // Signal global network degradation to the UI (suspends prefetching & slows realtime polling)
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('network-degraded'));
            }

            if (config.__retryCount < MAX_IDEMPOTENT_RETRIES) {
                config.__retryCount += 1;

                // Jittered exponential backoff: base 1000ms * 1.5^(attempt - 1) + 0..350ms random jitter
                const baseDelay = Math.round(1000 * Math.pow(1.5, config.__retryCount - 1));
                const jitter = Math.floor(Math.random() * 350);
                const delayMs = baseDelay + jitter;

                await new Promise((resolve) => setTimeout(resolve, delayMs));

                // Retry the request with the updated retry count
                return window.axios(config);
            }
        }

        return Promise.reject(error);
    }
);

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const echoEnv = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
const echoKey = echoEnv.VITE_REVERB_APP_KEY || echoEnv.VITE_PUSHER_APP_KEY;

if (echoKey) {
    try {
        window.Echo = new Echo({
            broadcaster: echoEnv.VITE_REVERB_APP_KEY ? 'reverb' : 'pusher',
            key: echoKey,
            wsHost: echoEnv.VITE_REVERB_APP_KEY ? (echoEnv.VITE_REVERB_HOST ?? window.location.hostname) : undefined,
            wsPort: echoEnv.VITE_REVERB_APP_KEY ? (echoEnv.VITE_REVERB_PORT ?? 80) : undefined,
            wssPort: echoEnv.VITE_REVERB_APP_KEY ? (echoEnv.VITE_REVERB_PORT ?? 443) : undefined,
            forceTLS: echoEnv.VITE_REVERB_APP_KEY ? ((echoEnv.VITE_REVERB_SCHEME ?? 'https') === 'https') : true,
            enabledTransports: echoEnv.VITE_REVERB_APP_KEY ? ['ws', 'wss'] : undefined,
            cluster: echoEnv.VITE_REVERB_APP_KEY ? undefined : echoEnv.VITE_PUSHER_APP_CLUSTER,
        });
    } catch (e) {
        console.error('Failed to initialize Laravel Echo:', e);
    }
}

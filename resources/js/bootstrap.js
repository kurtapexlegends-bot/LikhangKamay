import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

try {
    window.Echo = new Echo({
        broadcaster: import.meta.env.VITE_REVERB_APP_KEY ? 'reverb' : 'pusher',
        key: import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_APP_KEY ? (import.meta.env.VITE_REVERB_HOST ?? window.location.hostname) : undefined,
        wsPort: import.meta.env.VITE_REVERB_APP_KEY ? (import.meta.env.VITE_REVERB_PORT ?? 80) : undefined,
        wssPort: import.meta.env.VITE_REVERB_APP_KEY ? (import.meta.env.VITE_REVERB_PORT ?? 443) : undefined,
        forceTLS: import.meta.env.VITE_REVERB_APP_KEY ? ((import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https') : true,
        enabledTransports: import.meta.env.VITE_REVERB_APP_KEY ? ['ws', 'wss'] : undefined,
        cluster: import.meta.env.VITE_REVERB_APP_KEY ? undefined : import.meta.env.VITE_PUSHER_APP_CLUSTER,
    });
} catch (e) {
    console.error('Failed to initialize Laravel Echo:', e);
}

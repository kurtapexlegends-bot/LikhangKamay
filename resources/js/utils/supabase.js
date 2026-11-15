import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Realtime WebSockets strictly require a signed JWT anon key ('eyJ...').
// Supabase publishable keys ('sb_publishable_...') cause HTTP 101 / 401 handshake failures on the realtime endpoint.
const isJwtKey = typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.startsWith('eyJ') &&
    supabaseAnonKey.split('.').length === 3;

let client = null;

if (supabaseUrl && supabaseAnonKey) {
    if (isJwtKey) {
        try {
            client = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                },
                realtime: {
                    timeout: 10000,
                    params: {
                        eventsPerSecond: 10,
                    },
                },
            });

            // Shield browser console from unhandled WebSocket errors
            if (client?.realtime) {
                client.realtime.onError((err) => {
                    console.warn('[Supabase Realtime] WebSocket connection error handled gracefully:', err?.message || err);
                });
            }
        } catch (err) {
            console.warn('[Supabase] Failed to initialize Supabase client:', err);
            client = null;
        }
    } else {
        // Publishable key (sb_publishable_...) or invalid JWT detected.
        // Disable WebSocket client to shield browser console from 101 handshake crashes;
        // Inertia HTTP polling in useRealtime.js provides guaranteed background state sync.
        console.info('[Supabase] Publishable or non-JWT key detected. Realtime WebSocket disabled; automatic Inertia HTTP polling active.');
    }
} else {
    console.info('[Supabase] Credentials missing. Realtime WebSocket disabled; automatic Inertia HTTP polling active.');
}

export const supabase = client;

import { useState, useEffect } from 'react';

/**
 * useEchoConnection hook
 * Monitors the connection state of the Laravel Echo (Pusher/Reverb) client.
 * Returns true if connected, false otherwise.
 */
export default function useEchoConnection() {
    const [isConnected, setIsConnected] = useState(() => {
        if (typeof window === 'undefined' || !window.Echo || !window.Echo.connector || !window.Echo.connector.pusher) {
            return false;
        }
        return window.Echo.connector.pusher.connection.state === 'connected';
    });

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Echo || !window.Echo.connector || !window.Echo.connector.pusher) {
            setIsConnected(false);
            return undefined;
        }

        const pusher = window.Echo.connector.pusher;

        const handleStateChange = (states) => {
            setIsConnected(states.current === 'connected');
        };

        pusher.connection.bind('state_change', handleStateChange);

        // Sync connection state on mount
        setIsConnected(pusher.connection.state === 'connected');

        return () => {
            pusher.connection.unbind('state_change', handleStateChange);
        };
    }, []);

    return isConnected;
}

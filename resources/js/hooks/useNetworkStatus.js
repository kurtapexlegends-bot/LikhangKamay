import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook to monitor client internet connectivity and network degradation.
 * Useful for rural connectivity in Philippine regions.
 *
 * @returns {{
 *   isOnline: boolean,
 *   isDegraded: boolean,
 *   wasOffline: boolean,
 *   checkConnection: () => Promise<boolean>,
 *   clearWasOffline: () => void
 * }}
 */
export function useNetworkStatus() {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [isDegraded, setIsDegraded] = useState(false);
    const [wasOffline, setWasOffline] = useState(false);
    const pingControllerRef = useRef(null);

    const checkConnection = useCallback(async () => {
        if (typeof window === 'undefined') return true;

        if (pingControllerRef.current) {
            pingControllerRef.current.abort();
        }

        const controller = new AbortController();
        pingControllerRef.current = controller;
        const timeoutId = setTimeout(() => controller.abort(), 4500);

        try {
            const start = Date.now();
            const response = await fetch('/ping', {
                method: 'GET',
                cache: 'no-store',
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            const duration = Date.now() - start;
            const online = response.ok;

            setIsOnline(online);
            setIsDegraded(duration > 3500);

            if (online && !isOnline) {
                setWasOffline(true);
            }

            return online;
        } catch {
            clearTimeout(timeoutId);
            setIsOnline(false);
            return false;
        }
    }, [isOnline]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
            setIsOnline(true);
            setWasOffline(true);
            checkConnection();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setIsDegraded(false);
        };

        const handleNetworkDegraded = () => {
            setIsDegraded(true);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('network-degraded', handleNetworkDegraded);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('network-degraded', handleNetworkDegraded);
            if (pingControllerRef.current) {
                pingControllerRef.current.abort();
            }
        };
    }, [checkConnection]);

    const clearWasOffline = useCallback(() => {
        setWasOffline(false);
    }, []);

    return {
        isOnline,
        isDegraded,
        wasOffline,
        checkConnection,
        clearWasOffline,
    };
}

export default useNetworkStatus;

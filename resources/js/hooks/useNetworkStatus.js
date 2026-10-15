import { useCallback, useSyncExternalStore } from 'react';

// Singleton network state store
let currentNetworkState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isDegraded: typeof navigator !== 'undefined' && navigator.connection
        ? (navigator.connection.effectiveType === 'slow-2g' || navigator.connection.effectiveType === '2g')
        : false,
    wasOffline: false,
    saveData: typeof navigator !== 'undefined' && navigator.connection
        ? Boolean(navigator.connection.saveData)
        : false,
};

const listeners = new Set();

function emitChange() {
    listeners.forEach((listener) => {
        try {
            listener();
        } catch {
            // Ignore listener errors
        }
    });
}

let activePingController = null;

/**
 * Pings /ping endpoint with 4.5s timeout to accurately check latency and connectivity.
 * Updates singleton state so all subscribing components receive synchronized updates.
 */
export async function executePingCheck() {
    if (typeof window === 'undefined') return true;

    if (activePingController) {
        activePingController.abort();
    }

    const controller = new AbortController();
    activePingController = controller;
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
        const degraded = duration > 3500;
        const wasOffline = online && !currentNetworkState.isOnline ? true : currentNetworkState.wasOffline;

        currentNetworkState = {
            ...currentNetworkState,
            isOnline: online,
            isDegraded: degraded,
            wasOffline,
        };
        emitChange();
        return online;
    } catch {
        clearTimeout(timeoutId);
        currentNetworkState = {
            ...currentNetworkState,
            isOnline: false,
            isDegraded: false,
        };
        emitChange();
        return false;
    }
}

/**
 * Resets the wasOffline reconnect flash state.
 */
export function resetWasOffline() {
    if (currentNetworkState.wasOffline) {
        currentNetworkState = {
            ...currentNetworkState,
            wasOffline: false,
        };
        emitChange();
    }
}

let isGlobalListenerAttached = false;

function initGlobalNetworkListeners() {
    if (isGlobalListenerAttached || typeof window === 'undefined') return;
    isGlobalListenerAttached = true;

    const handleOnline = () => {
        currentNetworkState = {
            ...currentNetworkState,
            isOnline: true,
            wasOffline: true,
        };
        emitChange();
        executePingCheck();
    };

    const handleOffline = () => {
        currentNetworkState = {
            ...currentNetworkState,
            isOnline: false,
            isDegraded: false,
        };
        emitChange();
    };

    const handleNetworkDegraded = () => {
        if (!currentNetworkState.isDegraded) {
            currentNetworkState = {
                ...currentNetworkState,
                isDegraded: true,
            };
            emitChange();
        }
    };

    const handleConnectionChange = () => {
        if (typeof navigator !== 'undefined' && navigator.connection) {
            const conn = navigator.connection;
            const newSaveData = Boolean(conn.saveData);
            const isSlow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
            const isFast = conn.effectiveType === '4g';
            const newDegraded = isSlow ? true : (isFast && !newSaveData ? false : currentNetworkState.isDegraded);

            if (currentNetworkState.saveData !== newSaveData || currentNetworkState.isDegraded !== newDegraded) {
                currentNetworkState = {
                    ...currentNetworkState,
                    saveData: newSaveData,
                    isDegraded: newDegraded,
                };
                emitChange();
            }
        }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('network-degraded', handleNetworkDegraded);

    if (typeof navigator !== 'undefined' && navigator.connection) {
        navigator.connection.addEventListener('change', handleConnectionChange);
    }
}

function subscribe(callback) {
    initGlobalNetworkListeners();
    listeners.add(callback);
    return () => {
        listeners.delete(callback);
    };
}

function getSnapshot() {
    return currentNetworkState;
}

const SERVER_SNAPSHOT = {
    isOnline: true,
    isDegraded: false,
    wasOffline: false,
    saveData: false,
};

function getServerSnapshot() {
    return SERVER_SNAPSHOT;
}

/**
 * Hook to monitor client internet connectivity, cellular data-saver, and network degradation.
 * Optimized with a singleton event bus and useSyncExternalStore for zero redundant listeners.
 *
 * @returns {{
 *   isOnline: boolean,
 *   isDegraded: boolean,
 *   wasOffline: boolean,
 *   saveData: boolean,
 *   canPrefetch: boolean,
 *   checkConnection: () => Promise<boolean>,
 *   clearWasOffline: () => void
 * }}
 */
export function useNetworkStatus() {
    const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    const checkConnection = useCallback(() => {
        return executePingCheck();
    }, []);

    const clearWasOffline = useCallback(() => {
        resetWasOffline();
    }, []);

    // Prefetching is allowed only on stable, unmetered, non-degraded connections
    const canPrefetch = state.isOnline && !state.isDegraded && !state.saveData;

    return {
        isOnline: state.isOnline,
        isDegraded: state.isDegraded,
        wasOffline: state.wasOffline,
        saveData: state.saveData,
        canPrefetch,
        checkConnection,
        clearWasOffline,
    };
}

export default useNetworkStatus;

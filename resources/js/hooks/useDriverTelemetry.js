/* global route */
import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";

export function useDriverTelemetry({ activeDeliveries = [], isClockedIn = false }) {
    const [userWantsSharing, setUserWantsSharing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const lastBroadcastRef = useRef(0);
    const watchIdRef = useRef(null);

    const isSharing = userWantsSharing && isClockedIn && activeDeliveries.length > 0;

    const broadcastCoordinates = useCallback(async (coords) => {
        const now = Date.now();
        // Throttle to at most once every 15 seconds
        if (now - lastBroadcastRef.current < 15000) {
            return;
        }
        lastBroadcastRef.current = now;

        const payload = {
            latitude: Number(coords.latitude.toFixed(6)),
            longitude: Number(coords.longitude.toFixed(6)),
            heading: coords.heading != null && !isNaN(coords.heading) ? Math.round(coords.heading) : null,
            speed_kph: coords.speed != null && !isNaN(coords.speed) && coords.speed >= 0 ? Math.round(coords.speed * 3.6) : null,
        };

        const activeIds = activeDeliveries.map((d) => d.id);
        if (activeIds.length === 0) return;

        try {
            await Promise.allSettled(
                activeIds.map((id) =>
                    axios.put(route("staff.deliveries.telemetry", id), payload)
                )
            );
            setLastSyncTime(new Date());
            setErrorMessage(null);
        } catch {
            // Silently ignore network hiccup; next watch tick will retry
        }
    }, [activeDeliveries]);

    useEffect(() => {
        if (!isSharing) {
            if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            return;
        }

        if (typeof window === "undefined" || !navigator.geolocation) {
            return;
        }

        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
                broadcastCoordinates(pos.coords);
            },
            (err) => {
                if (err.code === 1) {
                    // PERMISSION_DENIED
                    setErrorMessage("Location permission is blocked. Tap the lock icon in your browser address bar to allow location access.");
                } else if (err.code === 2) {
                    // POSITION_UNAVAILABLE
                    setErrorMessage("GPS signal unavailable. Ensure device location is switched on.");
                } else {
                    setErrorMessage("Unable to retrieve GPS coordinates. Retrying in background.");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 10000,
            }
        );

        return () => {
            if (watchIdRef.current !== null && typeof window !== "undefined" && navigator.geolocation) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isSharing, broadcastCoordinates]);

    const toggleTracking = useCallback(() => {
        setUserWantsSharing((prev) => !prev);
    }, []);

    const startTracking = useCallback(() => {
        setUserWantsSharing(true);
    }, []);

    const stopTracking = useCallback(() => {
        setUserWantsSharing(false);
    }, []);

    return {
        isSharing,
        userWantsSharing,
        lastSyncTime,
        errorMessage,
        toggleTracking,
        startTracking,
        stopTracking,
    };
}

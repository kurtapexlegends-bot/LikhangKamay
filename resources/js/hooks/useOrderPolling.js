import { useMemo, useEffect, useRef } from "react";
import { router } from "@inertiajs/react";
import { isLalamoveManagedOrder } from "@/utils/sellerOrderHelpers";

export default function useOrderPolling(paginatedOrders) {
    const isReloadingRef = useRef(false);

    const hasActiveCourierTracking = useMemo(() => {
        if (!Array.isArray(paginatedOrders)) return false;
        
        return paginatedOrders.some((order) => {
            if (!isLalamoveManagedOrder(order)) {
                return false;
            }

            return !["COMPLETED", "CANCELED", "REJECTED", "EXPIRED"].includes(
                String(order?.delivery?.status || "").toUpperCase(),
            );
        });
    }, [paginatedOrders]);

    useEffect(() => {
        if (!hasActiveCourierTracking || typeof window === "undefined") {
            return undefined;
        }

        let isMounted = true;

        const reloadOrders = () => {
            if (isReloadingRef.current || !isMounted) return;
            if (document.hidden || !navigator.onLine) return;

            isReloadingRef.current = true;
            router.reload({
                only: ["orders"],
                preserveState: true,
                preserveScroll: true,
                onFinish: () => {
                    isReloadingRef.current = false;
                },
            });
        };

        const intervalId = window.setInterval(reloadOrders, 15000);

        // Wake up immediately when tab gains focus instead of waiting up to 15 seconds
        const handleVisibilityChange = () => {
            if (!document.hidden && navigator.onLine) {
                reloadOrders();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleVisibilityChange);

        return () => {
            isMounted = false;
            isReloadingRef.current = false;
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleVisibilityChange);
        };
    }, [hasActiveCourierTracking]);

    return { hasActiveCourierTracking };
}

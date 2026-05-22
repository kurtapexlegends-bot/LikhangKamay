import { useMemo, useEffect } from "react";
import { router } from "@inertiajs/react";
import { isLalamoveManagedOrder } from "@/utils/orderUtils";

export default function useOrderPolling(paginatedOrders) {
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

        const intervalId = window.setInterval(() => {
            if (document.hidden) {
                return;
            }

            router.reload({
                only: ["orders"],
                preserveState: true,
                preserveScroll: true,
            });
        }, 15000);

        return () => window.clearInterval(intervalId);
    }, [hasActiveCourierTracking]);

    return { hasActiveCourierTracking };
}

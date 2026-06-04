import React from "react";
import KPICard from "@/Components/KPICard";
import { Package, TrendingUp, Boxes } from "lucide-react";

export default function CatalogMetrics({
    totalItems,
    activeCount = 0,
    remainingActivationSlots = 0,
    animate = true,
}) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3">
            <KPICard
                title="Total Products"
                value={totalItems}
                icon={Package}
                color="text-sky-600"
                bg="bg-sky-50"
                animate={animate}
            />
            <KPICard
                title="Active Products"
                value={activeCount}
                icon={TrendingUp}
                color="text-emerald-600"
                bg="bg-emerald-50"
                animate={animate}
            />
            <KPICard
                title="Available Slots"
                value={remainingActivationSlots}
                icon={Boxes}
                color="text-amber-600"
                bg="bg-amber-50"
                animate={animate}
            />
        </div>
    );
}

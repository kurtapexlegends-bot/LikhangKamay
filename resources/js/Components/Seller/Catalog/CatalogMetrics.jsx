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
        <div className="flex overflow-x-auto pb-2.5 gap-3 flex-nowrap snap-x snap-mandatory md:grid md:grid-cols-3 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard
                    title="Total Products"
                    value={totalItems}
                    icon={Package}
                    color="text-sky-600"
                    bg="bg-sky-50"
                    animate={animate}
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard
                    title="Active Products"
                    value={activeCount}
                    icon={TrendingUp}
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                    animate={animate}
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard
                    title="Available Slots"
                    value={remainingActivationSlots}
                    icon={Boxes}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    animate={animate}
                />
            </div>
        </div>
    );
}

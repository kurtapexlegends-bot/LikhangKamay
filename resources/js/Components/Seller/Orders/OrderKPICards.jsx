import React from "react";
import KPICard from "@/Components/KPICard";
import { AlertCircle, Package, Truck, CheckCircle2 } from "lucide-react";

export default function OrderKPICards({
    urgentCount,
    shouldAnimateKPI,
    getCount,
}) {
    return (
        <div className="flex overflow-x-auto pb-2.5 gap-3 flex-nowrap snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard title="Needs Action" value={urgentCount} icon={AlertCircle} color="text-amber-600" bg="bg-amber-50" animate={shouldAnimateKPI} />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard title="Processing" value={getCount("Accepted") + getCount("Processing")} icon={Package} color="text-blue-600" bg="bg-blue-50" animate={shouldAnimateKPI} />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard title="In Transit / Ready" value={getCount("Shipped") + getCount("Delivered") + getCount("Ready for Pickup")} icon={Truck} color="text-sky-600" bg="bg-sky-50" animate={shouldAnimateKPI} />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                <KPICard title="Completed" value={getCount("Completed")} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" animate={shouldAnimateKPI} />
            </div>
        </div>
    );
}

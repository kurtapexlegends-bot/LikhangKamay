import React from "react";
import { Calendar, Clock, Zap } from "lucide-react";

export default function DiscountScheduleCard({
    name,
    setName,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
}) {
    const formatLocalForInput = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const minStart = formatLocalForInput(new Date());
    const startDateObj = startAt ? new Date(startAt) : null;
    const nowBuffer = new Date(Date.now() - 60 * 1000); // 1-minute past tolerance max
    const isPastStart = startDateObj && startDateObj < nowBuffer;
    const isImmediate = startDateObj && startDateObj <= new Date(Date.now() + 5 * 60 * 1000);

    return (
        <div className="space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-400 border-b border-stone-200/60 pb-1.5 flex items-center gap-1.5">
                <Calendar size={13} className="text-stone-500" /> Campaign Schedule
            </h3>
            
            <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Campaign Title (Optional)</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mid-Year Crafts Promo"
                    className="w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white font-medium"
                />
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-stone-700">Start Date & Time</label>
                    {startAt && !isPastStart && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                            isImmediate
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}>
                            {isImmediate ? <Zap size={10} /> : <Clock size={10} />}
                            {isImmediate ? "Starts Immediately" : "Scheduled Future"}
                        </span>
                    )}
                </div>
                <input
                    type="datetime-local"
                    min={minStart}
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={`w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white ${
                        isPastStart ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                    }`}
                    required
                />
                {isPastStart && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">Start time cannot be in the past.</p>
                )}
            </div>

            <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Expiration End Date & Time</label>
                <input
                    type="datetime-local"
                    min={startAt || minStart}
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className={`w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white ${
                        startAt && endAt && new Date(endAt) <= new Date(startAt) ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                    }`}
                    required
                />
                {startAt && endAt && new Date(endAt) <= new Date(startAt) && (
                    <p className="text-[10px] text-rose-600 font-bold mt-1">Expiration date must be after start date.</p>
                )}
            </div>
        </div>
    );
}

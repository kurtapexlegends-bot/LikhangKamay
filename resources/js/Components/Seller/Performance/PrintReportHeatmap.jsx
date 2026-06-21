import React from 'react';

export default function PrintReportHeatmap({ salesHeatmap = [] }) {
    // Guard clause: ensure salesHeatmap is a valid array
    const heatmapList = Array.isArray(salesHeatmap) ? salesHeatmap : [];

    return (
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-4">
                <div>
                    <h3 className="text-base font-bold text-stone-900 leading-none">Peak Activity Heatmap</h3>
                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">When your customers are most likely to buy</p>
                </div>
                <div className="flex items-center gap-3 text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                    <span>Quiet</span>
                    <div className="flex gap-0.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-stone-50 border border-stone-100" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-clay-100" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-clay-300" />
                        <div className="w-2.5 h-2.5 rounded-sm bg-clay-500" />
                    </div>
                    <span>Peak</span>
                </div>
            </div>

            <div className="flex-1 overflow-x-auto pb-2">
                <div className="min-w-[500px]">
                    <div className="grid grid-cols-8 gap-1 performance-heatmap-row">
                        <div className="col-span-1" />
                        {['12 AM', '4 AM', '8 AM', '12 PM', '4 PM', '8 PM', '11 PM'].map((h, i) => (
                            <div key={i} className="text-[9px] font-bold text-stone-400 text-center uppercase">{h}</div>
                        ))}
                    </div>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                        <div key={day} className="grid grid-cols-8 gap-1 mt-1 performance-heatmap-row">
                            <div className="text-[10px] font-bold text-stone-600 flex items-center pr-2">{day}</div>
                            {[0, 4, 8, 12, 16, 20, 23].map((hour) => {
                                const match = heatmapList.find(h => h && h.day === day && h.hour === hour);
                                const count = match ? match.count : 0;
                                const opacity = count === 0 ? 'bg-stone-50' : 
                                                count < 2 ? 'bg-clay-100' :
                                                count < 5 ? 'bg-clay-300' : 'bg-clay-600 shadow-sm';
                                return (
                                    <div 
                                        key={hour} 
                                        className={`h-7 rounded-md ${opacity} transition-all hover:scale-105 cursor-help flex items-center justify-center`}
                                        title={`${count} orders at ${hour}:00 on ${day}`}
                                    >
                                        {count > 0 && <span className={`text-[9px] font-bold ${count > 4 ? 'text-white' : 'text-clay-800'}`}>{count}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
            <p className="mt-3 text-[9px] text-stone-400 italic">Recommendation: Schedule product updates or campaigns matching dark heatmap blocks.</p>
        </div>
    );
}

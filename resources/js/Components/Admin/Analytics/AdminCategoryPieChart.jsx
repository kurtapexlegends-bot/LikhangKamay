import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const CategoryTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        const item = payload[0]?.payload;
        const gmvValue = item?.isEmpty ? 0 : Number(item?.gmv || 0);

        return (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl px-4 py-3">
                <p className="font-bold text-stone-900 text-[11px] uppercase tracking-wider mb-2">{item?.category || 'Category'}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item?.isEmpty ? '#e7e5e4' : payload[0].color }}></div>
                    <p className="text-sm font-bold text-stone-800">
                        GMV: <span className="font-semibold text-stone-550">₱{gmvValue.toLocaleString()}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function AdminCategoryPieChart({
    pieData,
    pieColors,
    hoveredCategoryIndex,
    setHoveredCategoryIndex
}) {
    return (
        <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip content={<CategoryTooltip />} />
                    <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={4}
                        dataKey="gmv"
                        onMouseEnter={(_, index) => setHoveredCategoryIndex(index)}
                        onMouseLeave={() => setHoveredCategoryIndex(null)}
                    >
                        {pieData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.isEmpty ? '#e7e5e4' : pieColors[index % pieColors.length]} 
                                opacity={hoveredCategoryIndex === null || hoveredCategoryIndex === index ? 1 : 0.4}
                                className="transition-opacity duration-200 outline-hidden"
                            />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

import React from 'react';
import {
    ResponsiveContainer,
    AreaChart, Area,
    XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        const data = payload[0]?.payload;
        return (
            <div className="bg-white/90 backdrop-blur-xl border border-stone-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] rounded-xl px-4 py-3">
                <p className="font-bold text-stone-900 text-[10px] uppercase tracking-wider mb-2">{label || data?.name}</p>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-clay-550" style={{ backgroundColor: '#c07251' }}></div>
                    <p className="text-xs font-bold text-stone-800">
                        GMV: <span className="font-semibold text-stone-550">₱{Number(data?.gmv || 0).toLocaleString()}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" style={{ backgroundColor: '#0284c7' }}></div>
                    <p className="text-xs font-bold text-stone-800">
                        Orders: <span className="font-semibold text-stone-550">{Number(data?.orders || 0).toLocaleString()}</span>
                    </p>
                </div>
            </div>
        );
    }
    return null;
};

export default function AdminGmvChart({ currentChartData }) {
    return (
        <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={currentChartData} margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                    <defs>
                        <linearGradient id="adminGmvFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#c07251" stopOpacity={0.16} />
                            <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                    <XAxis dataKey="name" stroke="#a8a29e" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis 
                        stroke="#a8a29e" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(v) => {
                            const num = Number(v || 0);
                            if (num === 0) return '₱0';
                            const abs = Math.abs(num);
                            const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(0)}k` : abs;
                            return num < 0 ? `-₱${formatted}` : `₱${formatted}`;
                        }} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="gmv" stroke="#c07251" strokeWidth={2.5} fillOpacity={1} fill="url(#adminGmvFill)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

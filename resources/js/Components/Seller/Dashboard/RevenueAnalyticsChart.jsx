import React from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function RevenueAnalyticsChart({ chartFilter, setChartFilter, currentChartData, isLoading }) {
    return (
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Revenue Analytics</h2>
                    <p className="text-sm text-gray-500">Income over time</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {['Monthly', 'Yearly'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setChartFilter(filter)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 min-h-[36px] sm:min-h-0 ${chartFilter === filter ? 'bg-white text-clay-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="h-80 w-full relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10 rounded-xl transition-all">
                        <div className="h-full w-full relative overflow-hidden rounded-xl bg-stone-50/50">
                            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                        </div>
                    </div>
                ) : null}
                
                {currentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#c07251" stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor="#c07251" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                            <YAxis width={40} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} tickFormatter={(val) => `₱${val}`} />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                formatter={(value) => `₱${Number(value).toLocaleString()}`} 
                                cursor={{ stroke: '#c07251', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        No revenue data available for this period.
                    </div>
                )}
            </div>
        </div>
    );
}

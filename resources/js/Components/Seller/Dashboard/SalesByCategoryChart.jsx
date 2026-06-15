import React from 'react';
import { 
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts';
import { Package } from 'lucide-react';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';

const COLORS = ['#c07251', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ef4444'];

export default function SalesByCategoryChart({ categoryData, isLoading }) {
    const totalSales = categoryData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Sales by Category</h3>
                    <p className="text-sm text-gray-500">Total items sold</p>
                </div>
            </div>
            
            <div className="flex-1 min-h-[220px] relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50">
                        <ArtisanSkeleton variant="circle" className="w-40 h-40" />
                    </div>
                ) : null}

                {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                        <PieChart>
                            <Pie
                                data={categoryData}
                                innerRadius={55}
                                outerRadius={85}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                            >
                                {categoryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 600 }}
                                formatter={(value, name) => [`${value} items`, name]}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                        <Package size={32} className="text-gray-300" />
                        <span className="text-sm font-medium">No sales data yet</span>
                    </div>
                )}
            </div>

            {/* Custom Legend */}
            {categoryData.length > 0 && (
                <div className="mt-2 space-y-2 pt-4 border-t border-gray-50">
                    {categoryData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="font-medium text-gray-700 truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-bold text-gray-900">{item.value}</span>
                                <span className="text-gray-400 w-10 text-right">{totalSales > 0 ? Math.round((item.value / totalSales) * 100) : 0}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

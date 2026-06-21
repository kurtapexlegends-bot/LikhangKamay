import React from 'react';
import ContentTransition from '@/Components/ContentTransition';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import { DollarSign, Package } from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip as RechartsTooltip
} from 'recharts';

const COLORS = ['#c07251', '#d97706', '#059669', '#57534e', '#e11d48', '#8c5a44'];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function PrintReportCharts({
    isLoading,
    chartFilter = '',
    currentChartData = [],
    categoryData = [],
    updateCategoryFilter
}) {
    // Guard clause: handle empty/invalid array
    const chartDataList = Array.isArray(currentChartData) ? currentChartData : [];
    const categoryDataList = Array.isArray(categoryData) ? categoryData : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 performance-charts-container print-page-1">
            <div className="min-w-0 lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col relative overflow-hidden">
                <ContentTransition
                    isShowingPlaceholder={isLoading}
                    placeholder={
                        <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                            <div className="h-full w-full relative overflow-hidden bg-stone-50/30">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                            </div>
                        </div>
                    }
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                <span>Revenue Analytics</span>
                                <span className="hidden print:inline-block text-[10px] font-extrabold uppercase tracking-wider text-clay-700 bg-stone-50 px-2 py-0.5 rounded border border-stone-200">
                                    {chartFilter}
                                </span>
                            </h3>
                            <p className="text-sm text-stone-500">Income over time</p>
                        </div>
                    </div>

                    <div className="h-64 min-h-[250px] w-full min-w-0">
                        {chartDataList.length > 0 ? (
                            <>
                                {/* Screen Chart */}
                                <div className="print:hidden h-full w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <AreaChart data={chartDataList} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenuePrintScreen" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={15} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => formatPeso(value)}
                                                cursor={{ stroke: '#c07251', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenuePrintScreen)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                {/* Print Chart (Fixed width to bypass ResponsiveContainer collapse) */}
                                <div className="hidden print:flex print:justify-center w-full h-[230px]">
                                    <AreaChart width={445} height={220} data={chartDataList} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRevenuePrintPrint" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={15} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                        <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenuePrintPrint)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} />
                                    </AreaChart>
                                </div>
                            </>
                        ) : (
                            <div className="h-full">
                                <WorkspaceEmptyState
                                    compact
                                    icon={DollarSign}
                                    title="No revenue data yet"
                                    description="Completed orders for this filter will appear here once your shop starts converting sales."
                                    actionLabel="View Orders"
                                    actionHref="/orders"
                                />
                            </div>
                        )}
                    </div>
                </ContentTransition>
            </div>

            <div className="min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
                <div>
                    <h3 className="text-lg font-bold text-stone-900">Sales by Category</h3>
                    <p className="text-sm text-stone-500 mb-4">Total items sold</p>
                </div>

                <div className="h-[180px] w-full flex items-center justify-center relative">
                    {categoryDataList.length > 0 ? (
                        <PieChart width={160} height={160}>
                            <Pie
                                data={categoryDataList}
                                nameKey="category"
                                cx={80}
                                cy={80}
                                innerRadius={45}
                                outerRadius={70}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                                onClick={updateCategoryFilter ? (data) => updateCategoryFilter(data.category || data.name) : undefined}
                                className={updateCategoryFilter ? "cursor-pointer" : ""}
                            >
                                {categoryDataList.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 600 }}
                                formatter={(value, name) => [`${value} items`, name]}
                            />
                        </PieChart>
                    ) : (
                        <div className="absolute inset-0">
                            <WorkspaceEmptyState
                                compact
                                icon={Package}
                                title="No category sales yet"
                                description="Category performance becomes available after your first completed orders."
                                actionLabel="Manage Products"
                                actionHref="/products"
                            />
                        </div>
                    )}
                </div>

                {categoryDataList.length > 0 && (
                    <div className="mt-4 space-y-2 pt-3 border-t border-stone-100 max-h-[140px] overflow-y-auto pr-1">
                        {(() => {
                            const total = categoryDataList.reduce((sum, item) => sum + item.value, 0);
                            return categoryDataList.map((item, index) => (
                                <div key={index} className="flex flex-col gap-0.5">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="font-bold text-stone-900 truncate max-w-[120px]">{item.category || item.name}</span>
                                        </div>
                                        <span className="font-black text-clay-700">{formatPeso(item.profit)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-stone-400">
                                        <span>{item.value} sold • {item.margin}% margin</span>
                                        <span className="font-bold">{total > 0 ? Math.round((item.value / total) * 100) : 0}% share</span>
                                    </div>
                                </div>
                            ));
                        })()}
                    </div>
                )}
            </div>
        </div>
    );
}

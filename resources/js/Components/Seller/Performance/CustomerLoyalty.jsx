import React, { useMemo, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { Star, Users, Award } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const formatPeso = (value) => {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
};

export default function CustomerLoyalty({ vipCustomers, loyaltyStats }) {
    const [repeatBuyerSort, setRepeatBuyerSort] = useState('orders');

    const loyaltyData = useMemo(() => [
        { name: 'New Customers', value: loyaltyStats?.new || 0, color: '#f5f5f4' },
        { name: 'Returning Fans', value: loyaltyStats?.returning || 0, color: '#c07251' }
    ], [loyaltyStats]);

    const sortedVipCustomers = useMemo(() => {
        const nextBuyers = [...(vipCustomers || [])];
        return nextBuyers.sort((left, right) => {
            if (repeatBuyerSort === 'spend') {
                return Number(right.clv || 0) - Number(left.clv || 0);
            }
            if (repeatBuyerSort === 'name') {
                return String(left.name || '').localeCompare(String(right.name || ''));
            }
            return Number(right.orders_count || 0) - Number(left.orders_count || 0);
        });
    }, [vipCustomers, repeatBuyerSort]);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full min-h-[300px]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 customer-loyalty-grid">
                {/* Loyalty Breakdown */}
                <div className="md:col-span-1 flex flex-col justify-between">
                    <div>
                        <h3 className="text-base font-bold text-stone-900 leading-none">Customer Retention</h3>
                        <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">New vs. Returning buyers</p>
                    </div>
                    <div className="flex-1 flex flex-col justify-center py-2">
                        <div className="h-28 w-full relative">
                            {/* Screen Chart */}
                            <div className="print:hidden h-full w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={loyaltyData}
                                            innerRadius={25}
                                            outerRadius={40}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {loyaltyData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            {/* Print Chart */}
                            <div className="hidden print:flex print:justify-center w-full h-[110px]">
                                <PieChart width={110} height={110}>
                                    <Pie
                                        data={loyaltyData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={20}
                                        outerRadius={35}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {loyaltyData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </div>
                        </div>
                        <div className="space-y-1 mt-2">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 text-stone-500"><span className="w-1.5 h-1.5 rounded-full bg-[#f5f5f4] border border-stone-200" /> New</span>
                                <span className="font-bold">{loyaltyStats?.new || 0}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1.5 text-stone-500"><span className="w-1.5 h-1.5 rounded-full bg-[#c07251]" /> Returning</span>
                                <span className="font-bold">{loyaltyStats?.returning || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VIP List */}
                <div className="md:col-span-2 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-base font-bold text-stone-900 leading-none">VIP Patrons</h3>
                                {sortedVipCustomers.length > 0 && (
                                    <Award size={13} className="text-amber-500" />
                                )}
                            </div>
                            <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">High value order contributors</p>
                        </div>
                        <select
                            value={repeatBuyerSort}
                            onChange={(event) => setRepeatBuyerSort(event.target.value)}
                            className="rounded-lg border-0 bg-stone-50 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-stone-600 outline-none hover:bg-stone-100 cursor-pointer focus:ring-0"
                        >
                            <option value="spend">CLV</option>
                            <option value="orders">Orders</option>
                            <option value="name">Name</option>
                        </select>
                    </div>

                    <div className="flex-1 max-h-[160px] overflow-y-auto pr-1 space-y-2 mt-1">
                        {sortedVipCustomers.length > 0 ? (
                            sortedVipCustomers.slice(0, 3).map((buyer) => (
                                <div key={buyer.id} className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/50 p-2.5 transition hover:bg-white hover:shadow-sm">
                                    <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-full overflow-hidden bg-stone-200 flex items-center justify-center text-xs font-bold border border-white text-stone-600 relative">
                                            {buyer.avatar ? (
                                                <img
                                                    src={buyer.avatar.startsWith('http') || buyer.avatar.startsWith('/storage') ? buyer.avatar : `/storage/${buyer.avatar}`}
                                                    alt=""
                                                    className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
                                                    onError={(e) => { e.target.style.opacity = '0'; }}
                                                />
                                            ) : null}
                                            <span className="relative z-0">{buyer.name.charAt(0)}</span>
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="truncate text-xs font-bold text-stone-900">{buyer.name}</p>
                                            <p className="text-xs font-black text-clay-700">{formatPeso(buyer.clv)}</p>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] mt-0.5">
                                            <p className="text-stone-500 font-medium">{buyer.orders_count} orders • Active {buyer.last_active}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center py-6 text-center rounded-xl bg-stone-50 border border-stone-100">
                                <p className="text-[10px] text-stone-400 italic">No VIP patrons discovered yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

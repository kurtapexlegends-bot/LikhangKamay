import React, { useEffect, useRef } from 'react';
import { motion, animate } from 'framer-motion';
import { DollarSign, ShoppingBag, Users, CreditCard, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';

const AnimatedCounter = ({ value, formatter = (v) => Math.round(v).toLocaleString(), duration = 1.5 }) => {
    const nodeRef = useRef(null);

    useEffect(() => {
        if (!nodeRef.current) return;
        
        const controls = animate(0, value, {
            duration: duration,
            onUpdate(val) {
                if (nodeRef.current) {
                    nodeRef.current.textContent = formatter(val);
                }
            }
        });

        return () => controls.stop();
    }, [value, duration]);

    return <span ref={nodeRef}>{formatter(0)}</span>;
};

const MetricCard = ({ title, value, growth, icon: Icon, bg, text, animateValue = true }) => {
    let growthColor = 'text-gray-500';
    let GrowthIcon = Minus;
    let growthPrefix = '';

    if (growth > 0) {
        growthColor = 'text-emerald-600';
        GrowthIcon = TrendingUp;
        growthPrefix = '+';
    } else if (growth < 0) {
        growthColor = 'text-rose-600';
        GrowthIcon = TrendingDown;
        growthPrefix = '';
    }
    
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow group"
        >
            <div>
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <p className="text-2xl font-bold text-stone-900 tracking-tight">
                    {animateValue && (typeof value === 'number' || (typeof value === 'string' && value.includes('₱'))) ? (
                        typeof value === 'number' ? (
                            <AnimatedCounter value={value} />
                        ) : (
                            <AnimatedCounter value={parseFloat(value.replace(/[^\d.]/g, ''))} formatter={(v) => `₱${Math.round(v).toLocaleString()}`} />
                        )
                    ) : (
                        value
                    )}
                </p>
                
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${growthColor}`}>
                        <GrowthIcon size={12}/>
                        <span>{growthPrefix}{growth}% vs last month</span>
                    </div>
                )}
                {growth === undefined && <p className="text-[10px] font-medium text-gray-400 mt-1">Real-time status</p>}
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} ${text} group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
            </div>
        </motion.div>
    );
};

export default function DashboardKPIs({ metrics, isLoading, shouldAnimateKPI }) {
    return (
        <div className="flex overflow-x-auto pb-2.5 gap-6 flex-nowrap snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {isLoading ? (
                <ArtisanSkeleton variant="stat" count={4} />
            ) : (
                <>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <MetricCard 
                            title="Total Revenue" 
                            value={`₱${Number(metrics.revenue).toLocaleString()}`} 
                            growth={metrics.revenue_growth} 
                            icon={DollarSign} 
                            bg="bg-emerald-50" 
                            text="text-emerald-600" 
                            animateValue={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <MetricCard 
                            title="Total Orders" 
                            value={metrics.orders} 
                            growth={metrics.orders_growth} 
                            icon={ShoppingBag} 
                            bg="bg-clay-50" 
                            text="text-clay-600" 
                            animateValue={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <MetricCard 
                            title="Total Customers" 
                            value={metrics.customers} 
                            growth={metrics.customers_growth} 
                            icon={Users} 
                            bg="bg-rose-50" 
                            text="text-rose-600" 
                            animateValue={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <MetricCard 
                            title="Avg. Order Value" 
                            value={`₱${Number(metrics.avg_value).toLocaleString()}`} 
                            growth={metrics.avg_growth} 
                            icon={CreditCard} 
                            bg="bg-stone-100" 
                            text="text-stone-600" 
                            animateValue={shouldAnimateKPI}
                        />
                    </div>
                </>
            )}
        </div>
    );
}

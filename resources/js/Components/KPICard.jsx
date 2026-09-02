import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

const Sparkline = ({ data, positive = true }) => {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 50;
    const height = 16;
    
    const points = data.map((v, i) => ({
        x: (i / (data.length - 1)) * width,
        y: height - ((v - min) / range) * height
    }));
    
    const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
    const strokeColor = positive ? '#10b981' : '#f43f5e';
    
    return (
        <svg width={width} height={height} className="overflow-visible opacity-60">
            <path
                d={path}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

/**
 * A reusable KPI (Key Performance Indicator) Card for dashboard statistics.
 * Supports animations, growth indicators, and sparklines.
 */
const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'text-clay-600', 
    bg = 'bg-clay-50',
    growth,
    growthSuffix = '',
    trendData = [],
    animate = true,
    formatter,
    subtitle
}) => {
    let growthColor = 'text-stone-500';
    let GrowthIcon = Minus;
    let growthPrefix = '';

    if (growth > 0) {
        growthColor = 'text-emerald-600';
        GrowthIcon = TrendingUp;
        growthPrefix = '+';
    } else if (growth < 0) {
        growthColor = 'text-rose-600';
        GrowthIcon = TrendingDown;
    }

    const displayFormatter = React.useMemo(() => {
        if (formatter) return formatter;
        
        const isCurrency = 
            (typeof value === 'string' && (value.includes('₱') || value.includes('PHP'))) ||
            (title && (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('profit') || title.toLowerCase().includes('value') || title.toLowerCase().includes('price')));
        
        return (v) => {
            const num = Math.round(Number(v) || 0);
            if (isCurrency) {
                if (num < 0) {
                    return `-₱${Math.abs(num).toLocaleString()}`;
                }
                return `₱${num.toLocaleString()}`;
            }
            return num.toLocaleString();
        };
    }, [formatter, value, title]);

    const hasSubtext = growth !== undefined || subtitle || (trendData && trendData.length > 0);

    const Front = (
        <div className={`flex justify-between h-full ${hasSubtext ? 'items-start' : 'items-center'}`}>
            <div className="min-w-0">
                <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider mb-1 truncate">
                    {title}
                </p>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                    <span className="print:hidden">
                        {animate && (typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^\d.-]/g, ''))))) ? (
                            <AnimatedCounter 
                                value={typeof value === 'number' ? value : parseFloat(value.replace(/[^\d.-]/g, ''))} 
                                formatter={displayFormatter}
                            />
                        ) : (
                            typeof value === 'number' ? displayFormatter(value) : value
                        )}
                    </span>
                    <span className="hidden print:block">
                        {typeof value === 'number' ? displayFormatter(value) : value}
                    </span>
                </h3>
                {hasSubtext && (
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                        {growth !== undefined && (
                            <div className={`flex items-center gap-1 text-[10px] font-bold ${growthColor} whitespace-nowrap shrink-0`}>
                                <GrowthIcon size={12} />
                                <span>{growthPrefix}{growth}%{growthSuffix}</span>
                            </div>
                        )}
                        {growth === undefined && subtitle && (
                            <span className="text-[10px] font-medium text-stone-400 truncate block">
                                {subtitle}
                            </span>
                        )}
                        {trendData && trendData.length > 0 && (
                            <div className="shrink-0">
                                <Sparkline data={trendData} positive={growth >= 0} />
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all shadow-2xs ${bg} ${color}`}
            >
                <Icon size={20} />
            </div>
        </div>
    );

    const cardContent = (
        <div className="relative w-full rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-stone-300 transition-all duration-200">
            {Front}
        </div>
    );

    if (animate) {
        const itemVariants = {
            hidden: { opacity: 0, scale: 0.95, y: 10 },
            show: { 
                opacity: 1, 
                scale: 1,
                y: 0,
                transition: { type: "spring", bounce: 0.3, duration: 0.8 }
            }
        };
        return (
            <motion.div variants={itemVariants}>
                {cardContent}
            </motion.div>
        );
    }

    return cardContent;
};

export default KPICard;

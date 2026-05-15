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
 * Supports animations, growth indicators, sparklines, and a 3D flip-for-breakdown interaction.
 */
const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'text-clay-600', 
    bg = 'bg-clay-50',
    growth,
    trendData = [],
    breakdown = null,
    animate = true,
    formatter
}) => {
    const [isFlipped, setIsFlipped] = React.useState(false);

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

    const defaultFormatter = (v) => {
        const isCurrency = 
            (typeof value === 'string' && (value.includes('₱') || value.includes('PHP'))) ||
            (title && (title.toLowerCase().includes('revenue') || title.toLowerCase().includes('profit') || title.toLowerCase().includes('value') || title.toLowerCase().includes('price')));
        
        if (isCurrency) {
            return `₱${Math.round(v).toLocaleString()}`;
        }
        return Math.round(v).toLocaleString();
    };

    const displayFormatter = formatter || defaultFormatter;

    const Front = (
        <div className="flex items-center justify-between h-full">
            <div className="min-w-0">
                <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-stone-400 truncate">
                    {title}
                </p>
                <h3 className="text-2xl font-bold text-stone-900 tracking-tight">
                    {typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^\d.]/g, '')))) ? (
                        <AnimatedCounter 
                            value={typeof value === 'number' ? value : parseFloat(value.replace(/[^\d.]/g, ''))} 
                            formatter={displayFormatter}
                        />
                    ) : (
                        value
                    )}
                </h3>
                <div className="flex items-center gap-3 mt-1.5">
                    {growth !== undefined && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${growthColor}`}>
                            <GrowthIcon size={12} />
                            <span>{growthPrefix}{growth}%</span>
                        </div>
                    )}
                    {trendData.length > 0 && (
                        <Sparkline data={trendData} positive={growth >= 0} />
                    )}
                </div>
            </div>
            <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-all shadow-sm ${bg} ${color}`}
            >
                <Icon size={22} />
            </div>
        </div>
    );

    const Back = breakdown ? (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                    Breakdown
                </p>
                <div className={`${bg} ${color} p-1 rounded-lg`}>
                    <Icon size={12} />
                </div>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                {Object.entries(breakdown).length > 0 ? (
                    Object.entries(breakdown).map(([label, val]) => (
                        <div key={label} className="flex items-center justify-between group/item">
                            <span className="text-[11px] text-stone-500 font-medium truncate pr-2">
                                {label}
                            </span>
                            <span className="text-[11px] text-stone-900 font-bold tabular-nums">
                                {typeof val === 'number' ? displayFormatter(val) : val}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex items-center justify-center">
                        <p className="text-[10px] text-stone-400 italic">No breakdown available</p>
                    </div>
                )}
            </div>
        </div>
    ) : null;

    const cardContent = (
        <div 
            className="relative h-28 w-full cursor-pointer [perspective:1000px]"
            onClick={() => breakdown && setIsFlipped(!isFlipped)}
        >
            <motion.div
                initial={false}
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                className="relative h-full w-full [transform-style:preserve-3d]"
            >
                <div 
                    className="absolute inset-0 h-full w-full rounded-3xl border border-stone-200 bg-white p-5 shadow-sm [backface-visibility:hidden]"
                    style={{ boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.8), 0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}
                >
                    {Front}
                </div>

                {breakdown && (
                    <div 
                        className="absolute inset-0 h-full w-full rounded-3xl border border-clay-100 bg-clay-50/30 p-5 shadow-inner [backface-visibility:hidden] [transform:rotateY(180deg)] backdrop-blur-sm"
                    >
                        {Back}
                    </div>
                )}
            </motion.div>
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

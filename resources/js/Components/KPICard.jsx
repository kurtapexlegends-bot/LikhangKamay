import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AnimatedCounter from './AnimatedCounter';

/**
 * A reusable KPI (Key Performance Indicator) Card for dashboard statistics.
 * Supports animations, growth indicators, and custom styling.
 */
const KPICard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'text-clay-600', 
    bg = 'bg-clay-50',
    growth,
    animate = true,
    formatter
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

    const content = (
        <div className="flex items-center justify-between">
            <div className="min-w-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-stone-400 truncate">
                    {title}
                </p>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value.replace(/[^\d.]/g, '')))) ? (
                        <AnimatedCounter 
                            value={typeof value === 'number' ? value : parseFloat(value.replace(/[^\d.]/g, ''))} 
                            formatter={displayFormatter}
                        />
                    ) : (
                        value
                    )}
                </h3>
                {growth !== undefined && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold mt-1 ${growthColor}`}>
                        <GrowthIcon size={12} />
                        <span>{growthPrefix}{growth}% vs last month</span>
                    </div>
                )}
            </div>
            <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110 ${bg} ${color}`}
            >
                <Icon size={20} />
            </div>
        </div>
    );

    if (animate) {
        const itemVariants = {
            hidden: { opacity: 0, y: 15 },
            show: { 
                opacity: 1, 
                y: 0,
                transition: { type: "spring", bounce: 0.3, duration: 0.6 }
            }
        };
        return (
            <motion.div 
                variants={itemVariants}
                // We don't set initial/animate here so it can inherit from StaggerContainer
                // If it's used standalone, the user can still pass initial="hidden" animate="show"
                className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
                style={{ boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
            >
                {content}
            </motion.div>
        );
    }


    return (
        <div 
            className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition-all hover:border-stone-300 hover:shadow-md"
            style={{ boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}
        >
            {content}
        </div>
    );
};

export default KPICard;

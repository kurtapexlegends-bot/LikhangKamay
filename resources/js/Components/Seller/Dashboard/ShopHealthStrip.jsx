import React from 'react';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, Box } from 'lucide-react';

export default function ShopHealthStrip({ metrics }) {
    if (!metrics.pending_orders && !metrics.stalled_orders && !metrics.low_stock_count) {
        return null;
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center gap-3 bg-white/40 backdrop-blur-md border border-stone-200/60 rounded-2xl p-3 px-4 shadow-sm"
        >
            <div className="flex items-center gap-2 pr-4 border-r border-stone-200">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Shop Health</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {metrics.stalled_orders > 0 && (
                    <Link 
                        href={route('orders.index')}
                        className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-100 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[44px] sm:min-h-0"
                    >
                        <AlertCircle size={14} />
                        <span>{metrics.stalled_orders} Stalled Orders</span>
                    </Link>
                )}

                {metrics.pending_orders > 0 && (
                    <Link 
                        href={route('orders.index', { status: 'Pending' })}
                        className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-100 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[44px] sm:min-h-0"
                    >
                        <ShoppingBag size={14} />
                        <span>{metrics.pending_orders} New Orders</span>
                    </Link>
                )}

                {metrics.low_stock_count > 0 && (
                    <Link 
                        href={route('products.index', { tab: 'Low Stock' })}
                        className="flex items-center gap-2 bg-clay-50 hover:bg-clay-100 text-clay-700 px-3 py-1.5 rounded-xl text-xs font-bold border border-clay-100 transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[44px] sm:min-h-0"
                    >
                        <Box size={14} />
                        <span>{metrics.low_stock_count} Low Stock Items</span>
                    </Link>
                )}
            </div>
        </motion.div>
    );
}

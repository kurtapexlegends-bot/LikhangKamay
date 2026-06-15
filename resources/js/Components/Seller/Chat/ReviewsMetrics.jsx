import React from 'react';
import { Star } from 'lucide-react';

export default function ReviewsMetrics({ stats, filter, setFilter }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Shop Average Rating */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col items-center justify-center text-center">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Shop Rating</h3>
                <h1 className="text-5xl font-black text-stone-900 mb-3">
                    {stats.average ? stats.average.toFixed(1) : '0.0'}
                </h1>
                <div className="flex items-center gap-0.5 mb-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                            key={star}
                            size={20}
                            className={star <= Math.round(stats.average || 0) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}
                        />
                    ))}
                </div>
                <p className="text-xs text-stone-500 font-medium">Based on {stats.total || 0} reviews</p>
            </div>

            {/* Stars Count Distribution */}
            <div className="md:col-span-2 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-stone-200 flex flex-col justify-center">
                <h3 className="text-base font-bold text-stone-900 mb-4">Rating Distribution</h3>
                <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = stats.stars ? stats.stars[star] : 0;
                        const percentage = (stats.total > 0) ? ((count || 0) / stats.total) * 100 : 0;
                        const starStr = star.toString();
                        const isFiltered = filter === starStr;

                        return (
                            <div 
                                key={star} 
                                className={`flex items-center gap-3 cursor-pointer transition-all hover:opacity-85 ${isFiltered ? 'opacity-100 scale-[1.01]' : 'opacity-75'}`} 
                                onClick={() => setFilter(isFiltered ? 'All' : starStr)}
                            >
                                <div className="flex items-center justify-end gap-1 w-10">
                                    <span className="text-xs font-bold text-stone-700">{star}</span>
                                    <Star size={12} className="fill-amber-400 text-amber-400" />
                                </div>
                                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-stone-600 w-10 text-right">{count || 0}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

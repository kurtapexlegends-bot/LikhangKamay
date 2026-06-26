import React from 'react';
import { Link } from '@inertiajs/react';
import { Star } from 'lucide-react';

export default function SatisfactionBreakdown({ stats, compact = false }) {
    const totalReviews = stats?.total || 0;
    const averageRating = stats?.average || 0.0;

    return (
        <div className={`bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full ${compact ? 'min-h-[350px]' : 'min-h-[300px]'}`}>
            <div className="flex justify-between items-center pb-3 border-b border-stone-100 mb-4">
                <div>
                    <h3 className="text-base font-bold text-stone-900 leading-none">Customer Ratings</h3>
                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Overall shop quality feedback</p>
                </div>
                {!compact && (
                    <Link href={route('reviews.index')} className="text-xs font-bold text-clay-600 hover:underline">View All</Link>
                )}
            </div>

            <div className="flex-1 flex flex-col justify-center">
                <div className={compact 
                    ? "flex flex-col gap-4 w-full" 
                    : "grid grid-cols-1 sm:grid-cols-12 gap-6 items-center satisfaction-breakdown-grid"
                }>
                    {/* Left: Score Box */}
                    <div className={compact 
                        ? "w-full flex items-center justify-between p-3.5 rounded-xl bg-stone-50 border border-stone-200/50 shadow-inner" 
                        : "sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-200/50 shadow-inner"
                    }>
                        {compact ? (
                            <>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-stone-900 tracking-tight leading-none">{Number(averageRating).toFixed(1)}</h1>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-0.5">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={11}
                                                    className={star <= Math.round(averageRating) ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1 leading-none">
                                            {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
                                        </p>
                                    </div>
                                </div>
                                <Link href={route('reviews.index')} className="text-[10px] font-extrabold uppercase tracking-widest text-clay-700 bg-white border border-stone-200/60 px-2.5 py-1.5 rounded-lg shadow-sm hover:bg-stone-50 active:scale-95 transition-all">
                                    Reviews
                                </Link>
                            </>
                        ) : (
                            <>
                                <h1 className="text-5xl font-black text-stone-900 tracking-tight mb-1">{Number(averageRating).toFixed(1)}</h1>
                                <div className="flex items-center gap-0.5 mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={14}
                                            className={star <= Math.round(averageRating) ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}
                                        />
                                    ))}
                                </div>
                                <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest leading-none">
                                    {totalReviews} {totalReviews === 1 ? 'Review' : 'Reviews'}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Right: Progress Lines */}
                    <div className={compact ? "w-full space-y-2" : "sm:col-span-7 space-y-2.5"}>
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = Number(stats?.breakdown?.[String(star)] || 0);
                            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                                <div key={star} className="flex items-center gap-3">
                                    <span className="text-[10px] font-extrabold text-stone-500 w-8 flex items-center justify-end gap-1">
                                        {star} <Star size={9} className="fill-amber-500 text-amber-500 shrink-0" />
                                    </span>
                                    <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percentage}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-black text-stone-400 w-6 text-right">{count}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

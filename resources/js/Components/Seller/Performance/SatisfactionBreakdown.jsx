import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import { Star } from 'lucide-react';

const mockReviews = [
    { id: 1, author: "Kurt Stanley T.", rating: 5, comment: "Beautiful clay vases! Truly handcrafted feel.", date: "1 month ago" },
    { id: 2, author: "Arianne C.", rating: 5, comment: "Excellent packaging and quick shipment.", date: "2 weeks ago" },
    { id: 3, author: "Maria L.", rating: 4, comment: "Very satisfied. Unique texture, looks great.", date: "3 weeks ago" }
];

export default function SatisfactionBreakdown({ stats }) {
    const totalReviews = stats?.total || 0;
    const averageRating = stats?.average || 0.0;
    const [reviewIndex, setReviewIndex] = useState(0);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full min-h-[300px]">
            <div className="flex justify-between items-center pb-3 border-b border-stone-100 mb-4">
                <div>
                    <h3 className="text-base font-bold text-stone-900 leading-none">Customer Ratings</h3>
                    <p className="text-[11px] text-stone-500 mt-1.5 leading-tight">Overall shop quality feedback</p>
                </div>
                <Link href={route('reviews.index')} className="text-xs font-bold text-clay-600 hover:underline">View All</Link>
            </div>

            <div className="flex-1 flex flex-col justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center satisfaction-breakdown-grid">
                    {/* Left: Score Box */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-stone-50 border border-stone-200/50 shadow-inner">
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
                    </div>

                    {/* Right: Progress Lines */}
                    <div className="sm:col-span-7 space-y-2.5">
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

            {/* Testimonials Slider */}
            <div className="mt-4 pt-4 border-t border-stone-100 flex flex-col gap-2">
                <p className="text-[9px] font-black uppercase tracking-wider text-stone-450">Featured Feedback</p>
                <div className="bg-stone-50/50 rounded-xl p-3 border border-stone-150 flex flex-col justify-between min-h-[90px] relative">
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-extrabold text-stone-700">{mockReviews[reviewIndex].author}</span>
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                        key={star}
                                        size={9}
                                        className={star <= mockReviews[reviewIndex].rating ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}
                                    />
                                ))}
                            </div>
                        </div>
                        <p className="text-[11px] text-stone-500 italic leading-relaxed">
                            "{mockReviews[reviewIndex].comment}"
                        </p>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[9px] text-stone-400">
                        <span>{mockReviews[reviewIndex].date}</span>
                        <div className="flex gap-1.5 print:hidden">
                            <button 
                                onClick={() => setReviewIndex((prev) => (prev - 1 + mockReviews.length) % mockReviews.length)}
                                className="px-1.5 py-0.5 hover:bg-stone-200/50 border border-stone-200 bg-white rounded transition-colors text-stone-500 font-extrabold"
                            >
                                &larr;
                            </button>
                            <button 
                                onClick={() => setReviewIndex((prev) => (prev + 1) % mockReviews.length)}
                                className="px-1.5 py-0.5 hover:bg-stone-200/50 border border-stone-200 bg-white rounded transition-colors text-stone-500 font-extrabold"
                            >
                                &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

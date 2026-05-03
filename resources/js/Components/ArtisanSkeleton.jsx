import React from 'react';

/**
 * ArtisanSkeleton - A premium, flexible skeleton loader system for LikhangKamay.
 * Uses the 'Artisan Glass' aesthetic with shimmer effects.
 */
export default function ArtisanSkeleton({ 
    variant = 'card', 
    count = 1, 
    className = "",
    gridClass = ""
}) {
    const Shimmer = () => (
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    );

    const CardSkeleton = () => (
        <div className={`bg-white rounded-2xl border border-stone-100 flex flex-col overflow-hidden shadow-sm ${className}`}>
            {/* Image Area */}
            <div className="aspect-square relative overflow-hidden bg-stone-100">
                <Shimmer />
            </div>
            {/* Content Area */}
            <div className="p-4 space-y-3">
                <div className="h-4 bg-stone-200 rounded-lg w-3/4 relative overflow-hidden"><Shimmer /></div>
                <div className="h-3 bg-stone-100 rounded-lg w-1/2 relative overflow-hidden"><Shimmer /></div>
                <div className="flex items-center gap-2 mt-4">
                    <div className="h-8 w-20 bg-stone-100 rounded-xl relative overflow-hidden"><Shimmer /></div>
                    <div className="h-8 w-8 bg-stone-50 rounded-full ml-auto relative overflow-hidden"><Shimmer /></div>
                </div>
            </div>
        </div>
    );

    const StatSkeleton = () => (
        <div className={`flex items-center justify-between rounded-2xl border border-stone-100 bg-white p-6 shadow-sm ${className}`}>
            <div className="space-y-3 flex-1">
                <div className="h-3 bg-stone-100 rounded-full w-24 relative overflow-hidden"><Shimmer /></div>
                <div className="h-8 bg-stone-200 rounded-xl w-32 relative overflow-hidden"><Shimmer /></div>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-stone-50 relative overflow-hidden ml-4">
                <Shimmer />
            </div>
        </div>
    );

    const ListSkeleton = () => (
        <div className={`flex items-center gap-4 py-4 px-6 border-b border-stone-50 bg-white ${className}`}>
            <div className="h-10 w-10 rounded-xl bg-stone-100 shrink-0 relative overflow-hidden"><Shimmer /></div>
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-stone-200 rounded-full w-1/3 relative overflow-hidden"><Shimmer /></div>
                <div className="h-2 bg-stone-100 rounded-full w-1/4 relative overflow-hidden"><Shimmer /></div>
            </div>
            <div className="h-6 w-16 bg-stone-50 rounded-full relative overflow-hidden"><Shimmer /></div>
            <div className="h-8 w-8 bg-stone-50 rounded-lg relative overflow-hidden"><Shimmer /></div>
        </div>
    );

    const CircleSkeleton = () => (
        <div className={`rounded-full bg-stone-100 relative overflow-hidden ${className}`}>
            <Shimmer />
        </div>
    );

    const TextSkeleton = () => (
        <div className={`h-4 bg-stone-100 rounded-lg relative overflow-hidden ${className}`}>
            <Shimmer />
        </div>
    );

    const skeletons = [...Array(count)].map((_, i) => {
        switch (variant) {
            case 'card': return <CardSkeleton key={i} />;
            case 'stat': return <StatSkeleton key={i} />;
            case 'list': return <ListSkeleton key={i} />;
            case 'circle': return <CircleSkeleton key={i} />;
            case 'text': return <TextSkeleton key={i} />;
            default: return <CardSkeleton key={i} />;
        }
    });

    if (gridClass) {
        return <div className={gridClass}>{skeletons}</div>;
    }

    return <>{skeletons}</>;
}

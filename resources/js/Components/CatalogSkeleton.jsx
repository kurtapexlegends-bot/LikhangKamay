import React from 'react';

export default function CatalogSkeleton() {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden animate-pulse">
                    {/* Image Skeleton */}
                    <div className="aspect-square relative overflow-hidden bg-stone-100">
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    </div>
                    {/* Content Skeleton */}
                    <div className="p-3 flex flex-col flex-1 gap-2.5">
                        <div className="h-3.5 bg-stone-200 rounded-md w-3/4"></div>
                        <div className="h-3.5 bg-stone-100 rounded-md w-1/2"></div>
                        <div className="flex items-center gap-1.5 mt-auto pt-2">
                            <div className="h-3 bg-stone-200 rounded-md w-8"></div>
                            <div className="h-3 bg-stone-100 rounded-md w-12"></div>
                        </div>
                        <div className="h-4 bg-stone-200 rounded-md w-16 mt-0.5"></div>
                    </div>
                </div>
            ))}
        </div>
    );
}
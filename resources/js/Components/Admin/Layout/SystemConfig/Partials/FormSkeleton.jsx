import React from 'react';

export default function FormSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-clay-100 p-6 space-y-6 shadow-sm animate-pulse">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-stone-200 rounded-md"></div>
                    <div className="w-32 h-4 bg-stone-200 rounded-md"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="w-20 h-3 bg-stone-200 rounded"></div>
                        <div className="w-full h-11 bg-stone-100 rounded-xl"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="w-24 h-3 bg-stone-200 rounded"></div>
                        <div className="w-full h-11 bg-stone-100 rounded-xl"></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-100">
                    <div className="space-y-2">
                        <div className="w-20 h-3 bg-stone-200 rounded"></div>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-stone-100 rounded-xl"></div>
                            <div className="flex-1 h-9 bg-stone-100 rounded-xl"></div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="w-20 h-3 bg-stone-200 rounded"></div>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-stone-100 rounded-xl"></div>
                            <div className="flex-1 h-9 bg-stone-100 rounded-xl"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t border-stone-100 space-y-4">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-stone-200 rounded-md"></div>
                    <div className="w-28 h-4 bg-stone-200 rounded-md"></div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="w-20 h-3 bg-stone-200 rounded"></div>
                        <div className="w-full h-11 bg-stone-100 rounded-xl"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="w-24 h-3 bg-stone-200 rounded"></div>
                        <div className="w-full h-24 bg-stone-100 rounded-xl"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}

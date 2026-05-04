import React from 'react';

export default function TextAreaWithCounter({ 
    value, 
    onChange, 
    maxLength, 
    className = '', 
    placeholder = '', 
    rows = 3,
    ...props 
}) {
    const currentLength = value?.length || 0;
    const isNearLimit = maxLength && currentLength > maxLength * 0.9;
    const isAtLimit = maxLength && currentLength >= maxLength;

    return (
        <div className="relative">
            <textarea
                {...props}
                value={value}
                onChange={onChange}
                maxLength={maxLength}
                rows={rows}
                placeholder={placeholder}
                className={`w-full rounded-xl shadow-sm transition-all duration-500 outline-none disabled:bg-stone-100 disabled:text-stone-500 disabled:border-stone-200 disabled:shadow-none disabled:cursor-not-allowed ${className} ${
                    isAtLimit 
                        ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20' 
                        : 'border-stone-200 bg-white text-stone-900 focus:border-clay-500 focus:ring-4 focus:ring-clay-500/20 hover:border-stone-300 disabled:hover:border-stone-200'
                }`}
            />
            {maxLength && (
                <div 
                    className={`absolute bottom-2 right-3 text-xs font-medium transition-colors duration-300 bg-white/80 px-1 rounded backdrop-blur-sm ${
                        isAtLimit ? 'text-red-500' : isNearLimit ? 'text-orange-500' : 'text-gray-400'
                    }`}
                >
                    {currentLength} / {maxLength}
                </div>
            )}
        </div>
    );
}

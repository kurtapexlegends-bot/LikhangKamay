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
                className={`w-full rounded-xl border-gray-300 shadow-sm transition-all duration-300 focus:border-clay-500 focus:ring-clay-500 ${className} ${
                    isAtLimit ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''
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

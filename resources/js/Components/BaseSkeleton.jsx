import React from 'react';

export default function BaseSkeleton({ className = '', ...props }) {
    return (
        <div 
            className={`animate-pulse bg-gray-200 rounded-xl ${className}`} 
            {...props}
        />
    );
}

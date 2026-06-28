import React from 'react';

export default function StepPill({ number, icon, label, active, current }) {
    return (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 transition-all duration-300 ${
            current ? 'bg-clay-600 text-white shadow-md shadow-clay-200 scale-105' : active ? 'bg-clay-100 text-clay-700' : 'text-gray-400'
        }`}>
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                current ? 'bg-white text-clay-600 animate-pulse' : active ? 'bg-clay-200 text-clay-700' : 'bg-gray-100'
            }`}>
                {icon || number}
            </div>
            <span className="hidden text-sm font-medium sm:block">{label}</span>
        </div>
    );
}

import React from 'react';
import { motion } from 'framer-motion';

export default function ModuleToggle({ label, description, enabled, onToggle, icon: Icon, color, locked = false }) {
    return (
        <motion.button
            onClick={locked ? undefined : onToggle}
            whileTap={locked ? {} : { scale: 0.98, x: 2 }}
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay-500/30 ${enabled ? 'border-clay-100 bg-clay-50' : 'border-transparent bg-white'} ${locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:bg-gray-50'}`}
            type="button"
        >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${enabled ? color : 'bg-gray-100 text-gray-400'}`}>
                {Icon && <Icon size={16} />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-xs font-bold transition-colors ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
                        {label}
                    </span>
                    
                    <div className={`w-8 h-4.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex-shrink-0 relative ${enabled ? 'bg-clay-600' : 'bg-gray-200'}`}>
                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${enabled ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 leading-tight pr-2">{description}</p>
            </div>
        </motion.button>
    );
}

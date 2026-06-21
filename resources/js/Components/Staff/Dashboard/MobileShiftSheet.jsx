import React from 'react';
import { motion } from 'framer-motion';
import StaffAttendanceDock from '@/Components/Seller/Sidebar/StaffAttendanceDock';

export default function MobileShiftSheet({
    onClose,
    attendance,
    sellerSidebar,
    hub
}) {
    const visibleModules = sellerSidebar?.visibleModules || hub?.visibleModules || [];

    return (
        <>
            {/* Backdrop overlay */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs lg:hidden"
            />
            
            {/* Slide-up sheet panel */}
            <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border-t border-stone-200 bg-white p-6 shadow-2xl pb-10 lg:hidden max-h-[85vh] overflow-y-auto"
            >
                {/* Drag / Pull indicator */}
                <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-stone-200" />
                
                <div className="flex items-center justify-between border-b border-stone-150 pb-3.5 mb-5">
                    <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-stone-400">Shift Management</h3>
                    <button 
                        type="button"
                        onClick={onClose}
                        className="text-stone-500 hover:text-stone-700 text-xs font-extrabold uppercase tracking-wider"
                    >
                        Done
                    </button>
                </div>

                <div className="space-y-5">
                    <StaffAttendanceDock attendance={attendance} />
                    
                    <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mb-2">
                            Session Privileges
                        </p>
                        {visibleModules.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                                {visibleModules.map((module) => (
                                    <span
                                        key={module}
                                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-wide text-stone-600"
                                    >
                                        {module.replace(/_/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-stone-400">Privileges will list here after clocking in.</p>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}

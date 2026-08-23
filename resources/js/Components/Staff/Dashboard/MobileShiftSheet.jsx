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

                <div className="space-y-4">
                    <StaffAttendanceDock attendance={attendance} />
                    
                    {/* Workshop / Shift Schedule & Lunch Break Policy */}
                    {attendance?.shift_policy && (
                        <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                                    {attendance.shift_policy.is_custom ? 'Personal Shift' : 'Workshop Schedule'}
                                </span>
                                <span className="text-[10px] font-bold text-amber-800 font-mono">
                                    {attendance.shift_policy.shift_start_time || '08:00'} - {attendance.shift_policy.shift_end_time || '17:00'}
                                </span>
                            </div>
                            {attendance.shift_policy.is_today_rest_day && (
                                <div className="text-[10px] font-bold text-amber-800 bg-amber-100/70 py-1 px-2 rounded-lg text-center">
                                    Scheduled Rest Day Today
                                </div>
                            )}
                            <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium pt-1 border-t border-amber-200/60">
                                <span>Earliest Entry</span>
                                <span className="font-bold text-stone-800 font-mono">
                                    {attendance.shift_policy.earliest_clock_in_minutes ?? 30}m before shift
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-stone-600 font-medium pt-1 border-t border-amber-200/60">
                                <span>Lunch Break</span>
                                <span className="font-bold text-stone-800 font-mono">
                                    {attendance.shift_policy.break_window_start || '11:30'} - {attendance.shift_policy.break_window_end || '13:30'} ({attendance.shift_policy.break_allowance_minutes || 60}m)
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-stone-400 mb-2">
                            Assigned Modules
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

import React from 'react';
import { ChevronRight, CalendarDays, Users } from 'lucide-react';
import {
    formatPeso,
    getAttendanceStatus,
    formatWorkedHoursSummary,
    formatAttendanceTime
} from '@/utils/hrHelpers';

export default function StaffRosterList({
    staff = [],
    selectedEmployeeId,
    onSelectEmployee,
    isDualPane = false
}) {
    if (!staff.length) {
        return (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400">
                <Users size={32} className="mx-auto mb-2 text-stone-300" />
                <p className="text-sm font-bold text-stone-700">No artisans match your criteria</p>
                <p className="text-xs text-stone-400 mt-1">Try resetting your filters or search keywords.</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-stone-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="divide-y divide-stone-100">
                {staff.map((emp) => {
                    const isSelected = emp.id === selectedEmployeeId;
                    const attendanceMeta = getAttendanceStatus(emp.attendance);
                    const isClockedIn = emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session;
                    const initials = emp.name ? emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'LK';

                    return (
                        <div
                            key={emp.id}
                            onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                            className={`relative p-4 cursor-pointer transition-colors duration-150 flex items-center justify-between gap-3 ${
                                isSelected
                                    ? 'bg-[#FCF7F2]/90'
                                    : 'hover:bg-stone-50/80'
                            }`}
                        >
                            {/* High-visibility active indicator stripe */}
                            {isSelected && (
                                <span
                                    className="absolute left-0 top-2 bottom-2 w-1.5 bg-clay-600 rounded-r-full"
                                    aria-hidden="true"
                                />
                            )}

                            <div className="flex items-center gap-3.5 min-w-0">
                                <div
                                    className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs shrink-0 border transition-colors ${
                                        isSelected
                                            ? 'bg-clay-100 text-clay-800 border-clay-200/80 font-black'
                                            : 'bg-stone-100 text-stone-700 font-bold border-stone-200/80'
                                    }`}
                                >
                                    {initials}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`font-bold text-sm truncate ${
                                                isSelected ? 'text-clay-950 font-black' : 'text-stone-900'
                                            }`}
                                        >
                                            {emp.name}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${attendanceMeta.className}`}>
                                            {isClockedIn && (
                                                <span className="relative flex h-1.5 w-1.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                                </span>
                                            )}
                                            {attendanceMeta.label}
                                        </span>
                                    </div>
                                    <div className="text-xs text-stone-500 truncate mt-0.5">
                                        {emp.role || 'Studio Artisan'} • ID: {emp.employee_id || 'LK-STAFF'}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                                {emp.attendance?.has_attendance_source && (
                                    <div className="hidden xl:block text-right text-xs">
                                        <div className="text-stone-500 text-[11px]">First Today</div>
                                        <div className="font-semibold text-stone-700">
                                            {emp.attendance?.today_first_clock_in
                                                ? formatAttendanceTime(emp.attendance.today_first_clock_in)
                                                : 'No punch yet'}
                                        </div>
                                    </div>
                                )}

                                <div className="text-right">
                                    <div className="text-xs font-bold text-stone-900">
                                        {formatPeso(emp.salary)}
                                        <span className="text-[10px] text-stone-400 font-normal">/mo</span>
                                    </div>
                                    <div className="text-[11px] text-stone-500">
                                        {formatWorkedHoursSummary(emp.attendance)}
                                    </div>
                                </div>

                                <ChevronRight size={16} className={`transition shrink-0 ${isSelected ? 'text-clay-600 translate-x-0.5' : 'text-stone-300'}`} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

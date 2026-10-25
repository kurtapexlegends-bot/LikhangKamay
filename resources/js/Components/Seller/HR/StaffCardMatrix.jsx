import React from 'react';
import { Calendar, Clock, Edit3, UserPlus, Users, MapPin } from 'lucide-react';
import {
    formatPeso,
    getAttendanceStatus,
    formatWorkedHoursSummary,
    formatAttendanceTime,
    getEmployeeShiftLabel
} from '@/utils/hrHelpers';

export default function StaffCardMatrix({
    staff = [],
    selectedEmployeeId,
    onSelectEmployee,
    canEditHrRecords,
    openEditModal,
    openAttendanceModal,
    openTimeCard,
    onAddClick,
    isDualPane = false
}) {
    return (
        <div className={`grid gap-4 ${
            isDualPane
                ? 'grid-cols-1 xl:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
        }`}>
            {staff.map((emp) => {
                const attendanceMeta = getAttendanceStatus(emp.attendance);
                const isClockedIn = emp.attendance?.current_state === 'clocked_in' || emp.attendance?.open_session;
                const isPaused = emp.attendance?.current_state === 'paused';
                const isSelected = emp.id === selectedEmployeeId;
                const initials = emp.name ? emp.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'LK';
                const monthlyBase = Number(emp.salary || 0);
                const cycleEst = monthlyBase / 2;

                return (
                    <div
                        key={emp.id}
                        onClick={() => onSelectEmployee && onSelectEmployee(emp)}
                        className={`bg-white rounded-3xl p-5 shadow-sm transition hover:shadow-md cursor-pointer flex flex-col justify-between space-y-4 border-2 ${
                            isSelected
                                ? 'border-clay-600 ring-2 ring-clay-500/20 bg-[#FCF7F2]/40'
                                : isClockedIn
                                    ? 'border-emerald-500/40 hover:border-emerald-500'
                                    : isPaused
                                        ? 'border-amber-400/50 hover:border-amber-400'
                                        : 'border-stone-200/80 hover:border-stone-300'
                        }`}
                    >
                        <div className="space-y-3">
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                                <div className="w-12 h-12 rounded-2xl bg-[#FCF7F2] text-clay-700 font-black text-sm flex items-center justify-center border border-[#E7D8C9] shrink-0">
                                    {initials}
                                </div>

                                <div className="flex items-center gap-1">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${attendanceMeta.className}`}>
                                        {isClockedIn && (
                                            <span className="relative flex h-1.5 w-1.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                            </span>
                                        )}
                                        {attendanceMeta.label}
                                    </span>

                                    {canEditHrRecords && openEditModal && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openEditModal(emp);
                                            }}
                                            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition"
                                            title="Edit Artisan"
                                            aria-label="Edit Artisan"
                                        >
                                            <Edit3 size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Artisan Name & ID */}
                            <div>
                                <h4 className="font-bold text-sm text-stone-900 truncate">{emp.name}</h4>
                                <p className="text-xs text-stone-500 truncate">{emp.role || 'Studio Artisan'}</p>
                                <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md font-medium">
                                    ID: {emp.employee_id || 'LK-STAFF'}
                                </div>
                            </div>

                            {/* Compensation Snapshot */}
                            <div className="bg-[#FAF8F5] rounded-2xl p-3 text-xs space-y-1.5 border border-stone-200/60">
                                <div className="flex justify-between items-center text-stone-600">
                                    <span>Monthly Base</span>
                                    <span className="font-bold text-stone-900">{formatPeso(monthlyBase)}</span>
                                </div>
                                <div className="flex justify-between items-center text-stone-600">
                                    <span>Semi-Monthly Est.</span>
                                    <span className="font-black text-emerald-700">{formatPeso(cycleEst)}</span>
                                </div>
                            </div>

                            {/* Shift info */}
                            <div className="text-[11px] text-stone-500 space-y-0.5">
                                {emp.attendance?.has_attendance_source ? (
                                    <div>
                                        First punch: {emp.attendance?.today_first_clock_in
                                            ? formatAttendanceTime(emp.attendance.today_first_clock_in)
                                            : 'No punch today'}
                                    </div>
                                ) : (
                                    <div>Shift: {getEmployeeShiftLabel(emp)}</div>
                                )}
                                <div>Logged: {formatWorkedHoursSummary(emp.attendance)}</div>
                            </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-2 flex gap-2 border-t border-stone-100">
                            {emp.attendance?.has_attendance_source && openAttendanceModal && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openAttendanceModal(emp);
                                    }}
                                    className="flex-1 py-2 px-2.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition flex items-center justify-center gap-1 min-h-[38px]"
                                >
                                    <Calendar size={13} />
                                    <span>Dates</span>
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openTimeCard && openTimeCard(emp);
                                }}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition flex items-center justify-center gap-1 min-h-[38px]"
                            >
                                <Clock size={13} />
                                <span>Time Card</span>
                            </button>
                        </div>
                    </div>
                );
            })}

            {/* Add Artisan Dotted Card */}
            {canEditHrRecords && onAddClick && (
                <div
                    onClick={onAddClick}
                    className="border-2 border-dashed border-stone-200 hover:border-clay-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition bg-stone-50/50 hover:bg-[#FCF7F2]/50 group min-h-[260px]"
                >
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 group-hover:text-clay-700 group-hover:bg-[#FCF7F2] transition flex items-center justify-center mb-2 border border-stone-200">
                        <UserPlus size={20} />
                    </div>
                    <span className="text-sm font-bold text-stone-800 group-hover:text-clay-800">Add New Artisan</span>
                    <span className="text-xs text-stone-400 mt-1 max-w-[180px]">
                        Assign workstation, schedule, and salary
                    </span>
                </div>
            )}
        </div>
    );
}

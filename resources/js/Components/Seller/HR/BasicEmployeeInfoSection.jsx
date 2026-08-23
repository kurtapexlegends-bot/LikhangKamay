import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle, User, Banknote, MapPin, Clock, Calendar, Briefcase } from 'lucide-react';
import {
    EMPLOYEE_ROLE_OPTIONS,
    modalFieldClass,
    modalFieldWithIconClass,
    modalSelectClass
} from '@/utils/hrHelpers';

const DAYS = [
    { key: 'mon', label: 'Mon', full: 'Monday' },
    { key: 'tue', label: 'Tue', full: 'Tuesday' },
    { key: 'wed', label: 'Wed', full: 'Wednesday' },
    { key: 'thu', label: 'Thu', full: 'Thursday' },
    { key: 'fri', label: 'Fri', full: 'Friday' },
    { key: 'sat', label: 'Sat', full: 'Saturday' },
    { key: 'sun', label: 'Sun', full: 'Sunday' },
];

export default function BasicEmployeeInfoSection({
    data,
    setData,
    errors,
    showLinkedLoginUpdateFields,
    getPresetRoleLabel,
    handleManualRoleChange,
    employeeIdValidation,
    isEmployeeIdSaved,
    sellerLocations = [],
    sellerSettings = {},
}) {
    const isCustomSchedule = data.schedule_type === 'custom';
    const activeWorkingDays = Array.isArray(data.working_days) ? data.working_days : [];

    const defaultShiftStart = sellerSettings.shift_start_time || '08:00';
    const defaultShiftEnd = sellerSettings.shift_end_time || '17:00';
    const defaultHours = sellerSettings.standard_workday_hours || 8.0;
    const factorMethod = sellerSettings.payroll_factor_method || 'custom';
    const workingDaysCount = sellerSettings.payroll_working_days ?? 22;

    const defaultScheduleLabel = factorMethod === '261'
        ? 'Mon–Fri (5 days/wk)'
        : factorMethod === '313'
        ? 'Mon–Sat (6 days/wk)'
        : `${workingDaysCount} days/mo (Custom Schedule)`;

    const toggleDay = (dayKey) => {
        if (activeWorkingDays.includes(dayKey)) {
            setData('working_days', activeWorkingDays.filter(d => d !== dayKey));
        } else {
            setData('working_days', [...activeWorkingDays, dayKey]);
        }
    };

    const applyPresetDays = (preset) => {
        if (preset === 'mon-fri') {
            setData('working_days', ['mon', 'tue', 'wed', 'thu', 'fri']);
        } else if (preset === 'mon-sat') {
            setData('working_days', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
        } else if (preset === 'weekends') {
            setData('working_days', ['sat', 'sun']);
        } else if (preset === 'all') {
            setData('working_days', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
        }
    };

    return (
        <div className="space-y-4">
            {/* Primary Details Card (Identity, Role, Salary) */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                    <User size={14} className="text-clay-600" />
                    <span>Staff Details &amp; Compensation</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Legal Full Name */}
                    <div className="sm:col-span-8">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Legal Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            className={`${modalFieldClass} ${errors.name ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5`}
                            placeholder="e.g. Maria Santos"
                            value={data.name}
                            onChange={e => setData('name', e.target.value)}
                            required
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
                    </div>

                    {/* Employee ID */}
                    <div className="sm:col-span-4">
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-stone-700">
                                Employee ID <span className="text-rose-500">*</span>
                            </label>
                            {isEmployeeIdSaved && (
                                <span className="text-[10px] text-stone-400 font-medium">Saved</span>
                            )}
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                className={`${modalFieldWithIconClass} ${employeeIdValidation.isValid === false || errors.employee_id ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 uppercase font-semibold`}
                                placeholder="EMP-001"
                                value={data.employee_id}
                                maxLength={12}
                                onChange={e => {
                                    const cleaned = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12);
                                    setData('employee_id', cleaned);
                                }}
                                required
                            />
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                {data.employee_id && !isEmployeeIdSaved && (
                                    employeeIdValidation.isValid === null ? (
                                        <Loader2 size={14} className="animate-spin text-stone-400" />
                                    ) : employeeIdValidation.isValid ? (
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                    ) : (
                                        <AlertTriangle size={14} className="text-rose-500" />
                                    )
                                )}
                            </div>
                        </div>
                        {employeeIdValidation.isValid === false && (
                            <p className="mt-1 text-[11px] font-semibold text-rose-600">
                                {employeeIdValidation.message}
                            </p>
                        )}
                        {errors.employee_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.employee_id}</p>}
                    </div>

                    {/* Job Role / Position */}
                    <div className="sm:col-span-6">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Job Role / Position <span className="text-rose-500">*</span>
                        </label>
                        {showLinkedLoginUpdateFields ? (
                            <input
                                type="text"
                                className="w-full rounded-xl border border-stone-200 bg-stone-100/80 px-3 py-1.5 text-xs font-semibold text-stone-600 cursor-not-allowed h-9.5"
                                value={getPresetRoleLabel(data.staff_role_preset_key)}
                                disabled
                            />
                        ) : (
                            <select
                                className={`${modalSelectClass} ${errors.role ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} h-9.5 text-xs font-medium`}
                                value={data.role}
                                onChange={e => handleManualRoleChange(e.target.value)}
                            >
                                {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                                    <option key={roleOption} value={roleOption}>{roleOption}</option>
                                ))}
                            </select>
                        )}
                        {errors.role && <p className="mt-1 text-xs text-red-500 font-medium">{errors.role}</p>}
                    </div>

                    {/* Monthly Base Salary */}
                    <div className="sm:col-span-6">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Monthly Base Salary <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                                ₱
                            </span>
                            <input
                                type="number"
                                min="0"
                                step="any"
                                className={`w-full rounded-xl border border-stone-200 pl-7 pr-3 py-1.5 text-xs font-bold text-stone-900 placeholder:text-stone-400 focus:border-clay-500 focus:ring-1 focus:ring-clay-500/20 transition ${
                                    errors.salary ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''
                                } h-9.5`}
                                placeholder="0.00"
                                value={data.salary}
                                onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                                onChange={e => setData('salary', e.target.value.replace(/-/g, ''))}
                                required
                            />
                        </div>
                        {errors.salary && <p className="mt-1 text-xs text-red-500 font-medium">{errors.salary}</p>}
                    </div>
                </div>
            </div>

            {/* Work Schedule & Shift Policy Card */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                        <Clock size={14} className="text-clay-600" />
                        <span>Work Schedule &amp; Shift Policy</span>
                    </div>

                    {/* Schedule Type Segmented Toggle */}
                    <div className="inline-flex rounded-xl border border-stone-200 bg-stone-50 p-0.5 text-[11px] font-bold">
                        <button
                            type="button"
                            onClick={() => setData('schedule_type', 'default')}
                            className={`rounded-lg px-2.5 py-1 transition ${
                                !isCustomSchedule
                                    ? 'bg-white text-stone-900 shadow-xs'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            Shop Default
                        </button>
                        <button
                            type="button"
                            onClick={() => setData('schedule_type', 'custom')}
                            className={`rounded-lg px-2.5 py-1 transition ${
                                isCustomSchedule
                                    ? 'bg-clay-600 text-white shadow-xs'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            Custom Shift
                        </button>
                    </div>
                </div>

                {!isCustomSchedule ? (
                    <div className="rounded-xl border border-stone-100 bg-[#FDFBF9] p-3.5 flex items-center justify-between text-xs text-stone-600">
                        <div className="space-y-0.5">
                            <span className="font-semibold text-stone-800 block">Inheriting Workshop Default Policy</span>
                            <span className="text-[11px] text-stone-500 block">
                                Shift: {defaultShiftStart} – {defaultShiftEnd} • {Number(defaultHours).toFixed(2)} hrs/day • {defaultScheduleLabel}
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                            Automatic
                        </span>
                    </div>
                ) : (
                    <div className="space-y-3.5 pt-1">
                        {/* Working Days Selector */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[11px] font-bold text-stone-700 block">
                                    Assigned Working Days <span className="text-rose-500">*</span>
                                </label>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => applyPresetDays('mon-fri')}
                                        className="text-[10px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 px-1.5 py-0.5 rounded border border-clay-200/60 transition"
                                    >
                                        Mon–Fri
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPresetDays('mon-sat')}
                                        className="text-[10px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 px-1.5 py-0.5 rounded border border-clay-200/60 transition"
                                    >
                                        Mon–Sat
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyPresetDays('weekends')}
                                        className="text-[10px] font-bold text-clay-700 hover:text-clay-800 bg-clay-50 hover:bg-clay-100 px-1.5 py-0.5 rounded border border-clay-200/60 transition"
                                    >
                                        Weekends
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 gap-1.5">
                                {DAYS.map(day => {
                                    const isSelected = activeWorkingDays.includes(day.key);
                                    return (
                                        <button
                                            key={day.key}
                                            type="button"
                                            onClick={() => toggleDay(day.key)}
                                            className={`rounded-xl py-2 text-xs font-bold transition flex flex-col items-center justify-center border ${
                                                isSelected
                                                    ? 'border-clay-600 bg-clay-600 text-white shadow-xs'
                                                    : 'border-stone-200 bg-stone-50/60 text-stone-600 hover:bg-stone-100'
                                            }`}
                                        >
                                            <span>{day.label}</span>
                                            <span className={`text-[9px] font-medium ${isSelected ? 'text-clay-100' : 'text-stone-400'}`}>
                                                {isSelected ? 'Work' : 'Rest'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            {activeWorkingDays.length === 0 && (
                                <p className="mt-1.5 text-[11px] text-amber-700 font-medium">
                                    Please select at least 1 working day for this custom schedule.
                                </p>
                            )}
                        </div>

                        {/* Shift Times & Standard Daily Hours */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Shift Start Time
                                </label>
                                <input
                                    type="time"
                                    className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                    value={data.shift_start_time || defaultShiftStart}
                                    onChange={e => setData('shift_start_time', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Shift End Time
                                </label>
                                <input
                                    type="time"
                                    className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                    value={data.shift_end_time || defaultShiftEnd}
                                    onChange={e => setData('shift_end_time', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-[11px] font-bold text-stone-700">
                                    Daily Standard Hours
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    step="0.5"
                                    className={`${modalFieldClass} h-9.5 text-xs font-medium`}
                                    placeholder={`${defaultHours}`}
                                    value={data.standard_workday_hours || ''}
                                    onChange={e => setData('standard_workday_hours', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Attendance & Location Card */}
            <div className="rounded-2xl border border-stone-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center gap-2 text-stone-800 font-bold text-xs uppercase tracking-wider">
                    <MapPin size={14} className="text-amber-600" />
                    <span>Workshop Location &amp; Clock-In</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center">
                    {/* Assigned Location */}
                    <div className="sm:col-span-7">
                        <label className="mb-1 block text-[11px] font-bold text-stone-700">
                            Assigned Workshop Location
                        </label>
                        <select
                            className={`${modalSelectClass} h-9.5 text-xs font-medium`}
                            value={data.assigned_location_id || ''}
                            onChange={e => setData('assigned_location_id', e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">No location required (anywhere)</option>
                            {(sellerLocations || []).map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    {loc.name} ({loc.radius_meters}m area)
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Remote / Field Worker Switch */}
                    <div className="sm:col-span-5 sm:pt-4">
                        <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-stone-200/80 bg-stone-50/60 hover:bg-stone-50 cursor-pointer transition select-none">
                            <input
                                type="checkbox"
                                id="allow_remote_clock_in"
                                checked={!!data.allow_remote_clock_in}
                                onChange={e => setData('allow_remote_clock_in', e.target.checked)}
                                className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500"
                            />
                            <div className="min-w-0">
                                <span className="text-xs font-bold text-stone-800 block leading-tight">
                                    Field / Remote Worker
                                </span>
                                <span className="text-[10px] text-stone-500 font-medium block">
                                    Allow clocking in outside workshop
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}

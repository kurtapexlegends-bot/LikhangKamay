import React from 'react';
import SlideOverDrawer from '@/Components/SlideOverDrawer';

export function TimeCardFilterFields({
    draftAnomaly,
    setDraftAnomaly,
    draftWorkday,
    setDraftWorkday,
    draftPhoto,
    setDraftPhoto,
    draftSort,
    setDraftSort,
    draftStatus,
    setDraftStatus,
    month,
    onMonthChange,
    department,
}) {
    return (
        <div className="space-y-3.5 text-left text-xs">
            {department && (
                <div className="rounded-xl border border-stone-200/70 bg-stone-50/70 p-2 text-stone-600">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Department / Role</span>
                    <span className="font-bold text-stone-800 text-xs">{department}</span>
                </div>
            )}

            {month !== undefined && onMonthChange && (
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                        Audit Period
                    </label>
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => onMonthChange(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                    />
                </div>
            )}

            {draftStatus !== undefined && setDraftStatus && (
                <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                        Shift Status
                    </label>
                    <select
                        value={draftStatus}
                        onChange={(e) => setDraftStatus(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                    >
                        <option value="all">All Shifts</option>
                        <option value="pending">Pending Review</option>
                        <option value="offsite">Off-Site Shifts</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Declined</option>
                    </select>
                </div>
            )}

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Shift Condition
                </label>
                <select
                    value={draftAnomaly}
                    onChange={(e) => setDraftAnomaly(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Shift Durations</option>
                    <option value="overtime">Overtime Shifts (Over 8 hrs)</option>
                    <option value="undertime">Undertime / Tardy Shifts</option>
                    <option value="autopaused">Auto-Paused Shifts</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Workday Type
                </label>
                <select
                    value={draftWorkday}
                    onChange={(e) => setDraftWorkday(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Days (Mon–Sun)</option>
                    <option value="weekdays">Regular Weekdays (Mon–Fri)</option>
                    <option value="weekends">Weekends &amp; Rest Days (Sat–Sun)</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Photo Verification
                </label>
                <select
                    value={draftPhoto}
                    onChange={(e) => setDraftPhoto(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="all">All Shifts</option>
                    <option value="with_photo">With Face Photo Check</option>
                    <option value="without_photo">Without Photo Check</option>
                </select>
            </div>

            <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    Sort Order
                </label>
                <select
                    value={draftSort}
                    onChange={(e) => setDraftSort(e.target.value)}
                    className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-800 outline-none focus:border-clay-500 bg-white"
                >
                    <option value="date_desc">Date: Newest First</option>
                    <option value="date_asc">Date: Oldest First</option>
                    <option value="duration_desc">Duration: Longest First</option>
                    <option value="duration_asc">Duration: Shortest First</option>
                </select>
            </div>
        </div>
    );
}

export default function TimeCardFilterPopover({
    isDrawerOpen,
    setIsDrawerOpen,
    onReset,
    onApply,
    draftAnomaly,
    setDraftAnomaly,
    draftWorkday,
    setDraftWorkday,
    draftPhoto,
    setDraftPhoto,
    draftSort,
    setDraftSort,
    draftStatus,
    setDraftStatus,
    month,
    onMonthChange,
    department,
}) {
    return (
        <SlideOverDrawer
            show={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            title="Filter Shifts"
            position="bottom"
            widthClass="max-w-md"
            footer={
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex-1 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition min-h-[42px]"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onApply}
                        className="flex-1 rounded-xl bg-clay-700 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-clay-800 transition min-h-[42px]"
                    >
                        Apply Filters
                    </button>
                </div>
            }
        >
            <div className="space-y-4 py-2">
                <TimeCardFilterFields
                    draftAnomaly={draftAnomaly}
                    setDraftAnomaly={setDraftAnomaly}
                    draftWorkday={draftWorkday}
                    setDraftWorkday={setDraftWorkday}
                    draftPhoto={draftPhoto}
                    setDraftPhoto={setDraftPhoto}
                    draftSort={draftSort}
                    setDraftSort={setDraftSort}
                    draftStatus={draftStatus}
                    setDraftStatus={setDraftStatus}
                    month={month}
                    onMonthChange={onMonthChange}
                    department={department}
                />
            </div>
        </SlideOverDrawer>
    );
}

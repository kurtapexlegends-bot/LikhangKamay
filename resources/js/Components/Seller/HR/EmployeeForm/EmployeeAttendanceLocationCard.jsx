import React from 'react';
import { MapPin } from 'lucide-react';
import { modalSelectClass } from '@/utils/hrHelpers';

export default function EmployeeAttendanceLocationCard({
    data,
    setData,
    sellerLocations = [],
}) {
    return (
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
    );
}

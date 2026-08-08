import React, { useState, useEffect } from "react";
import { Calendar, Clock, Check } from "lucide-react";

export default function DiscountScheduleCard({
    name,
    setName,
    startAt,
    setStartAt,
    endAt,
    setEndAt,
    isEditingExisting = false,
}) {
    const formatLocalForInput = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const minStart = formatLocalForInput(new Date());

    // Staged Draft States
    const [draftStartAt, setDraftStartAt] = useState(startAt || minStart);
    const [draftEndAt, setDraftEndAt] = useState(
        endAt || formatLocalForInput(new Date(Date.now() + 7 * 86400000))
    );

    useEffect(() => {
        if (startAt) setDraftStartAt(startAt);
        if (endAt) setDraftEndAt(endAt);
    }, [startAt, endAt]);

    const startDateObj = draftStartAt ? new Date(draftStartAt) : null;
    const endDateObj = draftEndAt ? new Date(draftEndAt) : null;
    const nowBuffer = new Date(Date.now() - 60 * 1000);
    const isPastStart = !isEditingExisting && startDateObj && startDateObj < nowBuffer;
    const isInvalidEnd = startDateObj && endDateObj && endDateObj <= startDateObj;

    const hasUnappliedChanges = draftStartAt !== startAt || draftEndAt !== endAt;

    // Helper split functions for Date and Time controls
    const getDatePart = (dateTimeStr) => (dateTimeStr ? dateTimeStr.split('T')[0] || '' : '');
    const getTimePart = (dateTimeStr) => (dateTimeStr ? dateTimeStr.split('T')[1] || '00:00' : '00:00');

    const updateStartDate = (newDate) => {
        if (isEditingExisting) return;
        const currentTime = getTimePart(draftStartAt);
        setDraftStartAt(`${newDate}T${currentTime}`);
    };

    const updateStartTime = (newTime) => {
        if (isEditingExisting) return;
        const currentDate = getDatePart(draftStartAt) || minStart.split('T')[0];
        setDraftStartAt(`${currentDate}T${newTime}`);
    };

    const updateEndDate = (newDate) => {
        const currentTime = getTimePart(draftEndAt);
        setDraftEndAt(`${newDate}T${currentTime}`);
    };

    const updateEndTime = (newTime) => {
        const currentDate = getDatePart(draftEndAt) || draftStartAt.split('T')[0];
        setDraftEndAt(`${currentDate}T${newTime}`);
    };

    const getDurationLabel = () => {
        if (!startDateObj || !endDateObj || isInvalidEnd) return null;
        const diffMs = endDateObj.getTime() - startDateObj.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
        const diffDays = Math.round(diffHours / 24);
        return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
    };

    const handlePresetSelect = (days) => {
        const baseStart = startDateObj ? startDateObj : new Date();
        const newStartStr = formatLocalForInput(baseStart);
        const newEndStr = formatLocalForInput(new Date(baseStart.getTime() + days * 86400000));

        if (!isEditingExisting) {
            setDraftStartAt(newStartStr);
            setStartAt(newStartStr);
        }
        setDraftEndAt(newEndStr);
        setEndAt(newEndStr);
    };

    const handleApplySchedule = () => {
        if (isPastStart || isInvalidEnd) return;
        if (!isEditingExisting) {
            setStartAt(draftStartAt);
        }
        setEndAt(draftEndAt);
    };

    const activeDuration = getDurationLabel();

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 border-b border-stone-100 pb-2 flex items-center gap-1.5">
                <Calendar size={14} className="text-stone-500" /> Campaign Schedule
            </h3>
            
            {/* Campaign Name */}
            <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Campaign Name <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Mid-Year Crafts Promo"
                    className="w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white font-medium min-h-[42px] px-3"
                />
            </div>

            {/* Quick Duration Buttons */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-stone-600">Quick Duration</span>
                    {activeDuration && !isPastStart && !isInvalidEnd && (
                        <span className="text-[11px] font-semibold text-clay-700 flex items-center gap-1">
                            <Clock size={12} /> {activeDuration} promo
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { label: "1 Day", days: 1 },
                        { label: "3 Days", days: 3 },
                        { label: "7 Days", days: 7 },
                        { label: "14 Days", days: 14 },
                        { label: "30 Days", days: 30 },
                    ].map((preset) => {
                        const isSelected = activeDuration === `${preset.days} days` || activeDuration === `${preset.days} day`;
                        return (
                            <button
                                key={preset.days}
                                type="button"
                                onClick={() => handlePresetSelect(preset.days)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer min-h-[34px] ${
                                    isSelected && !hasUnappliedChanges
                                        ? "bg-clay-700 text-white shadow-xs"
                                        : "bg-stone-100 text-stone-600 hover:bg-stone-200/80"
                                }`}
                            >
                                {preset.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Separated Date & Time Pickers */}
            <div className="rounded-xl border border-stone-200/80 bg-white p-3.5 space-y-4">
                {/* Starts Controls */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-bold text-stone-700">
                            Campaign Starts
                        </label>
                        {isEditingExisting && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Live Campaign
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-3">
                            <input
                                type="date"
                                min={minStart.split('T')[0]}
                                value={getDatePart(draftStartAt)}
                                onChange={(e) => updateStartDate(e.target.value)}
                                disabled={isEditingExisting}
                                className={`w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white min-h-[42px] px-2.5 font-medium ${
                                    isEditingExisting ? "bg-stone-100/70 text-stone-500 cursor-not-allowed border-stone-200" : ""
                                } ${
                                    isPastStart ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                                }`}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <input
                                type="time"
                                value={getTimePart(draftStartAt)}
                                onChange={(e) => updateStartTime(e.target.value)}
                                disabled={isEditingExisting}
                                className={`w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white min-h-[42px] px-2.5 font-medium ${
                                    isEditingExisting ? "bg-stone-100/70 text-stone-500 cursor-not-allowed border-stone-200" : ""
                                } ${
                                    isPastStart ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                                }`}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Ends Controls */}
                <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1.5">
                        Campaign Ends
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                        <div className="col-span-3">
                            <input
                                type="date"
                                min={getDatePart(draftStartAt) || minStart.split('T')[0]}
                                value={getDatePart(draftEndAt)}
                                onChange={(e) => updateEndDate(e.target.value)}
                                className={`w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white min-h-[42px] px-2.5 font-medium ${
                                    isInvalidEnd ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                                }`}
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <input
                                type="time"
                                value={getTimePart(draftEndAt)}
                                onChange={(e) => updateEndTime(e.target.value)}
                                className={`w-full text-xs rounded-xl border-stone-200 focus:border-clay-500 focus:ring-clay-500 bg-white min-h-[42px] px-2.5 font-medium ${
                                    isInvalidEnd ? "border-rose-400 text-rose-700 bg-rose-50" : ""
                                }`}
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* Validation Messages */}
                {isPastStart && (
                    <p className="text-[11px] text-rose-600 font-medium">Start time cannot be in the past.</p>
                )}
                {isInvalidEnd && (
                    <p className="text-[11px] text-rose-600 font-medium">End time must be after the start time.</p>
                )}

                {/* Apply Button */}
                {hasUnappliedChanges && !isPastStart && !isInvalidEnd && (
                    <div className="pt-2 border-t border-stone-100 flex justify-end">
                        <button
                            type="button"
                            onClick={handleApplySchedule}
                            className="px-4 py-2 bg-clay-700 hover:bg-clay-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[38px]"
                        >
                            <Check size={14} strokeWidth={2.5} /> Apply Schedule
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

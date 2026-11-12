import React from 'react';
import { Camera, Plus, Pencil, XCircle } from 'lucide-react';

export default function ReturnPhotoAngleSlots({
    mandatoryAngles = [],
    slotPhotos = {},
    extraPhotos = [],
    totalAttachedCount = 0,
    maxTotalPhotos = 5,
    onSlotFileChange,
    onRemoveSlotFile,
    onExtraFilesChange,
    onRemoveExtraFile,
    onAnnotate,
    proofError = null,
}) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-bold text-stone-700">
                    {mandatoryAngles.length > 0 ? 'Required Photo Angles' : 'Proof Photos'} ({totalAttachedCount}/{maxTotalPhotos})
                </label>
                <span className="text-[11px] text-stone-500 font-medium">Max 4MB total</span>
            </div>

            {mandatoryAngles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mandatoryAngles.map((angle) => {
                        const slot = slotPhotos[angle.key];
                        const isRequired = angle.required !== false;
                        return (
                            <div
                                key={angle.key}
                                className={`flex flex-col rounded-xl border p-3 transition ${
                                    slot ? 'border-clay-300 bg-white' : 'border-dashed border-stone-300 bg-stone-50/70'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-2.5 min-h-[2rem]">
                                    <span className="text-xs font-bold text-stone-800 leading-snug">{angle.label}</span>
                                    {isRequired && (
                                        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                            Required
                                        </span>
                                    )}
                                </div>

                                {slot ? (
                                    <div className="relative aspect-[16/10] rounded-lg border border-stone-200 overflow-hidden">
                                        <img
                                            src={slot.url}
                                            alt={angle.label}
                                            className="h-full w-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.onerror = null;
                                                e.currentTarget.src = '/images/placeholder.svg';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => onRemoveSlotFile(angle.key)}
                                            className="absolute top-1.5 right-1.5 bg-red-600 text-white rounded-full p-1.5 shadow hover:bg-red-700 transition min-h-[32px] min-w-[32px] flex items-center justify-center cursor-pointer"
                                            title="Remove photo"
                                        >
                                            <XCircle size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onAnnotate({ kind: 'slot', angleKey: angle.key, url: slot.url })}
                                            className="absolute bottom-1.5 inset-x-1.5 py-1.5 rounded-lg bg-stone-900/85 text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-stone-900 transition cursor-pointer"
                                        >
                                            <Pencil size={11} />
                                            <span>Highlight Defect</span>
                                        </button>
                                    </div>
                                ) : (
                                    <label className="flex flex-col items-center justify-center gap-1.5 py-5 px-2 rounded-lg cursor-pointer hover:bg-stone-100/70 transition min-h-[96px]">
                                        <Camera className="h-6 w-6 text-stone-400" />
                                        <span className="text-xs font-semibold text-clay-600">Attach Photo</span>
                                        <input
                                            type="file"
                                            className="sr-only"
                                            accept="image/*"
                                            onChange={(e) => onSlotFileChange(angle.key, e)}
                                        />
                                    </label>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-600">
                        {mandatoryAngles.length > 0 ? 'Additional Angles (Optional)' : 'Upload Evidence Photos'}
                    </span>
                    {totalAttachedCount < maxTotalPhotos && (
                        <label className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-bold text-clay-700 hover:bg-stone-50 cursor-pointer transition min-h-[36px]">
                            <Plus size={13} />
                            <span>Add Photo</span>
                            <input
                                type="file"
                                className="sr-only"
                                accept="image/*"
                                multiple
                                onChange={onExtraFilesChange}
                            />
                        </label>
                    )}
                </div>

                {extraPhotos.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                        {extraPhotos.map((entry, idx) => (
                            <div key={entry.url || idx} className="relative aspect-square rounded-lg border border-stone-200 overflow-hidden">
                                <img
                                    src={entry.url}
                                    alt={`Additional angle ${idx + 1}`}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/images/placeholder.svg';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => onRemoveExtraFile(idx)}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 transition min-h-[28px] min-w-[28px] flex items-center justify-center cursor-pointer"
                                    title="Remove photo"
                                >
                                    <XCircle size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onAnnotate({ kind: 'extra', index: idx, url: entry.url })}
                                    className="absolute bottom-1 inset-x-1 py-1 rounded bg-stone-900/85 text-white text-[9px] font-bold flex items-center justify-center gap-1 hover:bg-stone-900 transition cursor-pointer"
                                >
                                    <Pencil size={10} />
                                    <span>Highlight</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {proofError && <p className="text-red-500 text-xs mt-1">{proofError}</p>}
        </div>
    );
}

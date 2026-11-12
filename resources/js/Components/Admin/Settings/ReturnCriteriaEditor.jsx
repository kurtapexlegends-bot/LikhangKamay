import React from 'react';
import { Clock, Camera, CheckSquare, AlertCircle } from 'lucide-react';
import CriteriaListCard, { CriteriaToggleSwitch, CriteriaRemoveButton } from './CriteriaListCard';

const WINDOW_PRESETS = [
    { label: '24h · 1d', hours: 24 },
    { label: '48h · 2d', hours: 48 },
    { label: '72h · 3d', hours: 72 },
    { label: '168h · 7d', hours: 168 },
];

const makeUniqueKey = (prefix, existingKeys = []) => {
    const used = new Set(existingKeys.map((k) => String(k || '').trim()).filter(Boolean));
    let n = used.size + 1;
    while (used.has(`${prefix}_${n}`)) {
        n += 1;
    }
    return `${prefix}_${n}`;
};

export default function ReturnCriteriaEditor({ criteria, onChange, errors = {} }) {
    const safeCriteria = {
        return_window_hours: criteria?.return_window_hours ?? 24,
        max_photos: criteria?.max_photos ?? 5,
        eligible_reasons: Array.isArray(criteria?.eligible_reasons) ? criteria.eligible_reasons : [],
        mandatory_photo_angles: Array.isArray(criteria?.mandatory_photo_angles) ? criteria.mandatory_photo_angles : [],
        checklist_items: Array.isArray(criteria?.checklist_items) ? criteria.checklist_items : [],
    };

    const requiredAnglesCount = safeCriteria.mandatory_photo_angles.filter((a) => a?.required !== false).length;
    const activeReasonsCount = safeCriteria.eligible_reasons.filter((r) => r?.enabled !== false).length;
    const requiredChecksCount = safeCriteria.checklist_items.filter((c) => c?.required !== false).length;

    const updateField = (field, value) => {
        onChange({ ...safeCriteria, [field]: value });
    };

    const updateItem = (field, index, patch) => {
        const next = [...safeCriteria[field]];
        next[index] = { ...next[index], ...patch };
        updateField(field, next);
    };

    const removeItem = (field, index) => {
        const next = [...safeCriteria[field]];
        next.splice(index, 1);
        updateField(field, next);
    };

    const addReason = () => {
        const code = makeUniqueKey('custom_reason', safeCriteria.eligible_reasons.map((r) => r?.code));
        updateField('eligible_reasons', [
            ...safeCriteria.eligible_reasons,
            { code, label: '', requires_description: true, enabled: true },
        ]);
    };

    const addAngle = () => {
        if (safeCriteria.mandatory_photo_angles.length >= 5) return;
        const key = makeUniqueKey('photo_angle', safeCriteria.mandatory_photo_angles.map((a) => a?.key));
        updateField('mandatory_photo_angles', [
            ...safeCriteria.mandatory_photo_angles,
            { key, label: '', required: true },
        ]);
    };

    const addChecklistItem = () => {
        const key = makeUniqueKey('criterion', safeCriteria.checklist_items.map((c) => c?.key));
        updateField('checklist_items', [
            ...safeCriteria.checklist_items,
            { key, label: '', required: true },
        ]);
    };

    return (
        <div className="space-y-4">
            {/* 1. Inspection Window & Photo Cap */}
            <section className="bg-white border border-stone-200/90 rounded-2xl shadow-2xs overflow-hidden">
                <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-stone-100 bg-stone-50/40">
                    <Clock size={15} className="text-clay-600 shrink-0" />
                    <h3 className="text-sm font-bold text-stone-900">Return Inspection Window</h3>
                </div>

                <div className="divide-y divide-stone-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                        <div>
                            <p className="text-xs font-bold text-stone-800">Eligibility Duration</p>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                                Newly delivered orders use this window; completed orders stay grandfathered.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative w-24">
                                <input
                                    type="number"
                                    min={1}
                                    max={720}
                                    value={safeCriteria.return_window_hours ?? ''}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        if (raw === '') {
                                            updateField('return_window_hours', '');
                                            return;
                                        }
                                        const parsed = Number(raw);
                                        if (!Number.isNaN(parsed)) {
                                            updateField('return_window_hours', Math.min(720, parsed));
                                        }
                                    }}
                                    onBlur={() => {
                                        const parsed = Number(safeCriteria.return_window_hours);
                                        const normalized = Number.isFinite(parsed) && parsed >= 1
                                            ? Math.min(720, Math.round(parsed))
                                            : 24;
                                        if (normalized !== safeCriteria.return_window_hours) {
                                            updateField('return_window_hours', normalized);
                                        }
                                    }}
                                    className="w-full rounded-lg border-stone-200 bg-stone-50/60 pr-9 py-1.5 text-xs font-bold text-stone-900 focus:bg-white focus:border-clay-500 focus:ring-clay-500"
                                />
                                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-medium text-stone-400">
                                    hrs
                                </span>
                            </div>
                            <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5">
                                {WINDOW_PRESETS.map((preset) => {
                                    const active = Number(safeCriteria.return_window_hours) === preset.hours;
                                    return (
                                        <button
                                            key={preset.hours}
                                            type="button"
                                            onClick={() => updateField('return_window_hours', preset.hours)}
                                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                                                active
                                                    ? 'bg-white text-clay-700 shadow-2xs ring-1 ring-stone-900/5'
                                                    : 'text-stone-500 hover:text-stone-800'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                        <div>
                            <p className="text-xs font-bold text-stone-800">Proof Photo Ceiling</p>
                            <p className="text-[11px] text-stone-500 mt-0.5">
                                {requiredAnglesCount} required · {Math.max(0, Number(safeCriteria.max_photos) - requiredAnglesCount)} extra optional slots (max 4MB total)
                            </p>
                            {errors['structured_criteria.max_photos'] && (
                                <p className="text-red-600 text-xs font-semibold mt-1">{errors['structured_criteria.max_photos']}</p>
                            )}
                            {Number(safeCriteria.max_photos) < requiredAnglesCount && (
                                <p className="text-red-600 text-[11px] font-semibold mt-1">
                                    Must be at least {requiredAnglesCount} to cover required photo angles.
                                </p>
                            )}
                        </div>
                        <div className="inline-flex rounded-lg border border-stone-200 bg-stone-50 p-0.5 self-start sm:self-center">
                            {[1, 2, 3, 4, 5].map((count) => {
                                const active = Number(safeCriteria.max_photos) === count;
                                const tooSmall = count < requiredAnglesCount;
                                return (
                                    <button
                                        key={count}
                                        type="button"
                                        disabled={tooSmall}
                                        onClick={() => updateField('max_photos', count)}
                                        className={`w-8 py-1 rounded-md text-xs font-bold transition cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                                            active
                                                ? 'bg-white text-clay-700 shadow-2xs ring-1 ring-stone-900/5'
                                                : 'text-stone-500 hover:text-stone-800'
                                        }`}
                                    >
                                        {count}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Eligible Claim Reasons */}
            <CriteriaListCard
                icon={AlertCircle}
                title="Eligible Claim Reasons"
                badgeLabel={`${activeReasonsCount} active`}
                addLabel="Add Reason"
                onAdd={addReason}
                emptyMessage="No claim reasons configured yet."
                items={safeCriteria.eligible_reasons}
                renderRow={(reason, idx) => {
                    const rowError = errors[`structured_criteria.eligible_reasons.${idx}.label`];
                    return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-5 py-2.5 hover:bg-stone-50/40 transition">
                        <span className="hidden sm:inline-block w-5 text-[11px] font-mono font-semibold text-stone-400 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                        </span>
                        <input
                            type="text"
                            value={reason.label}
                            onChange={(e) => updateItem('eligible_reasons', idx, { label: e.target.value })}
                            placeholder="Claim reason label..."
                            className={`flex-1 rounded-lg bg-transparent focus:bg-white focus:ring-1 text-xs font-semibold text-stone-900 px-2.5 py-1.5 transition ${
                                rowError
                                    ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-500'
                                    : 'border-transparent hover:border-stone-200 focus:border-clay-500 focus:ring-clay-500'
                            }`}
                        />
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-2 sm:pl-0">
                            <CriteriaToggleSwitch
                                checked={reason.enabled !== false}
                                onChange={(val) => updateItem('eligible_reasons', idx, { enabled: val })}
                                label={reason.enabled !== false ? 'Active' : 'Hidden'}
                            />
                            <CriteriaRemoveButton onClick={() => removeItem('eligible_reasons', idx)} title="Remove reason" />
                        </div>
                    </div>
                    );
                }}
            />

            {/* 3. Mandatory Photo Angles */}
            <CriteriaListCard
                icon={Camera}
                title="Mandatory Photo Angles"
                badgeLabel={`${requiredAnglesCount} required`}
                addLabel="Add Angle"
                onAdd={addAngle}
                addDisabled={safeCriteria.mandatory_photo_angles.length >= 5}
                emptyMessage="No photo angle slots defined. Buyers will see a general proof upload box."
                items={safeCriteria.mandatory_photo_angles}
                renderRow={(angle, idx) => {
                    const rowError = errors[`structured_criteria.mandatory_photo_angles.${idx}.label`];
                    return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-5 py-2.5 hover:bg-stone-50/40 transition">
                        <span className="hidden sm:inline-block w-5 text-[11px] font-mono font-semibold text-stone-400 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                        </span>
                        <input
                            type="text"
                            value={angle.label}
                            onChange={(e) => updateItem('mandatory_photo_angles', idx, { label: e.target.value })}
                            placeholder="Photo angle slot label (e.g., Item Defect Close-up)..."
                            className={`flex-1 rounded-lg bg-transparent focus:bg-white focus:ring-1 text-xs font-semibold text-stone-900 px-2.5 py-1.5 transition ${
                                rowError
                                    ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-500'
                                    : 'border-transparent hover:border-stone-200 focus:border-clay-500 focus:ring-clay-500'
                            }`}
                        />
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-2 sm:pl-0">
                            <CriteriaToggleSwitch
                                checked={angle.required !== false}
                                onChange={(val) => updateItem('mandatory_photo_angles', idx, { required: val })}
                                label={angle.required !== false ? 'Required' : 'Optional'}
                            />
                            <CriteriaRemoveButton onClick={() => removeItem('mandatory_photo_angles', idx)} title="Remove angle" />
                        </div>
                    </div>
                    );
                }}
            />

            {/* 4. Buyer Eligibility Checklist */}
            <CriteriaListCard
                icon={CheckSquare}
                title="Buyer Eligibility Checklist"
                badgeLabel={`${requiredChecksCount} required`}
                addLabel="Add Check"
                onAdd={addChecklistItem}
                emptyMessage="No checklist confirmations defined."
                items={safeCriteria.checklist_items}
                renderRow={(item, idx) => {
                    const rowError = errors[`structured_criteria.checklist_items.${idx}.label`];
                    return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2.5 px-5 py-2.5 hover:bg-stone-50/40 transition">
                        <span className="hidden sm:inline-block w-5 text-[11px] font-mono font-semibold text-stone-400 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                        </span>
                        <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem('checklist_items', idx, { label: e.target.value })}
                            placeholder="Eligibility confirmation statement..."
                            className={`flex-1 rounded-lg bg-transparent focus:bg-white focus:ring-1 text-xs font-medium text-stone-800 px-2.5 py-1.5 transition ${
                                rowError
                                    ? 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-500'
                                    : 'border-transparent hover:border-stone-200 focus:border-clay-500 focus:ring-clay-500'
                            }`}
                        />
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-2 sm:pl-0">
                            <CriteriaToggleSwitch
                                checked={item.required !== false}
                                onChange={(val) => updateItem('checklist_items', idx, { required: val })}
                                label={item.required !== false ? 'Required' : 'Optional'}
                            />
                            <CriteriaRemoveButton onClick={() => removeItem('checklist_items', idx)} title="Remove checklist item" />
                        </div>
                    </div>
                    );
                }}
            />
        </div>
    );
}

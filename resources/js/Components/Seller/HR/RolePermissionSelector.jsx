import React from 'react';
import { Shield } from 'lucide-react';
import {
    MODULE_PERMISSION_LEVELS,
    normalizeModulePermissionLevel,
    humanizePreset
} from '@/utils/hrHelpers';

export function RolePresetCard({ preset, isSelected, radioName, onSelect }) {
    const moduleCount = (preset.modules || []).length;

    return (
        <label
            className={`relative cursor-pointer rounded-[1.25rem] border p-4 transition-all duration-300 ${
                isSelected
                    ? 'border-[#E7D8C9] bg-[#FCF7F2]/50 shadow-md ring-1 ring-clay-700/5 -translate-y-0.5'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50 hover:shadow-sm'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    isSelected ? 'border-clay-500 bg-clay-500' : 'border-stone-300 bg-white'
                }`}>
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 border-b border-stone-100/50 pb-2.5 mb-2.5">
                        <span className={`text-[14px] font-bold tracking-tight ${isSelected ? 'text-clay-900' : 'text-stone-800'}`}>
                            {preset.label}
                        </span>
                        {moduleCount > 0 && (
                            <span className={`inline-flex shrink-0 items-center justify-center rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-colors ${isSelected ? 'bg-clay-600 text-white' : 'bg-stone-100 text-stone-500'}`}>
                                {moduleCount} mods
                            </span>
                        )}
                    </div>
                    <p className={`text-[12px] font-medium leading-relaxed ${isSelected ? 'text-clay-800/80' : 'text-stone-500'}`}>{preset.description}</p>
                </div>
            </div>
            
            <input
                type="radio"
                name={radioName}
                className="sr-only"
                checked={isSelected}
                onChange={onSelect}
            />
        </label>
    );
}

export function ModuleAccessLevelCard({ module, value, onChange }) {
    const isOff = !value;
    
    return (
        <div className={`relative flex flex-col justify-between rounded-[1.25rem] border p-4 transition-all duration-300 ${
            isOff
                ? 'border-stone-200 bg-stone-50/30 opacity-90'
                : value === 'can_edit'
                    ? 'border-[#E7D8C9] bg-white shadow-sm'
                    : 'border-stone-200 bg-white shadow-sm'
        }`}>
            <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-[14px] font-bold tracking-tight ${isOff ? 'text-stone-600' : 'text-stone-900'}`}>
                        {module.label}
                    </span>
                    {!isOff && (
                        <span className={`h-2.5 w-2.5 rounded-full border border-white shadow-sm ${value === 'can_edit' ? 'bg-clay-500' : 'bg-emerald-400'}`} />
                    )}
                </div>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-stone-500">
                    {module.description}
                </p>
            </div>
            
            <div className="mt-5 flex w-full p-1 bg-stone-100/80 rounded-xl border border-stone-200/60">
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className={`flex-1 rounded-lg py-1.5 text-[9px] xl:text-[10px] font-bold uppercase tracking-widest transition-all ${
                        isOff
                            ? 'bg-white text-stone-800 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-stone-900/5 cursor-default'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    Off
                </button>
                {MODULE_PERMISSION_LEVELS.map((option) => {
                    const isSelected = value === option.key;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => onChange(option.key)}
                            className={`flex-1 rounded-lg py-1.5 text-[9px] xl:text-[10px] font-bold uppercase tracking-widest transition-all peer-focus:ring-2 ${
                                isSelected
                                    ? option.key === 'can_edit'
                                        ? 'bg-[#FCF7F2] text-clay-700 shadow-[0_1px_2px_rgba(180,120,90,0.1)] ring-1 ring-clay-700/10 cursor-default'
                                        : 'bg-emerald-50 text-emerald-700 shadow-[0_1px_2px_rgba(16,185,129,0.1)] ring-1 ring-emerald-700/10 cursor-default'
                                    : 'text-stone-500 hover:text-stone-800'
                            }`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function ModulePermissionSummary({ moduleOverrides = {}, availableModules = [] }) {
    const activeLevels = availableModules
        .map((module) => normalizeModulePermissionLevel(moduleOverrides?.[module.key]))
        .filter(Boolean);
    const readOnlyCount = activeLevels.filter((level) => level === 'read_only').length;
    const canEditCount = activeLevels.filter((level) => level === 'can_edit').length;
    const totalEnabled = readOnlyCount + canEditCount;

    return (
        <div className="rounded-[1.25rem] border border-stone-200 bg-[#FDFBF9] p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-stone-400">Access Overview</p>
                    <h5 className="mt-0.5 text-lg font-bold tracking-tight text-stone-900">Capability Control Center</h5>
                    <p className="mt-1 text-[12px] font-medium leading-tight text-stone-500 max-w-lg">
                        Set capability visibility manually to <strong className="font-bold text-stone-700">View Only</strong> or <strong className="font-bold text-stone-700">Provide Edit Actions</strong>.
                    </p>
                </div>
                
                <div className="shrink-0 flex items-center justify-end gap-2">
                    <div className="flex flex-col items-end gap-2">
                        <span className="inline-flex items-center rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-[11px] font-bold text-stone-600 shadow-sm">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-stone-300" />
                            {totalEnabled} App Modules Active
                        </span>
                        
                        {(readOnlyCount > 0 || canEditCount > 0) && (
                            <div className="flex gap-1.5">
                                {readOnlyCount > 0 && <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700 border border-emerald-100">{readOnlyCount} View Levels</span>}
                                {canEditCount > 0 && <span className="rounded-lg bg-[#FCF7F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-clay-700 border border-[#E7D8C9]">{canEditCount} Edit Levels</span>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function RolePermissionSelector({
    rolePresets,
    availableModules,
    presetKey,
    onPresetChange,
    moduleOverrides,
    onModuleOverrideChange,
    radioName,
    canEdit,
}) {
    return (
        <div className="space-y-6 pt-2">
            <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">System Permissions</h3>
                        <p className="mt-0.5 text-[13px] text-stone-500">Pick the capability template first, then set access per capability.</p>
                    </div>
                    <span className="rounded-md border border-clay-200 bg-clay-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-clay-800">
                        {rolePresets.find(p => p.key === presetKey)?.label || 'Custom'}
                    </span>
                </div>
                <div className="grid gap-2.5 md:grid-cols-2">
                    {rolePresets.map((preset) => (
                        <RolePresetCard
                            key={preset.key}
                            preset={preset}
                            radioName={radioName}
                            isSelected={presetKey === preset.key}
                            onSelect={() => onPresetChange(preset.key)}
                        />
                    ))}
                </div>
            </div>

            <div className="border-t border-stone-200/60 pt-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">Capability Access Levels</h3>
                        <p className="mt-0.5 text-[13px] text-stone-500">Choose whether each seller workspace capability is off, read only, or editable.</p>
                    </div>
                </div>
                <div className="mb-3">
                    <ModulePermissionSummary moduleOverrides={moduleOverrides} availableModules={availableModules} />
                </div>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {availableModules.map((module) => (
                        <ModuleAccessLevelCard
                            key={module.key}
                            module={module}
                            value={moduleOverrides?.[module.key] ?? null}
                            onChange={(level) => onModuleOverrideChange(module.key, level)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { Shield, ChevronDown, Check, Lock, Eye, Edit3 } from 'lucide-react';
import {
    MODULE_PERMISSION_LEVELS,
    normalizeModulePermissionLevel,
} from '@/utils/hrHelpers';

export function RolePresetCard({ preset, isSelected, radioName, onSelect, disabled }) {
    const moduleCount = (preset.modules || []).length;

    return (
        <label
            className={`group relative flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 ${
                disabled
                    ? 'border-stone-200 bg-stone-50/50 opacity-60 cursor-not-allowed'
                    : isSelected
                        ? 'border-clay-500 bg-clay-50/40 shadow-sm ring-1 ring-clay-500/20 cursor-pointer'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50 cursor-pointer'
            }`}
        >
            <div>
                {/* Card Header: Radio + Title on Left, Badge on Right */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            disabled
                                ? 'border-stone-200 bg-stone-100'
                                : isSelected ? 'border-clay-600 bg-clay-600' : 'border-stone-300 bg-white group-hover:border-stone-400'
                        }`}>
                            {isSelected && <div className={`h-1.5 w-1.5 rounded-full ${disabled ? 'bg-stone-400' : 'bg-white'}`} />}
                        </div>
                        <span className={`text-xs font-bold tracking-tight ${disabled ? 'text-stone-400' : isSelected ? 'text-clay-950' : 'text-stone-900'}`}>
                            {preset.label}
                        </span>
                    </div>

                    <span className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-wide transition-colors ${
                        disabled 
                            ? 'bg-stone-100 text-stone-400' 
                            : isSelected 
                                ? 'bg-clay-600 text-white' 
                                : 'bg-stone-100 text-stone-600'
                    }`}>
                        {moduleCount > 0 ? `${moduleCount} ${moduleCount === 1 ? 'module' : 'modules'}` : 'Custom'}
                    </span>
                </div>

                <p className={`text-[11px] leading-relaxed pl-6 ${disabled ? 'text-stone-400' : isSelected ? 'text-clay-800/80' : 'text-stone-500'}`}>
                    {preset.description}
                </p>
            </div>

            <input
                type="radio"
                name={radioName}
                className="sr-only"
                checked={isSelected}
                onChange={onSelect}
                disabled={disabled}
            />
        </label>
    );
}

export function ModuleAccessLevelCard({ module, value, onChange, disabled }) {
    const isOff = !value;

    return (
        <div className={`flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 ${
            disabled
                ? 'border-stone-200 bg-stone-50/20 opacity-60'
                : isOff
                    ? 'border-stone-200 bg-stone-50/40'
                    : value === 'can_edit'
                        ? 'border-clay-300/80 bg-white shadow-sm'
                        : 'border-emerald-200 bg-white shadow-sm'
        }`}>
            <div className="min-w-0 mb-3">
                <div className="flex items-center justify-between gap-2">
                    <span className={`text-xs font-bold tracking-tight ${disabled ? 'text-stone-400' : isOff ? 'text-stone-600' : 'text-stone-900'}`}>
                        {module.label}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        isOff 
                            ? 'bg-stone-100 text-stone-400' 
                            : value === 'can_edit' 
                                ? 'bg-clay-100 text-clay-700' 
                                : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        {isOff ? (
                            <>
                                <Lock size={10} />
                                None
                            </>
                        ) : value === 'can_edit' ? (
                            <>
                                <Edit3 size={10} />
                                Full Access
                            </>
                        ) : (
                            <>
                                <Eye size={10} />
                                View Only
                            </>
                        )}
                    </span>
                </div>
                <p className={`mt-1 text-[11px] leading-relaxed ${disabled ? 'text-stone-400' : 'text-stone-500'}`}>
                    {module.description}
                </p>
            </div>

            {/* Segmented Permission Level Switcher */}
            <div className="flex w-full p-1 bg-stone-100/80 rounded-lg border border-stone-200/60 gap-1">
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    disabled={disabled}
                    className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none ${
                        disabled
                            ? isOff ? 'bg-stone-200 text-stone-400' : 'text-stone-300'
                            : isOff
                                ? 'bg-white text-stone-700 shadow-sm font-extrabold'
                                : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    None
                </button>
                <button
                    type="button"
                    onClick={() => onChange('read_only')}
                    disabled={disabled}
                    className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none ${
                        disabled
                            ? value === 'read_only' ? 'bg-stone-200 text-stone-400' : 'text-stone-300'
                            : value === 'read_only'
                                ? 'bg-emerald-600 text-white shadow-sm font-extrabold'
                                : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    View
                </button>
                <button
                    type="button"
                    onClick={() => onChange('can_edit')}
                    disabled={disabled}
                    className={`flex-1 rounded-md py-1 text-[10px] font-bold uppercase tracking-wider transition-all focus:outline-none ${
                        disabled
                            ? value === 'can_edit' ? 'bg-stone-200 text-stone-400' : 'text-stone-300'
                            : value === 'can_edit'
                                ? 'bg-clay-600 text-white shadow-sm font-extrabold'
                                : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    Edit
                </button>
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
    const totalModules = availableModules.length;

    return (
        <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-stone-200/80 text-stone-600 font-bold text-[11px]">
                    {totalEnabled}
                </span>
                <span className="font-semibold text-stone-700">
                    {totalEnabled} of {totalModules} modules granted access
                </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 rounded-md bg-clay-100 border border-clay-200 px-2 py-0.5 text-[10px] font-bold text-clay-800">
                    <Edit3 size={10} />
                    {canEditCount} Full Access
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Eye size={10} />
                    {readOnlyCount} View Only
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-stone-200/70 border border-stone-300/60 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                    <Lock size={10} />
                    {totalModules - totalEnabled} None
                </span>
            </div>
        </div>
    );
}

const MODULE_CATEGORIES = [
    {
        id: 'operations',
        label: 'Core Operations & Inventory',
        description: 'Product catalog, 3D assets, order fulfillment, and stock procurement.',
        modules: ['products', '3d', 'orders', 'procurement', 'stock_requests'],
    },
    {
        id: 'engagement',
        label: 'Customer & Store Engagement',
        description: 'Dashboard metrics, store analytics, buyer messages, and reviews.',
        modules: ['overview', 'analytics', 'messages', 'reviews', 'team_messages'],
    },
    {
        id: 'admin',
        label: 'Administration & Finance',
        description: 'Staff directory & payroll, accounting releases, and shop settings.',
        modules: ['hr', 'accounting', 'shop_settings'],
    },
];

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
    const [expandedCategories, setExpandedCategories] = useState({
        operations: true,
        engagement: false,
        admin: false,
    });

    const toggleCategory = (categoryId) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    return (
        <div className="space-y-6">
            {/* Section 1: Role Preset Selection */}
            <div>
                <div className="mb-3">
                    <h3 className="text-sm font-bold text-stone-900">User Permission Levels</h3>
                    <p className="mt-0.5 text-xs text-stone-500">Select a role template to auto-configure workspace permissions.</p>
                </div>
                <div className="grid gap-2.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {rolePresets.map((preset) => (
                        <RolePresetCard
                            key={preset.key}
                            preset={preset}
                            radioName={radioName}
                            isSelected={presetKey === preset.key}
                            onSelect={() => onPresetChange(preset.key)}
                            disabled={!canEdit}
                        />
                    ))}
                </div>
            </div>

            {/* Section 2: Specific Module Permissions */}
            <div className="border-t border-stone-200/70 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-stone-900">Module Access Control</h3>
                        <p className="mt-0.5 text-xs text-stone-500">Customize access rights per workspace module.</p>
                    </div>
                </div>

                {/* Summary Bar */}
                <ModulePermissionSummary moduleOverrides={moduleOverrides} availableModules={availableModules} />

                {/* Category Accordions */}
                <div className="space-y-3 pt-1">
                    {MODULE_CATEGORIES.map((category) => {
                        const categoryModules = availableModules.filter((m) => category.modules.includes(m.key));
                        if (categoryModules.length === 0) return null;

                        const activeCount = categoryModules.filter(
                            (m) => normalizeModulePermissionLevel(moduleOverrides?.[m.key]) !== null
                        ).length;

                        const isExpanded = expandedCategories[category.id];

                        return (
                            <div key={category.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden shadow-sm">
                                {/* Category Header */}
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(category.id)}
                                    className="w-full flex items-center justify-between p-3.5 bg-stone-50/70 hover:bg-stone-100/80 transition text-left focus:outline-none"
                                >
                                    <div className="min-w-0 pr-4">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-bold text-stone-800">{category.label}</h4>
                                            <span className="inline-flex items-center rounded-md bg-stone-200/80 px-1.5 py-0.5 text-[9px] font-bold text-stone-600">
                                                {activeCount} of {categoryModules.length} active
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[11px] text-stone-500 font-normal">{category.description}</p>
                                    </div>
                                    <div className="shrink-0 flex items-center justify-center h-7 w-7 rounded-lg bg-white border border-stone-200 text-stone-400">
                                        <ChevronDown
                                            size={15}
                                            className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                        />
                                    </div>
                                </button>

                                {/* Collapsible Grid */}
                                {isExpanded && (
                                    <div className="border-t border-stone-100 p-3.5 bg-white">
                                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                            {categoryModules.map((module) => (
                                                <ModuleAccessLevelCard
                                                    key={module.key}
                                                    module={module}
                                                    value={moduleOverrides?.[module.key] ?? null}
                                                    onChange={(level) => onModuleOverrideChange(module.key, level)}
                                                    disabled={!canEdit}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

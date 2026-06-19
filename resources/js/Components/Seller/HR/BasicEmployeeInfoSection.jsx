import React from 'react';
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
    EMPLOYEE_ROLE_OPTIONS,
    modalFieldClass,
    modalFieldWithIconClass,
    modalSelectClass
} from '@/utils/hrHelpers';

export default function BasicEmployeeInfoSection({
    data,
    setData,
    errors,
    showLinkedLoginUpdateFields,
    getPresetRoleLabel,
    handleManualRoleChange,
    employeeIdValidation,
    isEmployeeIdSaved
}) {
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 pb-1.5">
                Basic Employee Information
            </h3>
            <div className="grid gap-5 md:grid-cols-2">
                {/* Employee ID */}
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Employee ID</label>
                    <div className="relative">
                        <input
                            type="text"
                            className={`${modalFieldWithIconClass} ${employeeIdValidation.isValid === false || errors.employee_id ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} min-h-[44px]`}
                            placeholder="e.g. EMP-001"
                            value={data.employee_id}
                            maxLength={12}
                            onChange={e => {
                                const cleaned = e.target.value.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 12);
                                setData('employee_id', cleaned);
                            }}
                            required
                        />
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            {data.employee_id && !isEmployeeIdSaved && (
                                employeeIdValidation.isValid === null ? (
                                    <Loader2 size={16} className="animate-spin text-stone-400" />
                                ) : employeeIdValidation.isValid ? (
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                ) : (
                                    <AlertTriangle size={16} className="text-red-500" />
                                )
                            )}
                        </div>
                    </div>
                    {employeeIdValidation.isValid === false && (
                        <p className="mt-1 text-[10px] font-bold text-red-600 uppercase tracking-tight flex items-center gap-1">
                            {employeeIdValidation.message}
                        </p>
                    )}
                    {errors.employee_id && <p className="mt-1 text-xs text-red-500 font-medium">{errors.employee_id}</p>}
                </div>

                {/* Legal Name */}
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Legal Full Name</label>
                    <input
                        type="text"
                        className={`${modalFieldClass} ${errors.name ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} min-h-[44px]`}
                        placeholder="e.g. Maria Clara"
                        value={data.name}
                        onChange={e => setData('name', e.target.value)}
                        required
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500 font-medium">{errors.name}</p>}
                </div>

                {/* Job Title / Preset Role */}
                {showLinkedLoginUpdateFields ? (
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-400">Job Title (Preset)</label>
                        <input
                            type="text"
                            className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs text-stone-500 cursor-not-allowed min-h-[44px] shadow-sm"
                            value={getPresetRoleLabel(data.staff_role_preset_key)}
                            disabled
                        />
                        <p className="mt-1 text-[10px] text-stone-400 font-medium">Synchronized with the active security preset role below.</p>
                    </div>
                ) : (
                    <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Job Title</label>
                        <select
                            className={`${modalSelectClass} ${errors.role ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} min-h-[44px]`}
                            value={data.role}
                            onChange={e => handleManualRoleChange(e.target.value)}
                        >
                            {EMPLOYEE_ROLE_OPTIONS.map((roleOption) => (
                                <option key={roleOption}>{roleOption}</option>
                            ))}
                        </select>
                        {errors.role && <p className="mt-1 text-xs text-red-500 font-medium">{errors.role}</p>}
                    </div>
                )}

                {/* Monthly Salary */}
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stone-500">Monthly Salary (PHP)</label>
                    <input
                        type="number"
                        min="0"
                        step="any"
                        className={`${modalFieldClass} ${errors.salary ? 'border-red-300 bg-red-50/10 focus:ring-red-500 focus:border-red-500' : ''} min-h-[44px]`}
                        placeholder="0"
                        value={data.salary}
                        onKeyDown={(e) => { if (e.key === '-') e.preventDefault(); }}
                        onChange={e => setData('salary', e.target.value.replace(/-/g, ""))}
                        required
                    />
                    {errors.salary && <p className="mt-1 text-xs text-red-500 font-medium">{errors.salary}</p>}
                </div>
            </div>
        </div>
    );
}

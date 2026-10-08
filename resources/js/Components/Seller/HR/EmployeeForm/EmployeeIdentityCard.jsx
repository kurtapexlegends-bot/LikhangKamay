import React from 'react';
import { User, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
    EMPLOYEE_ROLE_OPTIONS,
    modalFieldClass,
    modalFieldWithIconClass,
    modalSelectClass
} from '@/utils/hrHelpers';

export default function EmployeeIdentityCard({
    data,
    setData,
    errors = {},
    showLinkedLoginUpdateFields,
    getPresetRoleLabel,
    handleManualRoleChange,
    employeeIdValidation,
    isEmployeeIdSaved,
}) {
    return (
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
    );
}

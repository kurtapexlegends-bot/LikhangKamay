import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordStrengthIndicator({ password = '', className = '', minLength = 12 }) {
    const rules = useMemo(() => [
        { id: 'min_length', label: `At least ${minLength} characters`, passed: password.length >= minLength },
        { id: 'lowercase', label: 'Lowercase letter (a-z)', passed: /[a-z]/.test(password) },
        { id: 'uppercase', label: 'Uppercase letter (A-Z)', passed: /[A-Z]/.test(password) },
        { id: 'number', label: 'Number (0-9)', passed: /[0-9]/.test(password) },
        { id: 'symbol', label: 'Special character (!@#$...)', passed: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\/`~]/.test(password) },
    ], [password, minLength]);

    const passedCount = useMemo(() => rules.filter(r => r.passed).length, [rules]);

    const strength = useMemo(() => {
        if (!password) return { label: 'Empty', color: 'text-stone-400', barBg: 'bg-stone-200', percent: 0 };
        if (passedCount <= 2) return { label: 'Weak', color: 'text-rose-500', barBg: 'bg-rose-500', percent: 25 };
        if (passedCount <= 4) return { label: 'Fair', color: 'text-amber-500', barBg: 'bg-amber-500', percent: 70 };
        return { label: 'Strong', color: 'text-emerald-600', barBg: 'bg-emerald-500', percent: 100 };
    }, [password, passedCount]);

    if (!password) return null;

    return (
        <div className={`mt-2 space-y-2.5 px-1 ${className}`}>
            {/* Strength Header & Progress Bar */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-stone-400">Password Strength</span>
                    <span className={`font-extrabold ${strength.color}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-stone-200/50">
                    <div 
                        className={`h-full rounded-full transition-all duration-300 ${strength.barBg}`}
                        style={{ width: `${strength.percent}%` }}
                    />
                </div>
            </div>

            {/* Detailed Requirement Checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                {rules.map((rule) => (
                    <div 
                        key={rule.id}
                        className={`flex items-center gap-1.5 font-medium transition-colors duration-200 ${
                            rule.passed ? 'text-emerald-700' : 'text-stone-400'
                        }`}
                    >
                        <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 border ${
                            rule.passed 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-600' 
                                : 'bg-stone-50 border-stone-200 text-stone-300'
                        }`}>
                            {rule.passed ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={2.5} />}
                        </div>
                        <span className={rule.passed ? 'font-semibold' : ''}>{rule.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

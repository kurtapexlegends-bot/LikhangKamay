import React from 'react';

export default function Stepper({ activeStep, steps }) {
    return (
        <div className="flex items-center justify-between w-full max-w-md mx-auto py-2">
            {steps.map((step, idx) => {
                const stepNum = idx + 1;
                const isCompleted = activeStep > stepNum;
                const isActive = activeStep === stepNum;
                return (
                    <React.Fragment key={step}>
                        <div className="flex items-center gap-2.5">
                            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold border transition-all duration-300 ${
                                isCompleted
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                    : isActive
                                    ? 'bg-clay-700 border-clay-700 text-white shadow-sm ring-4 ring-clay-100'
                                    : 'bg-white border-stone-200 text-stone-400'
                            }`}>
                                {isCompleted ? '✓' : stepNum}
                            </div>
                            <span className={`text-[11px] font-bold transition-colors uppercase tracking-wider ${
                                isActive ? 'text-clay-800' : isCompleted ? 'text-emerald-700' : 'text-stone-400'
                            }`}>
                                {step}
                            </span>
                        </div>
                        {idx < steps.length - 1 && (
                            <div className={`h-0.5 flex-1 mx-4 border-t border-dashed transition-colors duration-500 ${
                                activeStep > stepNum ? 'border-emerald-500' : 'border-stone-200'
                            }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

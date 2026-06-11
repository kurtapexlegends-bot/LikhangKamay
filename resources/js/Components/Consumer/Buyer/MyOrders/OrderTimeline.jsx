import React from 'react';
import { Clock, Store, MapPin, CheckCircle, PackageCheck, Truck, RotateCcw, XCircle, Star } from 'lucide-react';

export default function OrderTimeline({ status, isPickup }) {
    // Dynamic steps based on shipping method
    const steps = isPickup ? [
        { key: 'Pending', label: 'Placed', icon: Clock, color: 'amber' },
        { key: 'Accepted', label: 'Confirmed', icon: PackageCheck, color: 'blue' },
        { key: 'Ready for Pickup', label: 'Ready', icon: Store, color: 'sky' },
        { key: 'Delivered', label: 'Picked Up', icon: CheckCircle, color: 'teal' },
        { key: 'Completed', label: 'Completed', icon: Star, color: 'green' },
    ] : [
        { key: 'Pending', label: 'Placed', icon: Clock, color: 'amber' },
        { key: 'Accepted', label: 'Confirmed', icon: PackageCheck, color: 'blue' },
        { key: 'Shipped', label: 'Shipped', icon: Truck, color: 'sky' },
        { key: 'Delivered', label: 'Delivered', icon: MapPin, color: 'teal' },
        { key: 'Completed', label: 'Completed', icon: CheckCircle, color: 'green' },
    ];

    const getStepStatus = (stepKey) => {
        const statusOrder = steps.map(s => s.key);
        
        let normalizedStatus = status;
        if (status === 'Ready for Pickup' && !isPickup) normalizedStatus = 'Shipped';
        if (status === 'Shipped' && isPickup) normalizedStatus = 'Ready for Pickup';

        const currentIndex = statusOrder.indexOf(normalizedStatus);
        const stepIndex = statusOrder.indexOf(stepKey);
        
        if (status === 'Cancelled' || status === 'Rejected') return 'cancelled';
        if (status === 'Refund/Return') {
            if (stepIndex <= statusOrder.indexOf('Completed')) return 'done';
            return 'pending';
        }
        
        if (currentIndex === -1) {
             if (status === 'Processing') return stepIndex <= 1 ? 'done' : 'pending';
             return 'pending';
        }

        if (stepIndex < currentIndex) return 'done';
        if (stepIndex === currentIndex) return 'active';
        return 'pending';
    };

    if (status === 'Cancelled' || status === 'Rejected') {
        return (
            <div className="flex items-center justify-center py-4 bg-gray-50 border-t border-b border-gray-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full">
                    <XCircle size={16} className="text-gray-500" />
                    <span className="text-sm font-bold text-gray-600">Order {status}</span>
                </div>
            </div>
        );
    }

    if (status === 'Refund/Return') {
        return (
            <div className="flex items-center justify-center py-4 bg-orange-50 border-t border-b border-orange-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full animate-pulse">
                    <RotateCcw size={16} className="text-orange-600" />
                    <span className="text-sm font-bold text-orange-700">Return/Refund in Progress</span>
                </div>
            </div>
        );
    }
    
    if (status === 'Refunded') {
        return (
            <div className="flex items-center justify-center py-4 bg-purple-50 border-t border-b border-purple-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full">
                    <CheckCircle size={16} className="text-purple-600" />
                    <span className="text-sm font-bold text-purple-700">Money Refunded</span>
                </div>
            </div>
        );
    }

    if (status === 'Replaced') {
        return (
            <div className="flex items-center justify-center py-4 bg-teal-50 border-t border-b border-teal-100">
                <div className="flex items-center gap-2 px-4 py-2 bg-teal-100 rounded-full">
                    <PackageCheck size={16} className="text-teal-600" />
                    <span className="text-sm font-bold text-teal-700">Replacement Sent</span>
                </div>
            </div>
        );
    }

    let normalizedStatus = status;
    if (status === 'Ready for Pickup' && !isPickup) normalizedStatus = 'Shipped';
    if (status === 'Shipped' && isPickup) normalizedStatus = 'Ready for Pickup';
    if (status === 'Processing') normalizedStatus = 'Accepted';

    const currentStepIndex = steps.findIndex((step) => step.key === normalizedStatus);

    return (
        <>
            {/* Sleek mobile vertical timeline */}
            <div className="block sm:hidden border-t border-b border-stone-50 bg-[#FDFBF9]/50 px-5 py-5">
                <div className="relative space-y-4 pl-4">
                    <div className="absolute left-[27px] top-2 bottom-2 w-[1px] bg-stone-200" />
                    
                    {steps.map((step) => {
                        const stepStatus = getStepStatus(step.key);
                        const isDone = stepStatus === 'done';
                        const isActive = stepStatus === 'active';
                        
                        return (
                            <div key={step.key} className="relative flex items-center gap-4">
                                <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                                    {isActive ? (
                                        <>
                                            <div className="h-4 w-4 rounded-full bg-clay-500 shadow-[0_0_0_4px_rgba(180,94,56,0.15)]" />
                                            <div className="absolute inset-0 h-full w-full animate-ping rounded-full bg-clay-400 opacity-20" />
                                        </>
                                    ) : isDone ? (
                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                                    ) : (
                                        <div className="h-2.5 w-2.5 rounded-full bg-stone-200" />
                                    )}
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`text-[13px] tracking-tight ${
                                        isActive 
                                            ? 'font-black text-clay-900' 
                                            : isDone 
                                                ? 'font-bold text-stone-600' 
                                                : 'font-medium text-stone-400'
                                    }`}>
                                        {step.label}
                                    </span>
                                    {isActive && (
                                        <span className="rounded-full bg-clay-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-clay-700">
                                            Current
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Desktop horizontal timeline */}
            <div className="hidden sm:block overflow-x-auto overflow-y-visible border-t border-b border-stone-100 bg-white px-4 py-5 sm:px-6">
                <div className="mx-auto flex min-w-[560px] max-w-3xl items-center justify-between pb-6">
                    {steps.map((step, idx) => {
                        const stepStatus = getStepStatus(step.key);
                        const Icon = step.icon;
                        const isLast = idx === steps.length - 1;
                        
                        return (
                            <div key={step.key} className={`flex items-center ${isLast ? 'flex-none' : 'flex-1'}`}>
                                <div className="relative flex flex-col items-center group">
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 z-10 relative
                                        ${stepStatus === 'done' 
                                            ? 'bg-green-500 text-white shadow-lg shadow-green-200 scale-100' 
                                            : stepStatus === 'active' 
                                                ? 'bg-white text-clay-600 border-2 border-clay-500 shadow-xl shadow-clay-200 scale-110' 
                                                : 'bg-white text-gray-300 border-2 border-gray-100'}
                                    `}>
                                        {stepStatus === 'done' ? <CheckCircle size={18} strokeWidth={3} /> : <Icon size={18} />}
                                        
                                        {stepStatus === 'active' && (
                                            <span className="absolute inset-0 rounded-full bg-clay-400 opacity-20 animate-ping" />
                                        )}
                                    </div>
                                    
                                    <span className={`
                                        absolute -bottom-8 whitespace-nowrap text-[11px] font-bold uppercase tracking-wider transition-all duration-300
                                        ${stepStatus === 'done' 
                                            ? 'text-green-600' 
                                            : stepStatus === 'active' 
                                                ? 'text-clay-700 transform scale-110' 
                                                : 'text-gray-400'}
                                    `}>
                                        {step.label}
                                    </span>
                                </div>

                                {!isLast && (
                                    <div className="flex-1 h-1 mx-2 relative bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`absolute top-0 left-0 bottom-0 bg-green-500 transition-all duration-700 ease-out rounded-full ${
                                                idx < currentStepIndex ? 'w-full' : 'w-0'
                                            }`} 
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
